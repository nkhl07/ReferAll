"use client";

import { format } from "date-fns";
import { Check, X, Edit, Clock } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FollowUp, Email, Contact } from "@prisma/client";

type FollowUpWithEmail = FollowUp & {
  email: Email & { contact: Contact };
};

export default function FollowUpCard({ followUp }: { followUp: FollowUpWithEmail }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const { email } = followUp;
  const contact = email.contact;

  const handleAction = async (action: "approved" | "skipped" | "snoozed") => {
    setLoading(action);
    try {
      await fetch(`/api/follow-ups/${followUp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] p-4 hover:bg-[var(--bg-hover)] transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-heading)" }}>
              {contact.name}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20">
              Follow-Up #{followUp.followUpNumber}
            </span>
            {contact.company && (
              <span className="text-xs text-[var(--text-secondary)]">@ {contact.company}</span>
            )}
          </div>

          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Original email sent {email.sentAt ? format(new Date(email.sentAt), "MMM d") : "—"} •{" "}
            Due {format(new Date(followUp.scheduledDate), "MMM d")}
          </p>

          {followUp.body && (
            <div className="mt-3 p-3 rounded-[var(--radius-sm)] bg-[var(--bg-primary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] leading-relaxed">
              <p className="line-clamp-3">{followUp.body}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => handleAction("approved")}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)] text-xs font-medium hover:bg-[var(--success)]/20 transition-colors disabled:opacity-50"
        >
          <Check size={12} />
          {loading === "approved" ? "Sending…" : "Approve & Send"}
        </button>

        <a
          href={`/dashboard/compose?followUp=${followUp.id}&contactId=${contact.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-subtle)] border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-medium hover:bg-[var(--accent)]/20 transition-colors"
        >
          <Edit size={12} />
          Edit
        </a>

        <button
          onClick={() => handleAction("snoozed")}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-medium hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
        >
          <Clock size={12} />
          Snooze 3d
        </button>

        <button
          onClick={() => handleAction("skipped")}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--danger)] text-xs font-medium hover:bg-[var(--danger)]/10 transition-colors disabled:opacity-50"
        >
          <X size={12} />
          Skip
        </button>
      </div>
    </div>
  );
}
