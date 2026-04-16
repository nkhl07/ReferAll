import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    select: { status: true },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "DRAFT" && existing.status !== "PAUSED") {
    return NextResponse.json({ error: "Can only activate DRAFT or PAUSED campaigns" }, { status: 400 });
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: { status: "ACTIVE", startedAt: new Date() },
  });

  return NextResponse.json(updated);
}
