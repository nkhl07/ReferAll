import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Topbar from "@/components/Topbar";
import CampaignForm from "@/components/campaigns/CampaignForm";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!campaign) notFound();

  if (campaign.status !== "DRAFT" && campaign.status !== "PAUSED") {
    redirect(`/dashboard/campaigns/${id}`);
  }

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Edit Campaign" />
      <main className="flex-1 px-6 py-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <h2
            className="text-lg font-semibold text-[var(--text-primary)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Edit Campaign
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Update your campaign settings. Changes take effect immediately.
          </p>
        </div>
        <CampaignForm campaignId={id} initialData={campaign} />
      </main>
    </div>
  );
}
