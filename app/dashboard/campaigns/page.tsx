import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Topbar from "@/components/Topbar";
import CampaignsList from "@/components/campaigns/CampaignsList";

export default async function CampaignsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const campaigns = await prisma.campaign.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { campaignTargets: true } } },
  });

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Campaigns" />
      <main className="flex-1 px-6 py-6 max-w-5xl mx-auto w-full">
        <CampaignsList campaigns={campaigns} />
      </main>
    </div>
  );
}
