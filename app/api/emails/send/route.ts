import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/services/email";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contactId, recipientEmail, subject, body, template } = await req.json();

  if (!recipientEmail) {
    return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
  }

  let gmailThreadId: string | null = null;
  try {
    const result = await sendEmail(session.user.id, recipientEmail, subject, body);
    gmailThreadId = result.gmailThreadId ?? null;
  } catch (err) {
    console.error("Email send failed:", err);
  }

  const emailRecord = await prisma.email.create({
    data: {
      userId: session.user.id,
      contactId: contactId ?? null,
      subject,
      body,
      template: template ?? "custom",
      gmailThreadId,
      sentAt: new Date(),
    },
  });

  if (contactId) {
    await prisma.contact.updateMany({
      where: { id: contactId, userId: session.user.id, status: "new" },
      data: { status: "contacted" },
    });
  }

  return NextResponse.json({ id: emailRecord.id, success: true });
}
