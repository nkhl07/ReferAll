"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Plus, ChevronDown, Zap, Eye, Loader2, AlertTriangle,
} from "lucide-react";
import type { Campaign } from "@prisma/client";

// ── Schema ────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  goal: z.string().min(1, "Goal is required"),
  industry: z.string().min(1, "Industry is required"),
  targetCompanies: z.array(z.string()).min(1, "Add at least one target company"),
  targetRoles: z.array(z.string()).min(1, "Add at least one target role"),
  targetSeniority: z.array(z.string()),
  preferAlumni: z.boolean(),
  preferredChannel: z.enum(["email", "linkedin", "both"]),
  maxOutreachPerDay: z.number().int().min(1).max(20),
  followUpAfterDays: z.number().int().min(1).max(14),
  maxFollowUps: z.number().int().min(0).max(5),
  dailyBudgetCredits: z.number().int().min(1),
  approvalMode: z.enum(["SUPERVISED", "AUTONOMOUS"]),
});

type FormValues = z.infer<typeof formSchema>;

const INDUSTRIES = ["Investment Banking", "SWE", "PM", "Consulting", "Other"] as const;
const SENIORITY_OPTIONS = [
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Mid Level" },
  { value: "senior", label: "Senior Level" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-heading)" }}>
          {title}
        </h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label, error, children, hint,
}: { label: string; error?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[var(--text-secondary)]">{label}</label>
      {children}
      {hint && !error && <p className="text-[11px] text-[var(--text-secondary)]">{hint}</p>}
      {error && <p className="text-[11px] text-[var(--danger)]">{error}</p>}
    </div>
  );
}

function TagInput({
  values,
  onChange,
  placeholder,
}: { values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    }
    if (e.key === "Backspace" && !input && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div
      className="min-h-[40px] flex flex-wrap gap-1.5 items-center px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-secondary)] focus-within:border-[var(--accent)]/50 transition-colors cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {values.map((v) => (
        <span
          key={v}
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20"
        >
          {v}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(values.filter((x) => x !== v)); }}
            className="hover:text-[var(--danger)] transition-colors"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={add}
        placeholder={values.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CampaignForm({
  campaignId,
  initialData,
}: {
  campaignId?: string;
  initialData?: Partial<Campaign>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activateLoading, setActivateLoading] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      goal: initialData?.goal ?? "",
      industry: initialData?.industry ?? "",
      targetCompanies: initialData?.targetCompanies ?? [],
      targetRoles: initialData?.targetRoles ?? [],
      targetSeniority: initialData?.targetSeniority ?? [],
      preferAlumni: initialData?.preferAlumni ?? true,
      preferredChannel: (initialData?.preferredChannel as "email" | "linkedin" | "both") ?? "email",
      maxOutreachPerDay: initialData?.maxOutreachPerDay ?? 5,
      followUpAfterDays: initialData?.followUpAfterDays ?? 3,
      maxFollowUps: initialData?.maxFollowUps ?? 2,
      dailyBudgetCredits: initialData?.dailyBudgetCredits ?? 10,
      approvalMode: (initialData?.approvalMode as "SUPERVISED" | "AUTONOMOUS") ?? "SUPERVISED",
    },
  });

  const targetCompanies = watch("targetCompanies");
  const targetRoles = watch("targetRoles");
  const targetSeniority = watch("targetSeniority");
  const preferAlumni = watch("preferAlumni");
  const preferredChannel = watch("preferredChannel");
  const approvalMode = watch("approvalMode");

  const submitForm = async (data: FormValues): Promise<string | null> => {
    const url = campaignId ? `/api/campaigns/${campaignId}` : "/api/campaigns";
    const method = campaignId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || "Something went wrong");
    }

    const json = await res.json();
    return json.id as string;
  };

  const onSaveDraft = handleSubmit(async (data) => {
    setLoading(true);
    setError("");
    try {
      const id = await submitForm(data);
      router.push(`/dashboard/campaigns/${id ?? campaignId}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  });

  const onActivate = handleSubmit(async (data) => {
    setActivateLoading(true);
    setError("");
    try {
      const id = await submitForm(data);
      const targetId = id ?? campaignId;
      const activateRes = await fetch(`/api/campaigns/${targetId}/activate`, { method: "POST" });
      if (!activateRes.ok) {
        const json = await activateRes.json();
        throw new Error(json.error || "Failed to activate");
      }
      router.push(`/dashboard/campaigns/${targetId}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActivateLoading(false);
      setShowActivateModal(false);
    }
  });

  const inputClass =
    "w-full px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]/50 transition-colors";

  return (
    <>
      <form className="space-y-5">
        {/* Section 1: Basics */}
        <SectionCard title="1 · Basics">
          <Field label="Campaign Name" error={errors.name?.message}>
            <input
              {...register("name")}
              placeholder="e.g. Goldman Sachs IB Summer 2027"
              className={inputClass}
            />
          </Field>
          <Field label="Goal" error={errors.goal?.message}>
            <textarea
              {...register("goal")}
              placeholder="e.g. Book 5 coffee chats with GS analysts before March"
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </Field>
          <Field label="Industry" error={errors.industry?.message}>
            <div className="relative">
              <select
                {...register("industry")}
                className={`${inputClass} appearance-none pr-8`}
              >
                <option value="">Select industry…</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
            </div>
          </Field>
        </SectionCard>

        {/* Section 2: Targeting */}
        <SectionCard title="2 · Targeting">
          <Field
            label="Target Companies"
            error={errors.targetCompanies?.message}
            hint="Type a company name and press Enter or comma to add"
          >
            <TagInput
              values={targetCompanies}
              onChange={(v) => setValue("targetCompanies", v, { shouldValidate: true })}
              placeholder="e.g. Goldman Sachs, JP Morgan…"
            />
          </Field>
          <Field
            label="Target Roles"
            error={errors.targetRoles?.message}
            hint="Type a role and press Enter or comma to add"
          >
            <TagInput
              values={targetRoles}
              onChange={(v) => setValue("targetRoles", v, { shouldValidate: true })}
              placeholder="e.g. Analyst, Associate…"
            />
          </Field>
          <Field label="Target Seniority">
            <div className="flex flex-wrap gap-3">
              {SENIORITY_OPTIONS.map(({ value, label }) => {
                const checked = targetSeniority.includes(value);
                return (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setValue(
                          "targetSeniority",
                          checked
                            ? targetSeniority.filter((s) => s !== value)
                            : [...targetSeniority, value]
                        )
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        checked
                          ? "bg-[var(--accent)] border-[var(--accent)]"
                          : "border-[var(--border)] bg-[var(--bg-secondary)]"
                      }`}
                    >
                      {checked && (
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3L3 5L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--bg-primary)]" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-[var(--text-primary)]">{label}</span>
                  </label>
                );
              })}
            </div>
          </Field>
          <Field label="Prefer Alumni">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setValue("preferAlumni", !preferAlumni)}
                className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 ${
                  preferAlumni ? "bg-[var(--accent)]" : "bg-[var(--bg-hover)]"
                }`}
                style={{ height: "22px" }}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                    preferAlumni ? "translate-x-[18px]" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm text-[var(--text-primary)]">
                {preferAlumni ? "Prefer people from your university" : "No alumni preference"}
              </span>
            </div>
          </Field>
        </SectionCard>

        {/* Section 3: Strategy */}
        <SectionCard title="3 · Strategy">
          <Field label="Preferred Channel">
            <div className="flex gap-3">
              {[
                { value: "email", label: "Email" },
                { value: "linkedin", label: "LinkedIn" },
                { value: "both", label: "Both" },
              ].map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={preferredChannel === value}
                    onChange={() => setValue("preferredChannel", value as "email" | "linkedin" | "both")}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      preferredChannel === value
                        ? "border-[var(--accent)]"
                        : "border-[var(--border)]"
                    }`}
                  >
                    {preferredChannel === value && (
                      <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                    )}
                  </div>
                  <span className="text-sm text-[var(--text-primary)]">{label}</span>
                </label>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Max Outreach / Day" error={errors.maxOutreachPerDay?.message} hint="1–20">
              <input
                {...register("maxOutreachPerDay", { valueAsNumber: true })}
                type="number"
                min={1}
                max={20}
                className={inputClass}
              />
            </Field>
            <Field label="Follow-up After (days)" error={errors.followUpAfterDays?.message} hint="1–14">
              <input
                {...register("followUpAfterDays", { valueAsNumber: true })}
                type="number"
                min={1}
                max={14}
                className={inputClass}
              />
            </Field>
            <Field label="Max Follow-ups" error={errors.maxFollowUps?.message} hint="0–5">
              <input
                {...register("maxFollowUps", { valueAsNumber: true })}
                type="number"
                min={0}
                max={5}
                className={inputClass}
              />
            </Field>
            <Field label="Daily Credit Budget" error={errors.dailyBudgetCredits?.message}>
              <input
                {...register("dailyBudgetCredits", { valueAsNumber: true })}
                type="number"
                min={1}
                className={inputClass}
              />
            </Field>
          </div>
        </SectionCard>

        {/* Section 4: Mode */}
        <SectionCard title="4 · Agent Mode">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                value: "SUPERVISED",
                icon: Eye,
                title: "Supervised",
                desc: "Review and approve each action before it's sent. You stay in full control.",
              },
              {
                value: "AUTONOMOUS",
                icon: Zap,
                title: "Autonomous",
                desc: "Agent acts independently within your daily limits. Maximum speed.",
              },
            ].map(({ value, icon: Icon, title, desc }) => {
              const selected = approvalMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue("approvalMode", value as "SUPERVISED" | "AUTONOMOUS")}
                  className={`text-left p-4 rounded-[var(--radius-md)] border transition-all duration-150 ${
                    selected
                      ? "border-[var(--accent)]/50 bg-[var(--accent-subtle)]"
                      : "border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--border)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <Icon
                      size={16}
                      className={selected ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}
                    />
                    <span
                      className={`text-sm font-semibold ${selected ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {title}
                    </span>
                    {selected && (
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)] text-[var(--bg-primary)] font-medium">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{desc}</p>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-sm)] border border-[var(--danger)]/30 bg-[var(--danger)]/5 text-sm text-[var(--danger)]">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => setShowActivateModal(true)}
            disabled={activateLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)] text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Zap size={14} />
            Activate Campaign
          </button>
        </div>
      </form>

      {/* Activate confirmation modal */}
      <AnimatePresence>
        {showActivateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !activateLoading && setShowActivateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent)]/20 flex items-center justify-center">
                  <Zap size={18} className="text-[var(--accent)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-heading)" }}>
                    Activate Campaign
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">This will save and start the campaign</p>
                </div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-5 leading-relaxed">
                Once active, the agent will begin discovering and evaluating contacts based on your settings. You can pause at any time.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowActivateModal(false)}
                  disabled={activateLoading}
                  className="flex-1 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onActivate}
                  disabled={activateLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)] text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {activateLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  Activate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
