"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Edit2, Users, MessageSquare, Calendar,
  TrendingUp, Bot, Settings, Loader2, AlertTriangle,
} from "lucide-react";
import type { Campaign, CampaignTarget, AgentLog, CampaignStatus, TargetStatus } from "@prisma/client";
import { format } from "date-fns";

type CampaignFull = Campaign & { campaignTargets: CampaignTarget[]; agentLogs: AgentLog[] };

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<CampaignStatus, string> = {
  DRAFT: "text-[var(--text-secondary)] bg-[var(--bg-hover)] border-[var(--border)]",
  ACTIVE: "text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/20",
  PAUSED: "text-[var(--warning)] bg-[var(--warning)]/10 border-[var(--warning)]/20",
  COMPLETED: "text-[var(--accent)] bg-[var(--accent-subtle)] border-[var(--accent)]/20",
};

const PIPELINE_COLUMNS: { status: TargetStatus; label: string; color: string }[] = [
  { status: "DISCOVERED", label: "Discovered", color: "text-[var(--text-secondary)]" },
  { status: "EVALUATED", label: "Evaluated", color: "text-[var(--accent)]" },
  { status: "QUEUED", label: "Queued", color: "text-[var(--warning)]" },
  { status: "CONTACTED", label: "Contacted", color: "text-[var(--text-primary)]" },
  { status: "REPLIED", label: "Replied", color: "text-[var(--success)]" },
  { status: "MEETING_SET", label: "Meeting Set", color: "text-[var(--success)]" },
];

const TARGET_STATUS_STYLE: Partial<Record<TargetStatus, string>> = {
  DISCOVERED: "bg-[var(--bg-hover)] text-[var(--text-secondary)]",
  EVALUATED: "bg-[var(--accent-subtle)] text-[var(--accent)]",
  APPROVED: "bg-[var(--accent-subtle)] text-[var(--accent)]",
  QUEUED: "bg-[var(--warning)]/10 text-[var(--warning)]",
  CONTACTED: "bg-[var(--bg-hover)] text-[var(--text-primary)]",
  FOLLOWED_UP: "bg-[var(--warning)]/10 text-[var(--warning)]",
  REPLIED: "bg-[var(--success)]/10 text-[var(--success)]",
  MEETING_SET: "bg-[var(--success)]/10 text-[var(--success)]",
  DECLINED: "bg-[var(--danger)]/10 text-[var(--danger)]",
  NO_RESPONSE: "bg-[var(--bg-hover)] text-[var(--text-secondary)]",
  SKIPPED: "bg-[var(--bg-hover)] text-[var(--text-secondary)]",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3.5">
      <p className="text-xs text-[var(--text-secondary)] mb-1">{label}</p>
      <p className="text-xl font-semibold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-heading)" }}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{sub}</p>}
    </div>
  );
}

function PipelineTab({ targets }: { targets: CampaignTarget[] }) {
  if (targets.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] px-8 py-16 text-center">
        <div className="w-10 h-10 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent)]/20 flex items-center justify-center mx-auto mb-3">
          <Users size={18} className="text-[var(--accent)]" />
        </div>
        <p className="text-sm text-[var(--text-primary)] font-medium mb-1" style={{ fontFamily: "var(--font-heading)" }}>
          No targets yet
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          Targets will appear here once the agent starts discovering contacts
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {PIPELINE_COLUMNS.map(({ status, label, color }) => {
          const colTargets = targets.filter((t) => t.status === status);
          return (
            <div key={status} className="w-56 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold ${color}`}>{label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                  {colTargets.length}
                </span>
              </div>
              <div className="space-y-2">
                {colTargets.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-card)] p-3"
                  >
                    <p className="text-xs font-medium text-[var(--text-primary)] truncate">{t.fullName}</p>
                    {t.title && (
                      <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">{t.title}</p>
                    )}
                    {t.company && (
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">{t.company}</p>
                    )}
                    {t.relevanceScore != null && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="flex-1 h-1 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                          <div
                            className="h-full bg-[var(--accent)] rounded-full"
                            style={{ width: `${Math.round(t.relevanceScore * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          {Math.round(t.relevanceScore * 100)}%
                        </span>
                      </div>
                    )}
                    {t.selectedAngle && (
                      <p className="text-[10px] text-[var(--text-secondary)] mt-1.5 line-clamp-2 italic">
                        {t.selectedAngle}
                      </p>
                    )}
                  </div>
                ))}
                {colTargets.length === 0 && (
                  <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] px-3 py-5 text-center">
                    <p className="text-[11px] text-[var(--text-secondary)]">Empty</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityTab({ logs }: { logs: AgentLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] px-8 py-16 text-center">
        <div className="w-10 h-10 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent)]/20 flex items-center justify-center mx-auto mb-3">
          <Bot size={18} className="text-[var(--accent)]" />
        </div>
        <p className="text-sm text-[var(--text-primary)] font-medium mb-1" style={{ fontFamily: "var(--font-heading)" }}>
          No activity yet
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          Agent decisions and actions will be logged here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div
          key={log.id}
          className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] p-4"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20">
                {log.action}
              </span>
              {log.model && (
                <span className="text-[10px] text-[var(--text-secondary)]">{log.model}</span>
              )}
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] shrink-0">
              {format(new Date(log.createdAt), "MMM d, h:mm a")}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{log.reasoning}</p>
          {log.tokensUsed != null && (
            <p className="text-[10px] text-[var(--text-secondary)]/60 mt-1.5">{log.tokensUsed} tokens</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CampaignDetail({ campaign: initial }: { campaign: CampaignFull }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState(initial);
  const [tab, setTab] = useState<"pipeline" | "activity" | "settings">("pipeline");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const canActivate = campaign.status === "DRAFT" || campaign.status === "PAUSED";
  const canPause = campaign.status === "ACTIVE";
  const canEdit = campaign.status === "DRAFT" || campaign.status === "PAUSED";

  const doAction = async (endpoint: string) => {
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/${endpoint}`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Action failed");
      }
      const updated = await res.json();
      setCampaign((prev) => ({ ...prev, ...updated }));
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const replyPct = campaign.totalContacted > 0
    ? Math.round((campaign.totalReplies / campaign.totalContacted) * 100)
    : 0;
  const meetingPct = campaign.totalContacted > 0
    ? Math.round((campaign.totalMeetings / campaign.totalContacted) * 100)
    : 0;

  const tabs = [
    { id: "pipeline" as const, label: "Pipeline", icon: Users },
    { id: "activity" as const, label: "Activity", icon: Bot },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1
              className="text-xl font-semibold text-[var(--text-primary)] truncate"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {campaign.name}
            </h1>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border shrink-0 ${STATUS_STYLES[campaign.status]}`}>
              {campaign.status.charAt(0) + campaign.status.slice(1).toLowerCase()}
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] truncate">{campaign.goal}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && (
            <Link
              href={`/dashboard/campaigns/${campaign.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Edit2 size={13} />
              Edit
            </Link>
          )}
          {canPause && (
            <button
              onClick={() => doAction("pause")}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--warning)]/30 text-xs text-[var(--warning)] hover:bg-[var(--warning)]/10 transition-colors disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Pause size={13} />}
              Pause
            </button>
          )}
          {canActivate && (
            <button
              onClick={() => doAction("activate")}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)] text-xs font-medium transition-colors disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              Activate
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-sm)] border border-[var(--danger)]/30 bg-[var(--danger)]/5 text-sm text-[var(--danger)]">
          <AlertTriangle size={14} />
          {actionError}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Contacted" value={campaign.totalContacted} />
        <MetricCard label="Replies" value={campaign.totalReplies} sub={`${replyPct}% reply rate`} />
        <MetricCard label="Meetings" value={campaign.totalMeetings} sub={`${meetingPct}% meeting rate`} />
        <MetricCard
          label="Targets"
          value={campaign.campaignTargets.length}
          sub={`${campaign.approvalMode.toLowerCase()} mode`}
        />
      </div>

      {/* Tabs */}
      <div>
        <div className="flex items-center gap-1 border-b border-[var(--border)] mb-5">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  active ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon size={14} />
                {label}
                {active && (
                  <motion.div
                    layoutId="detail-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]"
                  />
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
          >
            {tab === "pipeline" && <PipelineTab targets={campaign.campaignTargets} />}
            {tab === "activity" && <ActivityTab logs={campaign.agentLogs} />}
            {tab === "settings" && (
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] p-6 space-y-4">
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {[
                    { label: "Industry", value: campaign.industry },
                    { label: "Channel", value: campaign.preferredChannel },
                    { label: "Max / Day", value: campaign.maxOutreachPerDay },
                    { label: "Follow-up After", value: `${campaign.followUpAfterDays} days` },
                    { label: "Max Follow-ups", value: campaign.maxFollowUps },
                    { label: "Daily Credits", value: campaign.dailyBudgetCredits },
                    { label: "Prefer Alumni", value: campaign.preferAlumni ? "Yes" : "No" },
                    { label: "Mode", value: campaign.approvalMode.toLowerCase() },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[11px] text-[var(--text-secondary)] mb-0.5">{label}</p>
                      <p className="text-sm text-[var(--text-primary)] capitalize">{String(value)}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-[var(--border)]">
                  <p className="text-[11px] text-[var(--text-secondary)] mb-2">Target Companies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {campaign.targetCompanies.map((c) => (
                      <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--text-secondary)] mb-2">Target Roles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {campaign.targetRoles.map((r) => (
                      <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                {canEdit && (
                  <div className="pt-3 border-t border-[var(--border)]">
                    <Link
                      href={`/dashboard/campaigns/${campaign.id}/edit`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <Edit2 size={12} />
                      Edit Campaign Settings
                    </Link>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
