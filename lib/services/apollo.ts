class ApolloRateLimitError extends Error {}
class ApolloServerError extends Error {}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: Error = new Error("Unknown error");
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      const isRetryable = err instanceof ApolloRateLimitError || err instanceof ApolloServerError;
      if (!isRetryable || attempt === maxAttempts - 1) throw err;
      await new Promise((res) => setTimeout(res, Math.pow(2, attempt) * 1000));
    }
  }
  throw lastError;
}

export interface ApolloSearchCriteria {
  titles: string[];
  companies: string[];
  seniorities: string[];
  industry?: string;
  perPage?: number;
  page?: number;
}

export interface ApolloPersonResult {
  apolloId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  title: string | null;
  company: string | null;
  companyDomain: string | null;
  linkedinUrl: string | null;
  seniority: string | null;
}

type ApolloRawOrg = {
  name?: string;
  primary_domain?: string;
  industry?: string;
};

type ApolloRawPerson = {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  linkedin_url?: string;
  seniority?: string;
  organization?: ApolloRawOrg;
};

export async function apolloSearch(criteria: ApolloSearchCriteria): Promise<ApolloPersonResult[]> {
  return withRetry(async () => {
    const params = new URLSearchParams();
    criteria.titles.forEach((t) => params.append("person_titles[]", t));
    criteria.companies.forEach((c) => params.append("q_organization_domains_list[]", c));
    criteria.seniorities.forEach((s) => params.append("person_seniorities[]", s));
    if (criteria.industry) params.append("q_keywords", criteria.industry);
    // Only fetch people with verified or likely-to-engage emails to reduce wasted enrichments
    params.append("contact_email_status[]", "verified");
    params.append("contact_email_status[]", "likely to engage");
    params.append("per_page", String(criteria.perPage ?? 25));
    params.append("page", String(criteria.page ?? 1));

    const res = await fetch(
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

    if (res.status === 429) throw new ApolloRateLimitError("Apollo rate limit hit");
    if (res.status >= 500) throw new ApolloServerError(`Apollo server error: ${res.status}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `Apollo search failed: ${(err as Record<string, string>).message ?? res.statusText}`
      );
    }

    const data = await res.json();
    return (data.people ?? []).map((p: ApolloRawPerson) => ({
      apolloId: p.id,
      fullName: p.name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
      firstName: p.first_name ?? "",
      lastName: p.last_name ?? "",
      title: p.title ?? null,
      company: p.organization?.name ?? null,
      companyDomain: p.organization?.primary_domain ?? null,
      linkedinUrl: p.linkedin_url ?? null,
      seniority: p.seniority ?? null,
    }));
  });
}

export interface ApolloEnrichResult {
  apolloId: string;
  email: string | null;
  emailStatus: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  title: string | null;
  company: string | null;
  sector: string | null;
  linkedinUrl: string | null;
  linkedinSummary: string | null;
  location: string | null;
  workDescription: string | null;
}

type ApolloJob = {
  title?: string;
  organization_name?: string;
  start_date?: string;
  end_date?: string;
  current?: boolean;
};

export async function apolloEnrich(
  apolloId: string,
  firstName: string,
  lastName: string,
  companyDomain: string | null,
  linkedinUrl: string | null
): Promise<ApolloEnrichResult> {
  return withRetry(async () => {
    const res = await fetch("https://api.apollo.io/api/v1/people/match", {
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

    if (res.status === 429) throw new ApolloRateLimitError("Apollo rate limit hit");
    if (res.status >= 500) throw new ApolloServerError(`Apollo server error: ${res.status}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `Apollo enrich failed: ${(err as Record<string, string>).message ?? res.statusText}`
      );
    }

    const data = await res.json();
    const person = data.person;
    if (!person) throw new Error("Person not found in Apollo");

    const jobs: ApolloJob[] = person.employment_history ?? [];
    const workDescription = jobs
      .slice(0, 3)
      .map((j) => {
        const period = j.current ? "Present" : (j.end_date?.slice(0, 4) ?? "");
        const start = j.start_date?.slice(0, 4) ?? "";
        return `${j.title ?? ""}${j.organization_name ? ` at ${j.organization_name}` : ""}${start ? ` (${start}–${period})` : ""}`;
      })
      .join("\n");

    const location = [person.city, person.state, person.country].filter(Boolean).join(", ");

    return {
      apolloId: person.id,
      email: person.email ?? null,
      emailStatus: person.email_status ?? null,
      firstName: person.first_name ?? firstName,
      lastName: person.last_name ?? lastName,
      fullName:
        person.name ?? `${person.first_name ?? firstName} ${person.last_name ?? lastName}`.trim(),
      title: person.title ?? null,
      company: person.organization?.name ?? null,
      sector: person.organization?.industry ?? null,
      linkedinUrl: person.linkedin_url ?? linkedinUrl,
      linkedinSummary: person.headline ?? null,
      location: location || null,
      workDescription: workDescription || null,
    };
  });
}
