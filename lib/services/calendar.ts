import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { getValidAccessToken } from "@/lib/auth/refresh-token";
import { format, addDays, setHours, setMinutes, isWeekend, addHours } from "date-fns";

async function getCalendarProvider(
  userId: string
): Promise<{ provider: string; accessToken: string } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailProvider: true },
  });

  const provider = user?.emailProvider ?? "google";

  try {
    const accessToken = await getValidAccessToken(userId, provider);
    return { provider, accessToken };
  } catch {
    return null;
  }
}

export async function getAvailableSlots(userId: string): Promise<string[]> {
  const calProvider = await getCalendarProvider(userId);

  if (!calProvider) return getMockSlots();

  try {
    if (calProvider.provider === "google") {
      return getGoogleAvailability(calProvider.accessToken);
    } else if (calProvider.provider === "microsoft-entra-id") {
      return getOutlookAvailability(calProvider.accessToken);
    }
  } catch (err) {
    console.error("Calendar availability error:", err);
  }

  return getMockSlots();
}

async function getGoogleAvailability(accessToken: string): Promise<string[]> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const now = new Date();
  const twoWeeksLater = addDays(now, 14);

  const freeBusyRes = await calendar.freebusy.query({
    requestBody: {
      timeMin: now.toISOString(),
      timeMax: twoWeeksLater.toISOString(),
      timeZone: "America/New_York",
      items: [{ id: "primary" }],
    },
  });

  const busy = freeBusyRes.data.calendars?.primary?.busy ?? [];
  return computeFreeSlots(
    busy.map((b) => ({ start: new Date(b.start!), end: new Date(b.end!) })),
    now,
    twoWeeksLater
  );
}

async function getOutlookAvailability(accessToken: string): Promise<string[]> {
  const now = new Date();
  const twoWeeksLater = addDays(now, 14);

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${now.toISOString()}&endDateTime=${twoWeeksLater.toISOString()}&$select=subject,start,end,showAs&$orderby=start/dateTime`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) return getMockSlots();

  const data = await response.json();
  const busySlots = (data.value ?? [])
    .filter((e: { showAs: string }) => e.showAs !== "free")
    .map((e: { start: { dateTime: string }; end: { dateTime: string } }) => {
      const startStr = e.start.dateTime.endsWith("Z") ? e.start.dateTime : e.start.dateTime + "Z";
      const endStr = e.end.dateTime.endsWith("Z") ? e.end.dateTime : e.end.dateTime + "Z";
      return { start: new Date(startStr), end: new Date(endStr) };
    });

  return computeFreeSlots(busySlots, now, twoWeeksLater);
}

function computeFreeSlots(
  busy: { start: Date; end: Date }[],
  from: Date,
  until: Date
): string[] {
  const freeSlots: string[] = [];
  let date = addDays(from, 1);

  while (freeSlots.length < 3 && date < until) {
    if (!isWeekend(date)) {
      for (let hour = 9; hour <= 17 && freeSlots.length < 3; hour++) {
        const slotStart = setMinutes(setHours(date, hour), 0);
        const slotEnd = addHours(slotStart, 1);

        const isConflict = busy.some((b) => slotStart < b.end && slotEnd > b.start);

        if (!isConflict) {
          freeSlots.push(
            `${format(slotStart, "EEEE, MMMM d")} from ${format(slotStart, "h:mm a")} to ${format(slotEnd, "h:mm a")} ET`
          );
        }
      }
    }
    date = addDays(date, 1);
  }

  return freeSlots;
}

function getMockSlots(): string[] {
  const now = new Date();
  const slots: string[] = [];
  let date = addDays(now, 1);

  while (slots.length < 3) {
    if (!isWeekend(date)) {
      const hours = [10, 14, 16];
      const h = hours[slots.length % hours.length];
      const start = setMinutes(setHours(date, h), 0);
      const end = addHours(start, 1);
      slots.push(
        `${format(start, "EEEE, MMMM d")} from ${format(start, "h:mm a")} to ${format(end, "h:mm a")} ET`
      );
    }
    date = addDays(date, 1);
  }

  return slots;
}
