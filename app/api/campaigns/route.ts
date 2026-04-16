import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1),
  goal: z.string().min(1),
  industry: z.string().min(1),
  targetCompanies: z.array(z.string()).min(1),
  targetRoles: z.array(z.string()).min(1),
  targetSeniority: z.array(z.string()).default([]),
  preferAlumni: z.boolean().default(true),
  preferredChannel: z.string().default("email"),
  maxOutreachPerDay: z.number().int().min(1).max(20).default(5),
  followUpAfterDays: z.number().int().min(1).max(14).default(3),
  maxFollowUps: z.number().int().min(0).max(5).default(2),
  dailyBudgetCredits: z.number().int().default(10),
  approvalMode: z.enum(["SUPERVISED", "AUTONOMOUS"]).default("SUPERVISED"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaigns = await prisma.campaign.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { campaignTargets: true } },
    },
  });

  return NextResponse.json(campaigns);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  const campaign = await prisma.campaign.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  return NextResponse.json(campaign, { status: 201 });
}
