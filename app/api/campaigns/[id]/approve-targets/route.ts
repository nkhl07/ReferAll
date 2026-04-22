import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const BodySchema = z.object({
  targetIds: z.array(z.string()).min(1),
  action: z.enum(["approve", "reject"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }

  const { targetIds, action } = parsed.data;
  const newStatus = action === "approve" ? "APPROVED" : "SKIPPED";

  // Only update DISCOVERED targets that belong to this campaign
  const result = await prisma.campaignTarget.updateMany({
    where: {
      id: { in: targetIds },
      campaignId: id,
      status: "DISCOVERED",
    },
    data: { status: newStatus },
  });

  await prisma.agentLog.create({
    data: {
      campaignId: id,
      action: action === "approve" ? "BULK_APPROVED" : "BULK_REJECTED",
      reasoning: `User ${action}d ${result.count} target(s) in bulk. Requested: ${targetIds.length}, updated: ${result.count}.`,
      input: { targetIds, action },
      output: { updated: result.count, newStatus },
    },
  });

  return NextResponse.json({ updated: result.count, newStatus });
}
