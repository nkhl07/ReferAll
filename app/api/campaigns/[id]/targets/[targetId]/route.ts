import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PatchSchema = z.object({
  status: z.enum(["APPROVED", "SKIPPED"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; targetId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, targetId } = await params;

  // Verify the campaign belongs to this user before touching any target
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const target = await prisma.campaignTarget.findFirst({
    where: { id: targetId, campaignId: id },
  });
  if (!target) return NextResponse.json({ error: "Target not found" }, { status: 404 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "status must be APPROVED or SKIPPED" }, { status: 400 });
  }

  const updated = await prisma.campaignTarget.update({
    where: { id: targetId },
    data: { status: parsed.data.status },
  });

  return NextResponse.json(updated);
}
