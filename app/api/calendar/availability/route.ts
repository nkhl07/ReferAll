import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAvailableSlots } from "@/lib/services/calendar";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ slots: [] });

  const slots = await getAvailableSlots(session.user.id);
  return NextResponse.json({ slots });
}
