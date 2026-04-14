import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Topbar from "@/components/Topbar";
import SettingsForm from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [user, accounts, apolloCreditsToday] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.account.findMany({
      where: { userId: session.user.id },
      select: { provider: true },
    }),
    prisma.apolloLookup.count({
      where: { userId: session.user.id, creditUsed: true, createdAt: { gte: today } },
    }),
  ]);

  if (!user) redirect("/");

  const connectedProviders = accounts.map((a) => a.provider);
  const apolloConfigured = !!process.env.APOLLO_API_KEY;

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Settings" />
      <main className="flex-1 px-6 py-6 max-w-3xl mx-auto w-full space-y-6">
        <SettingsForm
          user={user}
          connectedProviders={connectedProviders}
          apolloConfigured={apolloConfigured}
          apolloCreditsToday={apolloCreditsToday}
        />
      </main>
    </div>
  );
}
