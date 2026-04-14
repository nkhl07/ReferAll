import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeContact(contactId: string, userId: string): Promise<void> {
  const [contact, user] = await Promise.all([
    prisma.contact.findUnique({ where: { id: contactId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        bio: true,
        resume: true,
        targetCompanies: true,
        targetRoles: true,
        targetSectors: true,
      },
    }),
  ]);

  if (!contact || !user) return;

  const userPrompt = `
User background:
Bio: ${user.bio ?? ""}
Resume: ${user.resume?.slice(0, 800) ?? ""}
Target companies: ${user.targetCompanies ?? ""}
Target roles: ${user.targetRoles ?? ""}
Target sectors: ${user.targetSectors ?? ""}

Contact profile:
Name: ${contact.name}
Company: ${contact.company ?? ""}
Role: ${contact.role ?? ""}
Sector: ${contact.sector ?? ""}
Headline: ${contact.linkedinSummary ?? ""}
Work background: ${contact.workDescription ?? ""}
Location: ${contact.location ?? ""}

Return JSON with exactly these keys:
- sharedExperiences: string[] (list specific shared things — same school, overlapping companies, mutual industries, shared skills based on resume vs contact info. Empty array if none.)
- fitScore: number 0-100 (how valuable is this contact for the user's stated target roles/sectors/companies — 90+ if they work at a target company, 70+ if same sector, 50 baseline)
- talkingPoints: string[] (exactly 2 specific conversation starters based on their background)
- summary: string (1 sentence: who they are and why they are a valuable connection)
`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 512,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert networking analyst. Analyze a contact's profile against a user's background and return structured JSON. Be specific and concrete.",
        },
        { role: "user", content: userPrompt },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    const analysis = JSON.parse(text);

    const fitScore = Math.min(100, Math.max(0, Number(analysis.fitScore) || 0));
    const sharedExperiences = Array.isArray(analysis.sharedExperiences)
      ? JSON.stringify(analysis.sharedExperiences)
      : null;

    // Build an enhanced work description with talking points if we have them
    const talkingPoints: string[] = Array.isArray(analysis.talkingPoints)
      ? analysis.talkingPoints
      : [];
    const enhancedWorkDesc = talkingPoints.length
      ? `${contact.workDescription ?? ""}\n\nConversation starters:\n${talkingPoints.map((t) => `• ${t}`).join("\n")}`.trim()
      : contact.workDescription;

    await prisma.contact.update({
      where: { id: contactId },
      data: {
        sharedExperiences,
        fitScore,
        workDescription: enhancedWorkDesc ?? contact.workDescription,
        linkedinSummary: analysis.summary ?? contact.linkedinSummary,
      },
    });
  } catch (err) {
    console.error("Contact analysis failed:", err);
  }
}
