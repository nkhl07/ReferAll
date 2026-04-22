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
      const { replied, method } = await checkForReply(email.userId, email.contact.email, email.sentAt, {
        gmailThreadId: email.gmailThreadId,
        originalSubject: email.subject,
      });

      if (!replied) continue;

      await prisma.email.update({
        where: { id: email.id },
        data: { repliedAt: new Date() },
      });

      await prisma.contact.updateMany({
        where: { id: email.contact.id, userId: email.userId },
        data: { status: "replied" },
      });

      // Find the campaign this email belongs to (if any) for AgentLog
      const campaignTarget = email.contact
        ? await prisma.campaignTarget.findFirst({
            where: { contactId: email.contact.id, status: { in: ["CONTACTED", "FOLLOWED_UP"] } },
            select: { id: true, campaignId: true, fullName: true },
            orderBy: { updatedAt: "desc" },
          })
        : null;

      let calendarInviteSent = false;
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

        calendarInviteSent = true;
      }

      // Update campaign target status and metrics if this email is campaign-linked
      if (campaignTarget) {
        await prisma.campaignTarget.update({
          where: { id: campaignTarget.id },
          data: { status: "REPLIED" },
        });

        await prisma.campaign.update({
          where: { id: campaignTarget.campaignId },
          data: { totalReplies: { increment: 1 } },
        });

        await prisma.agentLog.create({
          data: {
            campaignId: campaignTarget.campaignId,
            targetId: campaignTarget.id,
            action: "REPLY_DETECTED",
            reasoning: `Reply detected from ${campaignTarget.fullName} (${email.contact.email}) using method: ${method}. ${calendarInviteSent ? "Calendar invite sent." : "No available slots — invite not sent."}`,
            input: { emailId: email.id, recipientEmail: email.contact.email },
            output: { method, calendarInviteSent, gmailThreadId: email.gmailThreadId ?? null },
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
