"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, MailOpen, Mail, Clock, CheckCircle2 } from "lucide-react";
import ContactSlideOver from "@/components/ContactSlideOver";
import type { Email, Contact, FollowUp } from "@prisma/client";

type EmailWithRelations = Email & {
  contact: Contact | null;
  followUps: FollowUp[];
};

const TEMPLATE_LABELS: Record<string, string> = {
  coffee_chat: "Coffee Chat",
  referral: "Referral",
  follow_up: "Follow-Up",
  thank_you: "Thank You",
  custom: "Custom",
};

export default function SentEmailsList({ emails }: { emails: EmailWithRelations[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [slideOver, setSlideOver] = useState<Contact | null>(null);

  if (emails.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] px-6 py-12 text-center">
        <p className="text-[var(--text-secondary)] text-sm">No emails sent yet. Compose your first outreach email.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {emails.map((email) => {
          const isExpanded = expanded === email.id;
          const hasReplied = !!email.repliedAt;

          return (
            <div
              key={email.id}
              className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden hover:border-[var(--accent)]/20 transition-colors"
            >
              {/* Row header */}
              <button
                className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-[var(--bg-hover)] transition-colors"
                onClick={() => setExpanded(isExpanded ? null : email.id)}
              >
                <div className="shrink-0">
                  {hasReplied ? (
                    <MailOpen size={16} className="text-[var(--success)]" />
                  ) : (
                    <Mail size={16} className="text-[var(--text-secondary)]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {email.contact ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSlideOver(email.contact); }}
                        className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
                      >
                        {email.contact.name}
                      </button>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-secondary)]">Unknown Contact</span>
                    )}
                    {email.contact?.company && (
                      <span className="text-xs text-[var(--text-secondary)]">@ {email.contact.company}</span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-secondary)]">
                      {TEMPLATE_LABELS[email.template] ?? email.template}
                    </span>
                    {hasReplied && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)]">
                        <CheckCircle2 size={10} />
                        Replied
                      </span>
                    )}
                    {email.followUps.some((f) => f.status === "pending") && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--warning)]/10 border border-[var(--warning)]/20 text-[var(--warning)]">
                        <Clock size={10} />
                        Follow-up pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{email.subject}</p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs text-[var(--text-secondary)]">
                    {email.sentAt ? format(new Date(email.sentAt), "MMM d, yyyy") : "—"}
                  </p>
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-[var(--text-secondary)] ml-auto mt-1" />
                  ) : (
                    <ChevronRight size={14} className="text-[var(--text-secondary)] ml-auto mt-1" />
                  )}
                </div>
              </button>

              {/* Expanded body */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-[var(--border)]">
                  <div className="mt-3 p-4 rounded-[var(--radius-sm)] bg-[var(--bg-primary)] border border-[var(--border)]">
                    <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Subject: {email.subject}</p>
                    <pre className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap font-[var(--font-body)]">
                      {email.body}
                    </pre>
                  </div>

                  {email.repliedAt && (
                    <p className="text-xs text-[var(--success)] mt-2 flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      Replied on {format(new Date(email.repliedAt), "MMM d, yyyy")}
                    </p>
                  )}

                  {email.followUps.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium text-[var(--text-secondary)]">Follow-ups:</p>
                      {email.followUps.map((fu) => (
                        <div key={fu.id} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <span>#{fu.followUpNumber}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full border text-xs ${
                              fu.status === "sent"
                                ? "bg-[var(--success)]/10 border-[var(--success)]/20 text-[var(--success)]"
                                : fu.status === "pending"
                                ? "bg-[var(--warning)]/10 border-[var(--warning)]/20 text-[var(--warning)]"
                                : "bg-[var(--bg-hover)] border-[var(--border)] text-[var(--text-secondary)]"
                            }`}
                          >
                            {fu.status}
                          </span>
                          <span>{format(new Date(fu.scheduledDate), "MMM d")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {slideOver && (
        <ContactSlideOver
          contact={slideOver}
          open={!!slideOver}
          onClose={() => setSlideOver(null)}
        />
      )}
    </>
  );
}
