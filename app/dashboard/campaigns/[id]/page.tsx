import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Topbar from "@/components/Topbar";
import CampaignDetail from "@/components/campaigns/CampaignDetail";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    include: {
      campaignTargets: { orderBy: { createdAt: "asc" } },
      agentLogs: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  if (!campaign) notFound();

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Campaign" />
      <main className="flex-1 px-6 py-6 max-w-5xl mx-auto w-full">
        <CampaignDetail campaign={campaign} />
      </main>
    </div>
  );
}
