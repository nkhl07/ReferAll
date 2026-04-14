import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMeetingLink } from "@/lib/services/meetings";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meetings = await prisma.meeting.findMany({
    where: { userId: session.user.id },
    include: { contact: true },
    orderBy: { dateTime: "asc" },
  });

  return NextResponse.json(meetings);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { contactId, title, dateTime, notes } = body;

  const startTime = new Date(dateTime).toISOString();
  const endTime = new Date(new Date(dateTime).getTime() + 30 * 60 * 1000).toISOString();

  const meetingResult = await createMeetingLink(session.user.id, title, startTime, endTime);

  const meeting = await prisma.meeting.create({
    data: {
      userId: session.user.id,
      contactId,
      title,
      dateTime: new Date(dateTime),
      notes,
      meetingLink: meetingResult?.link,
      meetingProvider: meetingResult?.provider,
      status: "scheduled",
    },
    include: { contact: true },
  });

  await prisma.contact.updateMany({
    where: { id: contactId, userId: session.user.id },
    data: { status: "meeting_scheduled" },
  });

  return NextResponse.json(meeting, { status: 201 });
}
