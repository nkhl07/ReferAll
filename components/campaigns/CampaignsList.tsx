"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target } from "lucide-react";
import type { Campaign, CampaignStatus } from "@prisma/client";
import CampaignCard from "./CampaignCard";

type CampaignWithCount = Campaign & { _count: { campaignTargets: number } };

const TABS: { label: string; value: CampaignStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Draft", value: "DRAFT" },
  { label: "Paused", value: "PAUSED" },
  { label: "Completed", value: "COMPLETED" },
];

export default function CampaignsList({ campaigns }: { campaigns: CampaignWithCount[] }) {
  const [activeTab, setActiveTab] = useState<CampaignStatus | "ALL">("ALL");

  const filtered = activeTab === "ALL" ? campaigns : campaigns.filter((c) => c.status === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-heading)" }}>
            Your Campaigns
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)] text-sm font-medium transition-colors duration-150"
        >
          <Plus size={16} />
          New Campaign
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border)]">
        {TABS.map((tab) => {
          const count = tab.value === "ALL" ? campaigns.length : campaigns.filter((c) => c.status === tab.value).length;
          const active = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`relative px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                active ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  active ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : "bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                }`}>
                  {count}
                </span>
              )}
              {active && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] px-8 py-16 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent)]/20 flex items-center justify-center mx-auto mb-4">
              <Target size={24} className="text-[var(--accent)]" />
            </div>
            <p className="text-[var(--text-primary)] font-medium mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              {activeTab === "ALL" ? "No campaigns yet" : `No ${activeTab.toLowerCase()} campaigns`}
            </p>
            <p className="text-sm text-[var(--text-secondary)] mb-5">
              {activeTab === "ALL"
                ? "Create your first campaign to start automating outreach"
                : "Switch to a different filter to see other campaigns"}
            </p>
            {activeTab === "ALL" && (
              <Link
                href="/dashboard/campaigns/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)] text-sm font-medium transition-colors"
              >
                <Plus size={15} />
                Create Campaign
              </Link>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
