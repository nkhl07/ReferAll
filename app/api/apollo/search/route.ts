import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const params = new URLSearchParams();

  if (body.titles?.length) {
    body.titles.forEach((t: string) => params.append("person_titles[]", t));
  }
  if (body.companies?.length) {
    body.companies.forEach((c: string) => params.append("q_organization_domains_list[]", c));
  }
  if (body.locations?.length) {
    body.locations.forEach((l: string) => params.append("person_locations[]", l));
  }
  if (body.seniorities?.length) {
    body.seniorities.forEach((s: string) => params.append("person_seniorities[]", s));
  }
  if (body.keywords) {
    params.append("q_keywords", body.keywords);
  }
  if (body.emailStatus?.length) {
    body.emailStatus.forEach((s: string) => params.append("contact_email_status[]", s));
  }
  if (body.employeeRanges?.length) {
    body.employeeRanges.forEach((r: string) =>
      params.append("organization_num_employees_ranges[]", r)
    );
  }

  params.append("page", String(body.page || 1));
  params.append("per_page", String(body.perPage || 25));

  const response = await fetch(
    `https://api.apollo.io/api/v1/mixed_people/api_search?${params.toString()}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": process.env.APOLLO_API_KEY!,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const msg =
      response.status === 403
        ? "Apollo requires a Master API key. Go to app.apollo.io → Settings → API Keys and create a Master key."
        : `Apollo search failed: ${(error as Record<string, string>).message ?? response.statusText}`;
    return NextResponse.json({ error: msg }, { status: response.status });
  }

  const data = await response.json();

  type ApolloOrg = {
    name?: string;
    primary_domain?: string;
    linkedin_url?: string;
    estimated_num_employees?: number;
    industry?: string;
    keywords?: string[];
  };

  type ApolloPerson = {
    id: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    headline?: string;
    linkedin_url?: string;
    photo_url?: string;
    city?: string;
    state?: string;
    country?: string;
    seniority?: string;
    departments?: string[];
    organization?: ApolloOrg;
  };

  const people = (data.people ?? []).map((person: ApolloPerson) => ({
    apolloId: person.id,
    name: person.name ?? `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim(),
    firstName: person.first_name ?? "",
    lastName: person.last_name ?? "",
    title: person.title ?? null,
    headline: person.headline ?? null,
    linkedinUrl: person.linkedin_url ?? null,
    photoUrl: person.photo_url ?? null,
    city: person.city ?? null,
    state: person.state ?? null,
    country: person.country ?? null,
    company: person.organization?.name ?? null,
    companyDomain: person.organization?.primary_domain ?? null,
    companySize: person.organization?.estimated_num_employees ?? null,
    industry: person.organization?.industry ?? null,
    seniority: person.seniority ?? null,
    departments: person.departments ?? [],
  }));

  const perPage = body.perPage || 25;
  return NextResponse.json({
    people,
    totalEntries: data.total_entries ?? 0,
    page: body.page || 1,
    totalPages: Math.ceil((data.total_entries ?? 0) / perPage),
  });
}
