import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query } = await req.json();
  if (!query || query.length < 2) return NextResponse.json({ companies: [] });

  const response = await fetch("https://api.apollo.io/api/v1/mixed_companies/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "x-api-key": process.env.APOLLO_API_KEY!,
    },
    body: JSON.stringify({ q_organization_name: query, per_page: 8, page: 1 }),
  });

  if (!response.ok) {
    return NextResponse.json({ companies: [] });
  }

  const data = await response.json();
  const companies = (data.organizations ?? []).map((org: Record<string, unknown>) => ({
    apolloId: org.id,
    name: org.name,
    domain: org.primary_domain,
    industry: org.industry ?? null,
    employeeCount: org.estimated_num_employees ?? null,
    logoUrl: org.logo_url ?? null,
    linkedinUrl: org.linkedin_url ?? null,
    city: org.city ?? null,
    state: org.state ?? null,
  }));

  return NextResponse.json({ companies });
}
