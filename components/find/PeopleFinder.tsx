"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Mail,
  Copy,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  Check,
  AlertCircle,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";

// ─── Constants ────────────────────────────────────────────────────────────────

const SENIORITY_OPTIONS = [
  { value: "intern", label: "Intern" },
  { value: "entry", label: "Entry" },
  { value: "senior", label: "Senior" },
  { value: "manager", label: "Manager" },
  { value: "director", label: "Director" },
  { value: "head", label: "Head" },
  { value: "vp", label: "VP" },
  { value: "c_suite", label: "C-Suite" },
  { value: "partner", label: "Partner" },
  { value: "founder", label: "Founder" },
  { value: "owner", label: "Owner" },
];

const SECTOR_OPTIONS = [
  "Technology",
  "Finance & Banking",
  "Consulting",
  "Healthcare",
  "Venture Capital & Private Equity",
  "Consumer Products",
  "Energy",
  "Real Estate",
  "Government",
  "Education",
  "Media & Entertainment",
  "Manufacturing",
  "Retail & E-Commerce",
  "Telecommunications",
  "Aerospace & Defense",
  "Automotive",
  "Legal",
  "Nonprofit",
];

const EMPLOYEE_RANGES = [
  { label: "1–10", value: "1,10" },
  { label: "11–50", value: "11,50" },
  { label: "51–200", value: "51,200" },
  { label: "201–500", value: "201,500" },
  { label: "501–1,000", value: "501,1000" },
  { label: "1,001–5,000", value: "1001,5000" },
  { label: "5,000+", value: "5001,10000000" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Company = {
  apolloId: string;
  name: string;
  domain: string | null;
  industry: string | null;
  logoUrl: string | null;
};

type PersonResult = {
  apolloId: string;
  name: string;
  firstName: string;
  lastName: string;
  title: string | null;
  headline: string | null;
  linkedinUrl: string | null;
  photoUrl: string | null;
  city: string | null;
  state: string | null;
  company: string | null;
  companyDomain: string | null;
  seniority: string | null;
  departments: string[];
};

type EnrichState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; email: string | null; contactId: string }
  | { status: "error"; message: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function seniorityColor(seniority: string | null): string {
  if (!seniority) return "text-[var(--text-secondary)] bg-[var(--bg-hover)]";
  if (["vp", "c_suite", "partner", "founder", "owner"].includes(seniority))
    return "text-[var(--warning)] bg-[var(--warning)]/10 border border-[var(--warning)]/20";
  if (["director", "head"].includes(seniority))
    return "text-purple-400 bg-purple-400/10 border border-purple-400/20";
  if (seniority === "manager")
    return "text-[var(--accent)] bg-[var(--accent-subtle)] border border-[var(--accent)]/20";
  if (seniority === "senior")
    return "text-sky-400 bg-sky-400/10 border border-sky-400/20";
  return "text-[var(--text-secondary)] bg-[var(--bg-hover)] border border-[var(--border)]";
}

function seniorityLabel(s: string | null): string {
  return SENIORITY_OPTIONS.find((o) => o.value === s)?.label ?? (s ?? "");
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PeopleFinder({
  creditsToday,
  apolloConfigured,
}: {
  creditsToday: number;
  apolloConfigured: boolean;
}) {
  const router = useRouter();

  // — Search filters
  const [titleInput, setTitleInput] = useState("");
  const [titles, setTitles] = useState<string[]>([]);
  const [companyQuery, setCompanyQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companySuggestions, setCompanySuggestions] = useState<Company[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [location, setLocation] = useState("");
  const [seniorities, setSeniorities] = useState<string[]>([]);
  const [sector, setSector] = useState("");
  const [employeeRange, setEmployeeRange] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [perPage] = useState(25);

  // — Results
  const [results, setResults] = useState<PersonResult[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // — Enrichment
  const [enrichMap, setEnrichMap] = useState<Map<string, EnrichState>>(new Map());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [creditsUsed, setCreditsUsed] = useState(creditsToday);

  // — Bulk
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEnriching, setBulkEnriching] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);

  // Debounce timer for company autocomplete
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleCompanyInput = useCallback((value: string) => {
    setCompanyQuery(value);
    setSelectedCompany(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setCompanySuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/apollo/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: value }),
        });
        const data = await res.json();
        setCompanySuggestions(data.companies ?? []);
        setShowSuggestions(true);
      } catch {
        /* ignore */
      }
    }, 350);
  }, []);

  const addTitle = () => {
    const t = titleInput.trim();
    if (t && !titles.includes(t)) setTitles([...titles, t]);
    setTitleInput("");
  };

  const toggleSeniority = (val: string) => {
    setSeniorities((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  };

  const buildSearchPayload = (p: number) => ({
    titles,
    companies: selectedCompany?.domain ? [selectedCompany.domain] : [],
    locations: location ? [location] : [],
    seniorities,
    keywords: sector,
    emailStatus: verifiedOnly ? ["verified"] : [],
    employeeRanges: employeeRange ? [employeeRange] : [],
    page: p,
    perPage,
  });

  const handleSearch = async (p = 1) => {
    if (!apolloConfigured) return;
    setSearching(true);
    setSearchError(null);
    setSelectedIds(new Set());
    try {
      const res = await fetch("/api/apollo/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSearchPayload(p)),
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error ?? "Search failed");
        return;
      }
      setResults(data.people ?? []);
      setTotalEntries(data.totalEntries ?? 0);
      setTotalPages(data.totalPages ?? 0);
      setPage(p);
      setHasSearched(true);
    } catch {
      setSearchError("Network error — please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleEnrich = async (person: PersonResult) => {
    setEnrichMap((m) => new Map(m).set(person.apolloId, { status: "loading" }));
    try {
      const res = await fetch("/api/apollo/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apolloId: person.apolloId,
          firstName: person.firstName,
          lastName: person.lastName,
          companyDomain: person.companyDomain,
          linkedinUrl: person.linkedinUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEnrichMap((m) =>
          new Map(m).set(person.apolloId, { status: "error", message: data.error ?? "Failed" })
        );
        return;
      }
      setEnrichMap((m) =>
        new Map(m).set(person.apolloId, {
          status: "done",
          email: data.email,
          contactId: data.contact.id,
        })
      );
      if (data.emailStatus !== "already_enriched") {
        setCreditsUsed((c) => c + 1);
      }
    } catch {
      setEnrichMap((m) =>
        new Map(m).set(person.apolloId, { status: "error", message: "Network error" })
      );
    }
  };

  const handleBulkEnrich = async () => {
    const toEnrich = results.filter(
      (p) => selectedIds.has(p.apolloId) && enrichMap.get(p.apolloId)?.status !== "done"
    );
    const batch = toEnrich.slice(0, 10);
    if (batch.length === 0) return;

    setBulkEnriching(true);
    setBulkProgress(0);
    setBulkTotal(batch.length);

    for (const person of batch) {
      await handleEnrich(person);
      setBulkProgress((n) => n + 1);
    }
    setBulkEnriching(false);
    setSelectedIds(new Set());
  };

  const copyEmail = (apolloId: string, email: string) => {
    navigator.clipboard.writeText(email).then(() => {
      setCopiedId(apolloId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map((p) => p.apolloId)));
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Apollo not configured warning */}
      {!apolloConfigured && (
        <div className="rounded-[var(--radius-md)] border border-[var(--warning)]/30 bg-[var(--warning)]/5 px-4 py-3 flex items-start gap-3">
          <AlertCircle size={16} className="text-[var(--warning)] shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="text-[var(--warning)] font-medium">Apollo API key not configured.</span>{" "}
            Add <code className="text-xs bg-[var(--bg-card)] px-1 rounded">APOLLO_API_KEY</code> to
            your <code className="text-xs bg-[var(--bg-card)] px-1 rounded">.env</code> file.{" "}
            <a
              href="https://app.apollo.io/#/settings/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              Get your key →
            </a>
          </p>
        </div>
      )}

      {/* Credit usage banner */}
      {apolloConfigured && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Zap size={13} className="text-[var(--accent)]" />
          <span>
            Credits used today:{" "}
            <span className="text-[var(--text-primary)] font-medium">{creditsUsed}</span>
            <span className="text-[var(--border)]"> / </span>
            <span>50</span>
          </span>
          <span className="text-[var(--border)]">·</span>
          <span>Email enrichment costs 1 credit per person</span>
        </div>
      )}

      {/* ── Search Form ── */}
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Company */}
          <div className="relative">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Company
            </label>
            <input
              type="text"
              value={selectedCompany ? selectedCompany.name : companyQuery}
              onChange={(e) => handleCompanyInput(e.target.value)}
              onFocus={() => companySuggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Google, Stripe, OpenAI…"
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]/60"
            />
            {showSuggestions && companySuggestions.length > 0 && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-card)] shadow-xl overflow-hidden">
                {companySuggestions.map((c) => (
                  <button
                    key={c.apolloId}
                    onMouseDown={() => {
                      setSelectedCompany(c);
                      setCompanyQuery(c.name);
                      setShowSuggestions(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    {c.logoUrl ? (
                      <Image
                        src={c.logoUrl}
                        alt={c.name}
                        width={18}
                        height={18}
                        className="rounded shrink-0"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded bg-[var(--accent-subtle)] shrink-0" />
                    )}
                    <span className="font-medium truncate">{c.name}</span>
                    {c.industry && (
                      <span className="text-xs text-[var(--text-secondary)] truncate ml-auto shrink-0">
                        {c.industry}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Job Title */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Job Title
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTitle();
                  }
                }}
                placeholder="Software Engineer…"
                className="flex-1 min-w-0 bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]/60"
              />
              <button
                onClick={addTitle}
                className="shrink-0 px-2.5 py-2 rounded-[var(--radius-sm)] bg-[var(--accent-subtle)] border border-[var(--accent)]/30 text-[var(--accent)] text-xs hover:bg-[var(--accent)]/20 transition-colors"
              >
                Add
              </button>
            </div>
            {titles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {titles.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20"
                  >
                    {t}
                    <button onClick={() => setTitles(titles.filter((x) => x !== t))}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="San Francisco, New York…"
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]/60"
            />
          </div>

          {/* Sector */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Sector / Industry
            </label>
            <div className="relative">
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full appearance-none bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]/60 pr-7"
              >
                <option value="">Any sector</option>
                {SECTOR_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Company Size */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Company Size
            </label>
            <div className="relative">
              <select
                value={employeeRange}
                onChange={(e) => setEmployeeRange(e.target.value)}
                className="w-full appearance-none bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]/60 pr-7"
              >
                <option value="">Any size</option>
                {EMPLOYEE_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} employees
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Verified emails toggle */}
          <div className="flex flex-col justify-end">
            <button
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className="flex items-center gap-2.5 py-2"
            >
              <div
                className={`relative w-9 h-5 rounded-full transition-colors ${verifiedOnly ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${verifiedOnly ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </div>
              <span className="text-sm text-[var(--text-secondary)]">Verified emails only</span>
            </button>
          </div>
        </div>

        {/* Seniority */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
            Seniority
          </label>
          <div className="flex flex-wrap gap-2">
            {SENIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleSeniority(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  seniorities.includes(opt.value)
                    ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--bg-primary)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 hover:text-[var(--text-primary)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search button */}
        <div className="flex justify-end">
          <button
            onClick={() => handleSearch(1)}
            disabled={searching || !apolloConfigured}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)] font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searching ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Search size={15} />
            )}
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      {/* ── Results ── */}
      {searchError && (
        <div className="rounded-[var(--radius-md)] border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-4 py-3 text-sm text-[var(--danger)]">
          {searchError}
        </div>
      )}

      {hasSearched && !searching && (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-[var(--text-secondary)]" />
              <span className="text-sm text-[var(--text-secondary)]">
                <span className="text-[var(--text-primary)] font-medium">
                  {totalEntries.toLocaleString()}
                </span>{" "}
                people found
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkEnrich}
                  disabled={bulkEnriching}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60"
                >
                  {bulkEnriching ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      {bulkProgress}/{bulkTotal}
                    </>
                  ) : (
                    <>
                      <Mail size={12} />
                      Get Emails ({Math.min(selectedIds.size, 10)})
                    </>
                  )}
                </button>
              )}
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <button
                    onClick={() => handleSearch(page - 1)}
                    disabled={page <= 1 || searching}
                    className="p-1 rounded hover:bg-[var(--bg-hover)] disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span>
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => handleSearch(page + 1)}
                    disabled={page >= totalPages || searching}
                    className="p-1 rounded hover:bg-[var(--bg-hover)] disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          {results.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] px-6 py-12 text-center">
              <p className="text-[var(--text-secondary)] text-sm">
                No results found. Try broadening your search.
              </p>
            </div>
          ) : (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
              {/* Column header */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)]">
                <input
                  type="checkbox"
                  checked={selectedIds.size === results.length && results.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
                <span className="flex-1">Person</span>
                <span className="w-28 hidden sm:block">Location</span>
                <span className="w-20 hidden md:block">Seniority</span>
                <span className="w-52 text-right">Email</span>
              </div>

              {/* Rows */}
              {results.map((person) => {
                const enrichState = enrichMap.get(person.apolloId) ?? { status: "idle" };
                const isSelected = selectedIds.has(person.apolloId);

                return (
                  <div
                    key={person.apolloId}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors ${isSelected ? "bg-[var(--accent-subtle)]" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(person.apolloId)}
                      className="rounded shrink-0"
                    />

                    {/* Avatar + Name */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {person.photoUrl ? (
                        <Image
                          src={person.photoUrl}
                          alt={person.name}
                          width={32}
                          height={32}
                          className="rounded-full shrink-0 object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] text-xs font-bold shrink-0">
                          {person.name[0] ?? "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {person.name}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {[person.title, person.company].filter(Boolean).join(" @ ")}
                        </p>
                      </div>
                    </div>

                    {/* Location */}
                    <span className="w-28 text-xs text-[var(--text-secondary)] truncate hidden sm:block">
                      {[person.city, person.state].filter(Boolean).join(", ") || "—"}
                    </span>

                    {/* Seniority */}
                    <div className="w-20 hidden md:flex">
                      {person.seniority ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${seniorityColor(person.seniority)}`}
                        >
                          {seniorityLabel(person.seniority)}
                        </span>
                      ) : (
                        <span className="text-[var(--border)]">—</span>
                      )}
                    </div>

                    {/* Email / Get Email */}
                    <div className="w-52 flex items-center justify-end gap-1.5">
                      <EmailCell
                        person={person}
                        enrichState={enrichState}
                        copiedId={copiedId}
                        onEnrich={() => handleEnrich(person)}
                        onCopy={(email) => copyEmail(person.apolloId, email)}
                        onCompose={(contactId) =>
                          router.push(`/dashboard/compose?contactId=${contactId}`)
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => handleSearch(page - 1)}
                disabled={page <= 1 || searching}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={13} /> Previous
              </button>
              <span className="text-xs text-[var(--text-secondary)]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => handleSearch(page + 1)}
                disabled={page >= totalPages || searching}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 transition-colors"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EmailCell sub-component ──────────────────────────────────────────────────

function EmailCell({
  person,
  enrichState,
  copiedId,
  onEnrich,
  onCopy,
  onCompose,
}: {
  person: PersonResult;
  enrichState: EnrichState;
  copiedId: string | null;
  onEnrich: () => void;
  onCopy: (email: string) => void;
  onCompose: (contactId: string) => void;
}) {
  if (enrichState.status === "loading") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
        <Loader2 size={13} className="animate-spin" /> Getting email…
      </span>
    );
  }

  if (enrichState.status === "done") {
    if (!enrichState.email) {
      return <span className="text-xs text-[var(--text-secondary)]">No email found</span>;
    }
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-[var(--text-primary)] font-mono truncate max-w-[130px]">
          {enrichState.email}
        </span>
        <button
          onClick={() => onCopy(enrichState.email!)}
          className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          title="Copy email"
        >
          {copiedId === person.apolloId ? (
            <Check size={12} className="text-[var(--success)]" />
          ) : (
            <Copy size={12} />
          )}
        </button>
        <button
          onClick={() => onCompose(enrichState.contactId)}
          className="p-1 rounded text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          title="Compose email"
        >
          <Send size={12} />
        </button>
      </div>
    );
  }

  if (enrichState.status === "error") {
    return (
      <span className="text-xs text-[var(--danger)]" title={enrichState.message}>
        {enrichState.message.includes("limit") ? "Limit reached" : "Error"}
      </span>
    );
  }

  // idle
  return (
    <button
      onClick={onEnrich}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--accent)]/40 text-[var(--accent)] text-xs font-medium hover:bg-[var(--accent-subtle)] transition-colors"
    >
      <Mail size={12} />
      Get Email
    </button>
  );
}
