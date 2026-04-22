import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, approvalMode: true },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const targets = await prisma.campaignTarget.findMany({
    where: { campaignId: id, status: "DISCOVERED" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      fullName: true,
      title: true,
      company: true,
      email: true,
      linkedinUrl: true,
      relevanceScore: true,
      reasoningLog: true,
      createdAt: true,
    },
  });

  // Parse reasoningLog JSON into a typed draft object for the client
  const withDraft = targets.map((t) => {
    let draft: { subject: string; body: string } | null = null;
    if (t.reasoningLog) {
      try {
        draft = JSON.parse(t.reasoningLog) as { subject: string; body: string };
      } catch {
        draft = null;
      }
    }
    return { ...t, draft };
  });

  return NextResponse.json({ targets: withDraft, total: withDraft.length });
}
