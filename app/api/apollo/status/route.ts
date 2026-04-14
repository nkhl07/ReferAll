import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configured = !!process.env.APOLLO_API_KEY;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const creditsToday = await prisma.apolloLookup.count({
    where: { userId: session.user.id, creditUsed: true, createdAt: { gte: today } },
  });

  return NextResponse.json({ configured, creditsToday });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.APOLLO_API_KEY) {
    return NextResponse.json({ connected: false, error: "APOLLO_API_KEY not set" });
  }

  // Ping Apollo with a minimal search to verify the key
  const response = await fetch(
    "https://api.apollo.io/api/v1/mixed_people/api_search?per_page=1&page=1",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": process.env.APOLLO_API_KEY,
      },
    }
  );

  if (response.status === 401 || response.status === 403) {
    return NextResponse.json({ connected: false, error: "Invalid or unauthorized API key" });
  }

  if (!response.ok) {
    return NextResponse.json({ connected: false, error: `Apollo returned ${response.status}` });
  }

  return NextResponse.json({ connected: true });
}
