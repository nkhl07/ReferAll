import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TEMPLATE_INSTRUCTIONS: Record<string, string> = {
  coffee_chat:
    "Write a concise, personalized coffee chat request email (under 150 words). Goal: secure a 20-minute call. Be warm, specific, and direct.",
  referral:
    "Write a respectful referral request email (under 180 words). The sender is applying for a role and hopes the recipient can refer them or provide advice. Be professional and grateful.",
  follow_up:
    "Write a short, polite follow-up email (under 80 words). Reference the previous outreach. Keep it light and easy to respond to.",
  thank_you:
    "Write a genuine, brief thank you email (under 100 words) after a coffee chat or meeting. Mention one specific insight or takeaway.",
  custom:
    "Write a personalized outreach email based on the context provided.",
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipient, recipientDetails, template, tone, availableSlots, userContext } = await req.json();

  const templateInstruction = TEMPLATE_INSTRUCTIONS[template] ?? TEMPLATE_INSTRUCTIONS.custom;

  let sharedExpList: string[] = [];
  try {
    sharedExpList = JSON.parse(recipientDetails?.sharedExperiences ?? "[]");
  } catch {}

  const slotsText =
    availableSlots?.length > 0
      ? `\nThe sender's available time slots are: ${availableSlots.join(", ")}. Insert these naturally if it's a coffee chat or meeting request.`
      : "";

  const systemPrompt = `You are an expert email ghostwriter helping college students and job seekers craft highly personalized, concise outreach emails for networking, coffee chats, and referral requests.

Your output must be valid JSON with exactly two keys: "subject" (string) and "body" (string).
The body should use plain text only — no markdown, no bullet points, no asterisks.
Keep the tone: ${tone}.
${templateInstruction}${slotsText}

Rules:
- Be specific and genuine. Never generic.
- Highlight any shared experiences prominently but naturally.
- Do NOT use hollow openers like "I hope this email finds you well."
- End with a clear, low-friction ask.
- The subject line should be concise and specific (under 60 characters).`;

  const userPrompt = `Sender info:
Name: ${userContext?.name ?? "Alex"}
Bio: ${userContext?.bio ?? ""}
Resume summary: ${userContext?.resume?.slice(0, 500) ?? ""}
Target roles: ${userContext?.targetRoles ?? ""}

Recipient info:
Name: ${recipient.name}
Email: ${recipient.email ?? ""}
Company: ${recipient.company ?? ""}
Role: ${recipient.role ?? ""}
Sector: ${recipientDetails?.sector ?? ""}
What they work on: ${recipientDetails?.workDescription ?? ""}
Background: ${recipientDetails?.linkedinSummary ?? ""}
Shared experiences: ${sharedExpList.join(", ") || "none identified"}

Template: ${template}`;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to generate email" }, { status: 500 });
  }
}
