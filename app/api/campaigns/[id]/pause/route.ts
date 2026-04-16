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
  if (existing.status !== "ACTIVE") {
    return NextResponse.json({ error: "Can only pause ACTIVE campaigns" }, { status: 400 });
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: { status: "PAUSED", pausedAt: new Date() },
  });

  return NextResponse.json(updated);
}
