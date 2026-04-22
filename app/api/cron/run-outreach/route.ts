import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/services/email";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeCampaigns = await prisma.campaign.findMany({
    where: { status: "ACTIVE" },
  });

  let totalSent = 0;
  let totalSkipped = 0;

  for (const campaign of activeCampaigns) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sentToday = await prisma.campaignTarget.count({
      where: {
        campaignId: campaign.id,
        status: "CONTACTED",
        scheduledFor: { gte: today },
      },
    });

    const remaining = campaign.maxOutreachPerDay - sentToday;
    if (remaining <= 0) {
      await prisma.agentLog.create({
        data: {
          campaignId: campaign.id,
          action: "OUTREACH_SKIPPED",
          reasoning: `Daily outreach cap of ${campaign.maxOutreachPerDay} reached (${sentToday} sent today).`,
          input: { date: today.toISOString() },
          output: { sentToday, cap: campaign.maxOutreachPerDay },
        },
      });
      continue;
    }

    // SUPERVISED: only send to targets the user explicitly approved
    // AUTONOMOUS: auto-send to all discovered (already enriched + drafted) targets
    const statusFilter = campaign.approvalMode === "SUPERVISED" ? "APPROVED" : "DISCOVERED";

    const targets = await prisma.campaignTarget.findMany({
      where: {
        campaignId: campaign.id,
        status: statusFilter,
        // Only pick targets that have a pre-generated email draft
        reasoningLog: { not: null },
        email: { not: null },
      },
      take: remaining,
      orderBy: { createdAt: "asc" },
    });

    for (const target of targets) {
      // Parse the final email draft generated at discovery time
      let subject: string;
      let body: string;
      try {
        const draft = JSON.parse(target.reasoningLog!) as { subject?: string; body?: string };
        subject = draft.subject ?? "";
        body = draft.body ?? "";
        if (!subject || !body) throw new Error("Empty draft");
      } catch {
        totalSkipped++;
        await prisma.agentLog.create({
          data: {
            campaignId: campaign.id,
            targetId: target.id,
            action: "OUTREACH_SKIPPED",
            reasoning: `Target ${target.fullName} has a malformed or missing email draft in reasoningLog.`,
            output: { reason: "bad_draft" },
          },
        });
        continue;
      }

      let emailId: string | null = null;
      try {
        const { gmailThreadId } = await sendEmail(campaign.userId, target.email!, subject, body);
        const emailRecord = await prisma.email.create({
          data: {
            userId: campaign.userId,
            contactId: target.contactId ?? null,
            subject,
            body,
            template: "campaign",
            gmailThreadId: gmailThreadId ?? null,
            sentAt: new Date(),
          },
        });
        emailId = emailRecord.id;
      } catch (err) {
        console.error(`Send failed for target ${target.id}:`, err);
        // Advance status anyway — avoids infinite retry on a bad address
      }

      await prisma.campaignTarget.update({
        where: { id: target.id },
        data: {
          status: "CONTACTED",
          scheduledFor: new Date(),
          selectedChannel: campaign.preferredChannel,
        },
      });

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { totalContacted: { increment: 1 } },
      });

      await prisma.agentLog.create({
        data: {
          campaignId: campaign.id,
          targetId: target.id,
          action: "OUTREACH_SENT",
          reasoning: `Sent pre-drafted outreach email to ${target.fullName} (${target.title ?? "unknown role"} at ${target.company ?? "unknown"}).`,
          input: { subject, recipientEmail: target.email },
          output: { emailId },
        },
      });

      totalSent++;
    }
  }

  return NextResponse.json({
    campaignsScanned: activeCampaigns.length,
    totalSent,
    totalSkipped,
  });
}
