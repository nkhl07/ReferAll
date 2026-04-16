import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  goal: z.string().min(1).optional(),
  industry: z.string().min(1).optional(),
  targetCompanies: z.array(z.string()).min(1).optional(),
  targetRoles: z.array(z.string()).min(1).optional(),
  targetSeniority: z.array(z.string()).optional(),
  preferAlumni: z.boolean().optional(),
  preferredChannel: z.string().optional(),
  maxOutreachPerDay: z.number().int().min(1).max(20).optional(),
  followUpAfterDays: z.number().int().min(1).max(14).optional(),
  maxFollowUps: z.number().int().min(0).max(5).optional(),
  dailyBudgetCredits: z.number().int().optional(),
  approvalMode: z.enum(["SUPERVISED", "AUTONOMOUS"]).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    include: {
      campaignTargets: { orderBy: { createdAt: "asc" } },
      agentLogs: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    select: { status: true },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "DRAFT" && existing.status !== "PAUSED") {
    return NextResponse.json({ error: "Can only edit DRAFT or PAUSED campaigns" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    select: { status: true },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "DRAFT" && existing.status !== "PAUSED") {
    return NextResponse.json({ error: "Can only delete DRAFT or PAUSED campaigns" }, { status: 400 });
  }

  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
