import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/services/email";
import OpenAI from "openai";
import { addDays } from "date-fns";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const twoWeeksAgo = addDays(new Date(), -14);
  const fourWeeksAgo = addDays(new Date(), -28);

  const emailsNeedingFollowUp1 = await prisma.email.findMany({
    where: {
      sentAt: { lte: twoWeeksAgo },
      repliedAt: null,
      followUps: { none: {} },
    },
    include: { contact: true },
    take: 50,
  });

  const emailsNeedingFollowUp2 = await prisma.email.findMany({
    where: {
      sentAt: { lte: fourWeeksAgo },
      repliedAt: null,
      followUps: {
        some: { followUpNumber: 1, status: "sent" },
        none: { followUpNumber: 2 },
      },
    },
    include: { contact: true },
    take: 50,
  });

  const created: string[] = [];

  for (const email of emailsNeedingFollowUp1) {
    if (!email.contact) continue;
    try {
      const body = await generateFollowUpBody(email.body, email.contact.name, 1);
      const followUp = await prisma.followUp.create({
        data: {
          emailId: email.id,
          followUpNumber: 1,
          status: "pending",
          scheduledDate: new Date(),
          body,
        },
      });

      if (email.contact?.email) {
        await sendEmail(email.userId, email.contact.email, `Re: ${email.subject}`, body);
        await prisma.followUp.update({
          where: { id: followUp.id },
          data: { status: "sent", sentAt: new Date() },
        });
      }

      created.push(`FU1:${email.id}`);
    } catch (e) {
      console.error("Failed to create follow-up 1 for", email.id, e);
    }
  }

  for (const email of emailsNeedingFollowUp2) {
    if (!email.contact) continue;
    try {
      const body = await generateFollowUpBody(email.body, email.contact.name, 2);
      const followUp = await prisma.followUp.create({
        data: {
          emailId: email.id,
          followUpNumber: 2,
          status: "pending",
          scheduledDate: new Date(),
          body,
        },
      });

      if (email.contact?.email) {
        await sendEmail(email.userId, email.contact.email, `Re: ${email.subject}`, body);
        await prisma.followUp.update({
          where: { id: followUp.id },
          data: { status: "sent", sentAt: new Date() },
        });
      }

      created.push(`FU2:${email.id}`);
    } catch (e) {
      console.error("Failed to create follow-up 2 for", email.id, e);
    }
  }

  return NextResponse.json({ created, count: created.length });
}

async function generateFollowUpBody(
  originalEmail: string,
  recipientName: string,
  followUpNumber: number
): Promise<string> {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Write a short, friendly follow-up email (under 80 words) for ${recipientName}.
This is follow-up #${followUpNumber}.
Original email context: "${originalEmail.slice(0, 400)}"
${followUpNumber === 2 ? "This is the final follow-up. Keep it brief and make it easy to decline gracefully." : "Keep it light and easy to reply to."}
Return ONLY the email body text, no subject line.`,
      },
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}
