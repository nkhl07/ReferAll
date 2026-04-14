import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Topbar from "@/components/Topbar";
import PeopleFinder from "@/components/find/PeopleFinder";

export default async function FindPeoplePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const creditsToday = await prisma.apolloLookup.count({
    where: { userId: session.user.id, creditUsed: true, createdAt: { gte: today } },
  });

  const apolloConfigured = !!process.env.APOLLO_API_KEY;

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Find People" />
      <main className="flex-1 px-6 py-6 max-w-6xl mx-auto w-full">
        <PeopleFinder creditsToday={creditsToday} apolloConfigured={apolloConfigured} />
      </main>
    </div>
  );
}
