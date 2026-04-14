import { prisma } from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/auth/refresh-token";

export async function createMeetingLink(
  userId: string,
  title: string,
  startTime: string,
  endTime: string
): Promise<{ link: string; provider: "zoom" | "teams" } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { meetingProvider: true },
  });

  // Try Zoom first if user has it set as meeting provider
  if (user?.meetingProvider === "zoom") {
    const zoomAccount = await prisma.account.findFirst({
      where: { userId, provider: "zoom" },
      select: { access_token: true },
    });

    if (zoomAccount?.access_token) {
      try {
        const link = await createZoomMeeting(zoomAccount.access_token, title, startTime);
        if (link) return { link, provider: "zoom" };
      } catch (err) {
        console.error("Zoom meeting creation failed:", err);
      }
    }
  }

  // Try Teams if the user has a Microsoft account linked
  const msAccount = await prisma.account.findFirst({
    where: { userId, provider: "microsoft-entra-id" },
    select: { id: true },
  });

  if (msAccount) {
    try {
      const accessToken = await getValidAccessToken(userId, "microsoft-entra-id");
      const link = await createTeamsMeeting(accessToken, title, startTime, endTime);
      if (link) return { link, provider: "teams" };
    } catch (err) {
      console.error("Teams meeting creation failed:", err);
    }
  }

  // Fall back to Zoom even if meetingProvider isn't explicitly "zoom"
  if (user?.meetingProvider !== "zoom") {
    const zoomAccount = await prisma.account.findFirst({
      where: { userId, provider: "zoom" },
      select: { access_token: true },
    });

    if (zoomAccount?.access_token) {
      try {
        const link = await createZoomMeeting(zoomAccount.access_token, title, startTime);
        if (link) return { link, provider: "zoom" };
      } catch (err) {
        console.error("Zoom meeting creation failed:", err);
      }
    }
  }

  return null;
}

async function createZoomMeeting(
  accessToken: string,
  title: string,
  startTime: string
): Promise<string | null> {
  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: title,
      type: 2,
      start_time: new Date(startTime).toISOString(),
      duration: 30,
      settings: { join_before_host: true },
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.join_url ?? null;
}

async function createTeamsMeeting(
  accessToken: string,
  title: string,
  startTime: string,
  endTime: string
): Promise<string | null> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me/onlineMeetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: title,
      startDateTime: startTime,
      endDateTime: endTime,
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.joinWebUrl ?? null;
}
