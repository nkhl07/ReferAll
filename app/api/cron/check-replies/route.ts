import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkForReply, sendEmail } from "@/lib/services/email";
import { getAvailableSlots } from "@/lib/services/calendar";
import { addDays } from "date-fns";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sentEmails = await prisma.email.findMany({
    where: {
      sentAt: { not: null },
      repliedAt: null,
    },
    include: { contact: true },
    take: 100,
  });

  const detected: string[] = [];

  for (const email of sentEmails) {
    if (!email.contact?.email || !email.sentAt) continue;

    try {
      const hasReply = await checkForReply(email.userId, email.contact.email, email.sentAt);
      if (!hasReply) continue;

      await prisma.email.update({
        where: { id: email.id },
        data: { repliedAt: new Date() },
      });

      await prisma.contact.updateMany({
        where: { id: email.contact.id, userId: email.userId },
        data: { status: "replied" },
      });

      const slots = await getAvailableSlots(email.userId);
      if (slots.length > 0) {
        const slotList = slots.map((s, i) => `${i + 1}. ${s}`).join("\n");
        const inviteBody = [
          `Hi ${email.contact.name},`,
          ``,
          `Thanks so much for getting back to me! I'd love to find a time to connect.`,
          ``,
          `Here are a few times that work for me:`,
          ``,
          slotList,
          ``,
          `Feel free to pick whichever works best, or suggest another time if none of these work for you.`,
          ``,
          `Looking forward to chatting!`,
        ].join("\n");

        await sendEmail(
          email.userId,
          email.contact.email,
          `Re: ${email.subject}`,
          inviteBody
        );

        await prisma.meeting.create({
          data: {
            userId: email.userId,
            contactId: email.contact.id,
            title: `Coffee Chat with ${email.contact.name}`,
            dateTime: addDays(new Date(), 7),
            status: "pending",
          },
        });
      }

      detected.push(email.id);
    } catch (e) {
      console.error("Failed to process reply check for email", email.id, e);
    }
  }

  return NextResponse.json({ detected, count: detected.length });
}
