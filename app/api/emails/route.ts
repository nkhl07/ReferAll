import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const emails = await prisma.email.findMany({
    where: { userId: session.user.id },
    include: { contact: true, followUps: true },
    orderBy: { sentAt: "desc" },
  });

  return NextResponse.json(emails);
}
