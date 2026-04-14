"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Video, ChevronRight, Building2, Briefcase, Star } from "lucide-react";
import ContactSlideOver from "@/components/ContactSlideOver";
import type { Contact, Meeting } from "@prisma/client";

type MeetingWithContact = Meeting & { contact: Contact };

function FitScoreBadge({ score }: { score: number | null }) {
  if (!score) return null;
  const color =
    score >= 85 ? "var(--success)" : score >= 70 ? "var(--warning)" : "var(--text-secondary)";
  const bg =
    score >= 85 ? "rgba(74,222,128,0.1)" : score >= 70 ? "rgba(251,191,36,0.1)" : "rgba(160,160,160,0.1)";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ color, background: bg, borderColor: `${color}30` }}
    >
      <Star size={10} fill={color} stroke="none" />
      {score}% fit
    </span>
  );
}

export default function MeetingCard({ meeting }: { meeting: MeetingWithContact }) {
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const { contact } = meeting;

  const dateLabel = format(new Date(meeting.dateTime), "EEE, MMM d");
  const timeLabel = format(new Date(meeting.dateTime), "h:mm a");

  return (
    <>
      <div className="group rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] p-4 flex items-start justify-between gap-4 hover:bg-[var(--bg-hover)] hover:-translate-y-0.5 transition-all duration-150 hover:border-[var(--accent)]/30">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setSlideOverOpen(true)}
              className="text-base font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors text-left"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {contact.name}
            </button>
            <FitScoreBadge score={contact.fitScore} />
          </div>

          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
            {contact.company && (
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <Building2 size={12} />
                {contact.company}
              </span>
            )}
            {contact.role && (
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <Briefcase size={12} />
                {contact.role}
              </span>
            )}
            {contact.sector && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20">
                {contact.sector}
              </span>
            )}
          </div>

          {contact.workDescription && (
            <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
              {contact.workDescription}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-right">
            <p className="text-sm font-medium text-[var(--text-primary)]">{dateLabel}</p>
            <p className="text-xs text-[var(--text-secondary)]">{timeLabel}</p>
          </div>

          <div className="flex items-center gap-2">
            {meeting.meetingLink && (
              <a
                href={meeting.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--accent-subtle)] border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-medium hover:bg-[var(--accent)]/20 transition-colors"
              >
                <Video size={12} />
                Join
              </a>
            )}
            <button
              onClick={() => setSlideOverOpen(true)}
              className="p-1 rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <ContactSlideOver
        contact={contact}
        open={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
      />
    </>
  );
}
