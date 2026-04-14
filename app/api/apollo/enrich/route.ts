import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeContact } from "@/lib/services/analysis";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const body = await req.json();
  const { apolloId, firstName, lastName, companyDomain, linkedinUrl } = body;

  if (!apolloId) {
    return NextResponse.json({ error: "apolloId is required" }, { status: 400 });
  }

  // Return cached result if already enriched (skip credit spend)
  const existing = await prisma.contact.findFirst({
    where: { userId, apolloId },
  });
  if (existing?.email) {
    return NextResponse.json({
      email: existing.email,
      emailStatus: "already_enriched",
      contact: existing,
    });
  }

  // Enforce daily rate limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const enrichmentsToday = await prisma.apolloLookup.count({
    where: { userId, creditUsed: true, createdAt: { gte: today } },
  });
  if (enrichmentsToday >= 50) {
    return NextResponse.json(
      { error: "Daily enrichment limit reached (50/day). Try again tomorrow." },
      { status: 429 }
    );
  }

  // Call Apollo People Match / Enrichment
  const response = await fetch("https://api.apollo.io/api/v1/people/match", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "x-api-key": process.env.APOLLO_API_KEY!,
    },
    body: JSON.stringify({
      id: apolloId,
      first_name: firstName,
      last_name: lastName,
      organization_domain: companyDomain,
      linkedin_url: linkedinUrl,
      reveal_personal_emails: false,
      reveal_phone_number: false,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return NextResponse.json(
      { error: `Apollo enrichment failed: ${(err as Record<string, string>).message ?? response.statusText}` },
      { status: response.status }
    );
  }

  const data = await response.json();
  const person = data.person;
  if (!person) {
    return NextResponse.json({ error: "Person not found in Apollo" }, { status: 404 });
  }

  // Build work description from employment history
  type ApolloJob = {
    title?: string;
    organization_name?: string;
    start_date?: string;
    end_date?: string;
    current?: boolean;
  };
  const jobs: ApolloJob[] = person.employment_history ?? [];
  const workDescription = jobs
    .slice(0, 3)
    .map((j: ApolloJob) => {
      const period = j.current ? "Present" : j.end_date?.slice(0, 4) ?? "";
      const start = j.start_date?.slice(0, 4) ?? "";
      return `${j.title ?? ""}${j.organization_name ? ` at ${j.organization_name}` : ""}${start ? ` (${start}–${period})` : ""}`;
    })
    .join("\n");

  const location = [person.city, person.state, person.country].filter(Boolean).join(", ");

  // Upsert the Contact record
  const contact = await prisma.contact.upsert({
    where: { userId_apolloId: { userId, apolloId: person.id } },
    update: {
      email: person.email ?? existing?.email,
      company: person.organization?.name ?? existing?.company,
      role: person.title ?? existing?.role,
      sector: person.organization?.industry ?? existing?.sector,
      linkedinUrl: person.linkedin_url ?? existing?.linkedinUrl,
      linkedinSummary: person.headline ?? existing?.linkedinSummary,
      location: location || existing?.location,
      workDescription: workDescription || existing?.workDescription,
    },
    create: {
      userId,
      apolloId: person.id,
      name: person.name ?? `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim(),
      email: person.email ?? null,
      company: person.organization?.name ?? null,
      role: person.title ?? null,
      sector: person.organization?.industry ?? null,
      linkedinUrl: person.linkedin_url ?? null,
      linkedinSummary: person.headline ?? null,
      location: location || null,
      workDescription: workDescription || null,
      status: "new",
    },
  });

  // Log credit usage
  await prisma.apolloLookup.create({
    data: { userId, apolloId: person.id, contactId: contact.id, creditUsed: true },
  });

  // Run AI analysis asynchronously (don't block the response)
  analyzeContact(contact.id, userId).catch(console.error);

  return NextResponse.json({
    email: person.email ?? null,
    emailStatus: person.email_status ?? "unknown",
    contact,
  });
}
