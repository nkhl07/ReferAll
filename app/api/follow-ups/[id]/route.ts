import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { sendEmail } from "@/lib/services/email";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  const followUp = await prisma.followUp.findFirst({
    where: { id },
    include: {
      email: {
        include: { contact: true },
      },
    },
  });

  if (!followUp || followUp.email.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let updateData: Record<string, unknown> = { status };

  if (status === "approved") {
    updateData = { status: "sent", sentAt: new Date() };

    if (followUp.email.contact.email && followUp.body) {
      try {
        await sendEmail(
          session.user.id,
          followUp.email.contact.email,
          `Re: ${followUp.email.subject}`,
          followUp.body
        );
      } catch (err) {
        console.error("Follow-up send error:", err);
      }
    }
  } else if (status === "snoozed") {
    updateData = {
      status: "pending",
      scheduledDate: addDays(new Date(), 3),
    };
  }

  const updated = await prisma.followUp.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}
