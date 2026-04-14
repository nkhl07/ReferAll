"use client";

import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Send, ChevronDown, PlusCircle, CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

const TEMPLATES = [
  { id: "coffee_chat", label: "Coffee Chat" },
  { id: "referral", label: "Referral Request" },
  { id: "follow_up", label: "Follow-Up" },
  { id: "thank_you", label: "Thank You" },
  { id: "custom", label: "Custom" },
];

const TONES = ["Professional", "Friendly", "Direct", "Casual"];

type Contact = {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  role?: string | null;
  sector?: string | null;
  workDescription?: string | null;
  linkedinSummary?: string | null;
  sharedExperiences?: string | null;
};

type UserInfo = {
  name?: string | null;
  bio?: string | null;
  resume?: string | null;
  targetRoles?: string | null;
  targetSectors?: string | null;
} | null;

interface Props {
  contacts: Contact[];
  user: UserInfo;
}

export default function EmailComposer({ contacts, user }: Props) {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("contactId");

  const [selectedContact, setSelectedContact] = useState<Contact | null>(
    preselectedId ? contacts.find((c) => c.id === preselectedId) ?? null : null
  );
  const [manualMode, setManualMode] = useState(false);
  const [manual, setManual] = useState({ name: "", email: "", company: "", role: "" });
  const [template, setTemplate] = useState("coffee_chat");
  const [tone, setTone] = useState("Friendly");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  useEffect(() => {
    // Fetch calendar availability when a contact is selected
    if (selectedContact || manualMode) {
      fetch("/api/calendar/availability")
        .then((r) => r.json())
        .then((d) => setAvailableSlots(d.slots ?? []))
        .catch(() => {});
    }
  }, [selectedContact, manualMode]);

  const effectiveRecipient = manualMode
    ? manual
    : selectedContact
    ? {
        name: selectedContact.name,
        email: selectedContact.email ?? "",
        company: selectedContact.company ?? "",
        role: selectedContact.role ?? "",
      }
    : null;

  const handleGenerate = async () => {
    if (!effectiveRecipient?.name) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/emails/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: effectiveRecipient,
          recipientDetails: selectedContact
            ? {
                sector: selectedContact.sector,
                workDescription: selectedContact.workDescription,
                linkedinSummary: selectedContact.linkedinSummary,
                sharedExperiences: selectedContact.sharedExperiences,
              }
            : null,
          template,
          tone,
          availableSlots,
          userContext: user,
        }),
      });
      const data = await res.json();
      if (data.subject) setSubject(data.subject);
      if (data.body) setBody(data.body);
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!body || !subject) return;
    setSending(true);
    try {
      await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContact?.id,
          recipientEmail: effectiveRecipient?.email,
          recipientName: effectiveRecipient?.name,
          subject,
          body,
          template,
        }),
      });
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Left panel */}
      <div className="w-full md:w-96 shrink-0 border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col overflow-y-auto">
        <div className="p-5 space-y-5">
          {/* Template selector */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Template</label>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    template === t.id
                      ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--bg-primary)]"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tone selector */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Tone</label>
            <div className="relative">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full appearance-none bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] pr-8 focus:outline-none focus:border-[var(--accent)]/60"
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
            </div>
          </div>

          {/* Recipient */}
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-2 block">Recipient</label>

            {manualMode ? (
              <div className="space-y-2">
                {(["name", "email", "company", "role"] as const).map((f) => (
                  <input
                    key={f}
                    type="text"
                    value={manual[f]}
                    onChange={(e) => setManual({ ...manual, [f]: e.target.value })}
                    placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]/60"
                  />
                ))}
                <button
                  onClick={() => { setManualMode(false); setSelectedContact(null); }}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  ← Back to contacts
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedContact?.id ?? ""}
                    onChange={(e) => {
                      const c = contacts.find((c) => c.id === e.target.value);
                      setSelectedContact(c ?? null);
                    }}
                    className="w-full appearance-none bg-[var(--accent)] border border-[var(--accent)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--bg-primary)] font-medium pr-8 focus:outline-none cursor-pointer"
                  >
                    <option value="">Select a contact…</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `— ${c.company}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
                </div>
                <button
                  onClick={() => { setManualMode(true); setSelectedContact(null); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-sm)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)] whitespace-nowrap"
                >
                  <PlusCircle size={11} />
                  Enter manually
                </button>
              </div>
            )}

            {selectedContact && !manualMode && (
              <div className="mt-2 p-3 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)]">
                <p className="text-xs font-medium text-[var(--text-primary)]">{selectedContact.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {[selectedContact.role, selectedContact.company].filter(Boolean).join(" @ ")}
                </p>
                {selectedContact.workDescription && (
                  <p className="mt-1.5 text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                    {selectedContact.workDescription}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Calendar slots */}
          {availableSlots.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                Your availability (auto-inserted)
              </label>
              <div className="space-y-1">
                {availableSlots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)]">
                    <span className="w-4 h-4 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                    {slot}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || (!selectedContact && !manual.name)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)] font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Generate Email
              </>
            )}
          </button>

          {body && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} />
              Regenerate
            </button>
          )}
        </div>
      </div>

      {/* Right panel — email preview / editor */}
      <div className="flex-1 flex flex-col bg-[var(--bg-primary)] overflow-hidden">
        {sent ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-10 text-center">
            <div
              className="w-20 h-20 rounded-full bg-[var(--accent-subtle)] border-2 border-[var(--accent)]/30 flex items-center justify-center"
              style={{ animation: "scale-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
              <CheckCircle2 size={40} className="text-[var(--accent)]" style={{ animation: "scale-in 0.3s 0.15s cubic-bezier(0.34,1.56,0.64,1) both", opacity: 0 }} />
            </div>
            <div style={{ animation: "fade-up 0.4s 0.25s ease both", opacity: 0 }}>
              <p className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-heading)" }}>
                Email sent!
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {effectiveRecipient?.name ? `Your message to ${effectiveRecipient.name} is on its way.` : "Your message is on its way."}
              </p>
            </div>
            <button
              onClick={() => { setSent(false); setSubject(""); setBody(""); setSelectedContact(null); setManual({ name: "", email: "", company: "", role: "" }); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)] font-medium text-sm transition-colors"
              style={{ animation: "fade-up 0.4s 0.4s ease both", opacity: 0 }}
            >
              <PlusCircle size={15} />
              Compose another
            </button>
            <style>{`
              @keyframes scale-in {
                from { transform: scale(0.5); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
              @keyframes fade-up {
                from { transform: translateY(12px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
            `}</style>
          </div>
        ) : !body && !subject ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="w-14 h-14 rounded-[var(--radius-lg)] bg-[var(--accent-subtle)] border border-[var(--accent)]/20 flex items-center justify-center">
              <Sparkles size={24} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]" style={{ fontFamily: "var(--font-heading)" }}>
                Your email will appear here
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Select a recipient and click "Generate Email"
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]/60 transition-colors"
              />
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="flex-1 min-h-64 w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] px-4 py-3 text-sm text-[var(--text-primary)] leading-relaxed resize-none focus:outline-none focus:border-[var(--accent)]/60 transition-colors"
              />
              <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                {body.split(/\s+/).filter(Boolean).length} words
              </p>
            </div>

            {/* Send */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSend}
                disabled={sending || !body || !subject || !effectiveRecipient?.email}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)] font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
              >
                {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                {sending ? "Sending…" : "Send Email"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
