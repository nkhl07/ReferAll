"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Send, Settings, X, Menu, Search, PenSquare, Target } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Target },
  { href: "/dashboard/find", label: "Find People", icon: Search },
  { href: "/dashboard/compose", label: "Compose Email", icon: PenSquare },
  { href: "/dashboard/sent", label: "Sent Emails", icon: Send },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 w-56 flex flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--border)]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center">
              <span className="text-[var(--bg-primary)] font-bold text-sm" style={{ fontFamily: "var(--font-heading)" }}>R</span>
            </div>
            <span
              className="text-white font-semibold text-lg tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              ReferrAll
            </span>
          </Link>
        </div>

        <nav className="flex flex-col gap-1 px-3 mt-4">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-150 group ${
                  active
                    ? "bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <Icon
                  size={18}
                  className={`shrink-0 ${active ? "text-[var(--accent)]" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"}`}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-3 pb-4">
          <div className="rounded-[var(--radius-sm)] bg-[var(--accent-subtle)] border border-[var(--accent)]/20 p-3">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              <span className="text-[var(--accent)] font-medium">Tip:</span> Use the composer to send AI-personalized outreach emails.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
