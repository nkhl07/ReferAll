import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apolloSearch, apolloEnrich } from "@/lib/services/apollo";
import { analyzeContact } from "@/lib/services/analysis";
import OpenAI from "openai";
import type { Contact } from "@prisma/client";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeCampaigns = await prisma.campaign.findMany({
    where: { status: "ACTIVE" },
    include: {
      campaignTargets: { select: { apolloPersonId: true } },
    },
  });

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const campaign of activeCampaigns) {
    const user = await prisma.user.findUnique({
      where: { id: campaign.userId },
      select: { name: true, bio: true, resume: true },
    });
    if (!user) continue;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await prisma.campaignTarget.count({
      where: { campaignId: campaign.id, createdAt: { gte: today } },
    });

    if (todayCount >= campaign.dailyBudgetCredits) {
      await prisma.agentLog.create({
        data: {
          campaignId: campaign.id,
          action: "DISCOVERY_SKIPPED",
          reasoning: `Daily discovery cap of ${campaign.dailyBudgetCredits} reached (${todayCount} already discovered today).`,
          input: { date: today.toISOString() },
          output: { todayCount, cap: campaign.dailyBudgetCredits },
        },
      });
      continue;
    }

    const remaining = campaign.dailyBudgetCredits - todayCount;
    const existingIds = new Set(
      campaign.campaignTargets.map((t) => t.apolloPersonId).filter(Boolean)
    );

    let found = 0;
    let created = 0;
    let skipped = 0;
    let enrichFailed = 0;
    let errorMsg: string | null = null;

    try {
      const people = await apolloSearch({
        titles: campaign.targetRoles,
        companies: campaign.targetCompanies,
        seniorities: campaign.targetSeniority,
        industry: campaign.industry,
        // Request more than budget to account for enrichment failures (no email)
        perPage: Math.min(remaining * 2, 25),
      });

      found = people.length;

      for (const person of people) {
        if (created >= remaining) break;

        if (existingIds.has(person.apolloId)) {
          skipped++;
          continue;
        }

        // ── Enrich: get email + full profile ──────────────────────────────────
        let enriched: Awaited<ReturnType<typeof apolloEnrich>>;
        try {
          const [firstName, ...rest] = person.fullName.split(" ");
          const lastName = rest.join(" ");
          enriched = await apolloEnrich(
            person.apolloId,
            firstName,
            lastName,
            person.companyDomain,
            person.linkedinUrl
          );
        } catch (err) {
          enrichFailed++;
          console.error(`Enrich failed for ${person.fullName}:`, err);
          continue;
        }

        if (!enriched.email) {
          enrichFailed++;
          continue;
        }

        // ── Upsert Contact ────────────────────────────────────────────────────
        const contact = await prisma.contact.upsert({
          where: {
            userId_apolloId: { userId: campaign.userId, apolloId: enriched.apolloId },
          },
          update: {
            email: enriched.email,
            role: enriched.title ?? undefined,
            company: enriched.company ?? undefined,
            sector: enriched.sector ?? undefined,
            linkedinUrl: enriched.linkedinUrl ?? undefined,
            linkedinSummary: enriched.linkedinSummary ?? undefined,
            location: enriched.location ?? undefined,
            workDescription: enriched.workDescription ?? undefined,
          },
          create: {
            userId: campaign.userId,
            apolloId: enriched.apolloId,
            name: enriched.fullName,
            email: enriched.email,
            role: enriched.title,
            company: enriched.company,
            sector: enriched.sector,
            linkedinUrl: enriched.linkedinUrl,
            linkedinSummary: enriched.linkedinSummary,
            location: enriched.location,
            workDescription: enriched.workDescription,
            status: "new",
          },
        });

        // Track Apollo credit spend (one enrichment = one credit)
        await prisma.apolloLookup.create({
          data: {
            userId: campaign.userId,
            apolloId: enriched.apolloId,
            contactId: contact.id,
            creditUsed: true,
          },
        });

        // ── AI analysis: fitScore, sharedExperiences, talking points ─────────
        await analyzeContact(contact.id, campaign.userId);
        const analyzed = await prisma.contact.findUnique({ where: { id: contact.id } });
        const enrichedContact: Contact = analyzed ?? contact;

        // ── Generate the final outreach email ─────────────────────────────────
        let draftSubject = "";
        let draftBody = "";
        let tokensUsed = 0;
        try {
          const draft = await generateDraftEmail(
            user,
            enrichedContact,
            campaign.goal,
            campaign.industry
          );
          draftSubject = draft.subject;
          draftBody = draft.body;
          tokensUsed = draft.tokensUsed;
        } catch (err) {
          console.error(`Email draft generation failed for ${person.fullName}:`, err);
          // Still create the target — outreach cron will skip if reasoningLog is missing
        }

        // ── Create CampaignTarget ─────────────────────────────────────────────
        await prisma.campaignTarget.create({
          data: {
            campaignId: campaign.id,
            apolloPersonId: enriched.apolloId,
            contactId: contact.id,
            fullName: enriched.fullName,
            title: enriched.title,
            company: enriched.company,
            email: enriched.email,
            linkedinUrl: enriched.linkedinUrl,
            relevanceScore: enrichedContact.fitScore ? enrichedContact.fitScore / 100 : null,
            // Store the final email as JSON so the approval UI and outreach cron both read it
            reasoningLog: draftSubject
              ? JSON.stringify({ subject: draftSubject, body: draftBody })
              : null,
            // SUPERVISED → DISCOVERED (awaits human approval)
            // AUTONOMOUS → DISCOVERED (outreach cron auto-picks up)
            status: "DISCOVERED",
          },
        });

        await prisma.agentLog.create({
          data: {
            campaignId: campaign.id,
            action: "TARGET_DISCOVERED",
            reasoning: `Enriched and drafted outreach for ${enriched.fullName} (${enriched.title ?? "unknown role"} at ${enriched.company ?? "unknown company"}). Fit score: ${enrichedContact.fitScore ?? "N/A"}/100.`,
            input: { apolloId: enriched.apolloId, email: enriched.email },
            output: { contactId: contact.id, fitScore: enrichedContact.fitScore, tokensUsed },
            tokensUsed,
            model: "gpt-4o-mini",
          },
        });

        existingIds.add(enriched.apolloId);
        created++;
      }
    } catch (err) {
      errorMsg = (err as Error).message;
      console.error(`Discovery failed for campaign ${campaign.id}:`, err);
    }

    await prisma.agentLog.create({
      data: {
        campaignId: campaign.id,
        action: "DISCOVERY_RUN",
        reasoning: errorMsg
          ? `Discovery failed: ${errorMsg}`
          : `Apollo returned ${found} candidates. Created ${created} new targets (${enrichFailed} had no email), skipped ${skipped} duplicates.`,
        input: {
          titles: campaign.targetRoles,
          companies: campaign.targetCompanies,
          seniorities: campaign.targetSeniority,
          industry: campaign.industry,
          budgetUsed: todayCount,
          budgetCap: campaign.dailyBudgetCredits,
          approvalMode: campaign.approvalMode,
        },
        output: errorMsg ? { error: errorMsg } : { found, created, skipped, enrichFailed },
      },
    });

    totalCreated += created;
    totalSkipped += skipped;
  }

  return NextResponse.json({
    campaignsScanned: activeCampaigns.length,
    totalCreated,
    totalSkipped,
  });
}

async function generateDraftEmail(
  user: { name: string | null; bio: string | null; resume: string | null },
  contact: Contact,
  campaignGoal: string,
  industry: string
): Promise<{ subject: string; body: string; tokensUsed: number }> {
  let sharedList = "";
  if (contact.sharedExperiences) {
    try {
      const arr = JSON.parse(contact.sharedExperiences) as string[];
      if (arr.length) sharedList = arr.join("; ");
    } catch {
      sharedList = contact.sharedExperiences;
    }
  }

  const prompt = `You are writing a short, warm cold outreach email on behalf of a job seeker.

Sender:
Name: ${user.name ?? "the sender"}
Background: ${user.bio ?? ""}
Resume (excerpt): ${user.resume?.slice(0, 500) ?? ""}

Recipient:
Name: ${contact.name}
Title: ${contact.role ?? ""} at ${contact.company ?? ""}
Profile: ${contact.linkedinSummary ?? ""}
Work background: ${contact.workDescription?.slice(0, 400) ?? ""}
${sharedList ? `Shared experiences with sender: ${sharedList}` : ""}

Campaign goal: ${campaignGoal}
Industry focus: ${industry}

Rules:
1. Open with a specific, genuine observation about the recipient — NOT generic flattery
2. If shared experiences exist, weave in one naturally (don't list them all)
3. State clearly the sender wants a 20-minute coffee chat about the recipient's journey in ${industry}
4. End with a single low-pressure CTA (e.g., "Would you be open to a quick call next week?")
5. Body must be under 100 words — brevity is a feature, not a bug

Return valid JSON only: { "subject": "...", "body": "..." }`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 400,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an expert at writing warm, personalised cold outreach emails. Always return valid JSON with 'subject' and 'body' keys.",
      },
      { role: "user", content: prompt },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  const result = JSON.parse(text) as { subject?: string; body?: string };

  return {
    subject: result.subject ?? "Quick coffee chat request",
    body: result.body ?? "",
    tokensUsed: response.usage?.total_tokens ?? 0,
  };
}
