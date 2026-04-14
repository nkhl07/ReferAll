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

  // Save to database
  const emailRecord = await prisma.email.create({
    data: {
      userId: session.user.id,
      contactId: contactId ?? null,
      subject,
      body,
      template: template ?? "custom",
      sentAt: new Date(),
    },
  });

  // Send via the user's active email provider
  try {
    await sendEmail(session.user.id, recipientEmail, subject, body);
  } catch (err) {
    console.error("Email send failed:", err);
    // Email is still saved to DB even if send fails
  }

  // Update contact status
  if (contactId) {
    await prisma.contact.updateMany({
      where: { id: contactId, userId: session.user.id, status: "new" },
      data: { status: "contacted" },
    });
  }

  return NextResponse.json({ id: emailRecord.id, success: true });
}
