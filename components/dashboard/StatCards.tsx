"use client";

import { Mail, Calendar, Clock, TrendingUp } from "lucide-react";

interface Stats {
  emailsSent: number;
  meetingsScheduled: number;
  followUpsPending: number;
  responseRate: number;
}

const cards = [
  {
    key: "emailsSent" as keyof Stats,
    label: "Emails Sent",
    sublabel: "this week",
    icon: Mail,
    color: "var(--accent)",
    bg: "var(--accent-subtle)",
  },
  {
    key: "meetingsScheduled" as keyof Stats,
    label: "Meetings",
    sublabel: "this week",
    icon: Calendar,
    color: "var(--success)",
    bg: "rgba(74, 222, 128, 0.1)",
  },
  {
    key: "followUpsPending" as keyof Stats,
    label: "Follow-Ups",
    sublabel: "pending",
    icon: Clock,
    color: "var(--warning)",
    bg: "rgba(251, 191, 36, 0.1)",
  },
  {
    key: "responseRate" as keyof Stats,
    label: "Response Rate",
    sublabel: "this week",
    icon: TrendingUp,
    color: "#C084FC",
    bg: "rgba(192, 132, 252, 0.1)",
    suffix: "%",
  },
];

export default function StatCards({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ key, label, sublabel, icon: Icon, color, bg, suffix }) => (
        <div
          key={key}
          className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] p-4 flex flex-col gap-3 hover:bg-[var(--bg-hover)] transition-colors"
        >
          <div
            className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center"
            style={{ background: bg }}
          >
            <Icon size={16} style={{ color }} />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-heading)" }}>
              {stats[key]}{suffix ?? ""}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {label} <span className="opacity-60">{sublabel}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
