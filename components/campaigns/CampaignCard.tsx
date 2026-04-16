"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Target, Users, MessageSquare, Calendar, ChevronRight } from "lucide-react";
import type { Campaign, CampaignStatus } from "@prisma/client";

type CampaignWithCount = Campaign & { _count: { campaignTargets: number } };

const STATUS_STYLES: Record<CampaignStatus, string> = {
  DRAFT: "text-[var(--text-secondary)] bg-[var(--bg-hover)] border-[var(--border)]",
  ACTIVE: "text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/20",
  PAUSED: "text-[var(--warning)] bg-[var(--warning)]/10 border-[var(--warning)]/20",
  COMPLETED: "text-[var(--accent)] bg-[var(--accent-subtle)] border-[var(--accent)]/20",
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
};

export default function CampaignCard({ campaign }: { campaign: CampaignWithCount }) {
  const replyPct = campaign.totalContacted > 0
    ? Math.round((campaign.totalReplies / campaign.totalContacted) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
    >
      <Link
        href={`/dashboard/campaigns/${campaign.id}`}
        className="block rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] p-5 hover:border-[var(--accent)]/30 hover:bg-[var(--bg-hover)] transition-all duration-150 group"
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3
              className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {campaign.name}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">{campaign.goal}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[campaign.status]}`}>
              {STATUS_LABELS[campaign.status]}
            </span>
            <ChevronRight size={14} className="text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors" />
          </div>
        </div>

        {/* Industry + target count */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20">
            {campaign.industry}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
            <Target size={10} />
            {campaign._count.campaignTargets} targets
          </span>
        </div>

        {/* Target companies */}
        {campaign.targetCompanies.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {campaign.targetCompanies.slice(0, 3).map((co) => (
              <span
                key={co}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]"
              >
                {co}
              </span>
            ))}
            {campaign.targetCompanies.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]">
                +{campaign.targetCompanies.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--border)]">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[var(--text-secondary)]">
              <Users size={10} />
              <span className="text-[10px]">Contacted</span>
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">{campaign.totalContacted}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[var(--text-secondary)]">
              <MessageSquare size={10} />
              <span className="text-[10px]">Replies</span>
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {campaign.totalReplies}
              {campaign.totalContacted > 0 && (
                <span className="text-[10px] text-[var(--text-secondary)] font-normal ml-1">
                  ({replyPct}%)
                </span>
              )}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[var(--text-secondary)]">
              <Calendar size={10} />
              <span className="text-[10px]">Meetings</span>
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">{campaign.totalMeetings}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
