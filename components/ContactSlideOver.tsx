"use client";

import { useEffect, useState } from "react";
import { X, Mail, Building2, Briefcase, Tag, Star, Edit3, Save } from "lucide-react";
import type { Contact } from "@prisma/client";

interface Props {
  contact: Contact;
  open: boolean;
  onClose: () => void;
}

function FitBar({ score }: { score: number }) {
  const color = score >= 85 ? "var(--success)" : score >= 70 ? "var(--warning)" : "var(--accent)";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{score}%</span>
    </div>
  );
}

export default function ContactSlideOver({ contact, open, onClose }: Props) {
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(contact.notes ?? "");
  }, [contact.notes]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const saveNotes = async () => {
    setSaving(true);
    await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
    setEditing(false);
  };

  let shared: string[] = [];
  try {
    shared = JSON.parse(contact.sharedExperiences ?? "[]");
  } catch {}

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:bg-black/30"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-[var(--bg-secondary)] border-l border-[var(--border)] z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-heading)" }}>
            {contact.name}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Identity */}
          <div className="space-y-2">
            {contact.company && (
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Building2 size={14} className="shrink-0" />
                <span>{contact.company}</span>
              </div>
            )}
            {contact.role && (
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Briefcase size={14} className="shrink-0" />
                <span>{contact.role}</span>
              </div>
            )}
            {contact.sector && (
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Tag size={14} className="shrink-0" />
                <span>{contact.sector}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail size={14} className="text-[var(--text-secondary)] shrink-0" />
                <a href={`mailto:${contact.email}`} className="text-[var(--accent)] hover:underline truncate">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.linkedinUrl && (
              <div className="flex items-center gap-2 text-sm">
                <Mail size={14} className="text-[var(--text-secondary)] shrink-0" />
                <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline truncate">
                  LinkedIn Profile
                </a>
              </div>
            )}
          </div>

          {/* Fit score */}
          {contact.fitScore != null && (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star size={14} className="text-[var(--warning)]" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">Fit Score</span>
              </div>
              <FitBar score={contact.fitScore} />
            </div>
          )}

          {/* What they work on */}
          {contact.workDescription && (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">What They Work On</h3>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">{contact.workDescription}</p>
            </div>
          )}

          {/* LinkedIn summary */}
          {contact.linkedinSummary && (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">Background</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{contact.linkedinSummary}</p>
            </div>
          )}

          {/* Shared experiences */}
          {shared.length > 0 && (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">Shared Experiences</h3>
              <div className="flex flex-wrap gap-2">
                {shared.map((exp, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full text-xs bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20"
                  >
                    {exp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Notes</h3>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  <Edit3 size={12} />
                  Edit
                </button>
              ) : (
                <button
                  onClick={saveNotes}
                  disabled={saving}
                  className="flex items-center gap-1 text-xs text-[var(--success)] hover:text-[var(--success)]/80 transition-colors"
                >
                  <Save size={12} />
                  {saving ? "Saving…" : "Save"}
                </button>
              )}
            </div>
            {editing ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] resize-none focus:outline-none focus:border-[var(--accent)]/60 transition-colors"
                placeholder="Add notes about this person…"
              />
            ) : (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {notes || <span className="italic opacity-50">No notes yet.</span>}
              </p>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-[var(--border)] flex gap-2">
          <a
            href={`/dashboard/compose?contactId=${contact.id}`}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)] text-sm font-medium transition-colors"
          >
            <Mail size={14} />
            Compose Email
          </a>
        </div>
      </aside>
    </>
  );
}
