import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Topbar from "@/components/Topbar";
import CampaignForm from "@/components/campaigns/CampaignForm";

export default async function NewCampaignPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="New Campaign" />
      <main className="flex-1 px-6 py-6 max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <h2
            className="text-lg font-semibold text-[var(--text-primary)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Create Campaign
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Configure your outreach campaign. You can save as a draft and activate later.
          </p>
        </div>
        <CampaignForm />
      </main>
    </div>
  );
}
