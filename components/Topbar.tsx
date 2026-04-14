"use client";

import { useSession, signOut } from "next-auth/react";
import { Settings, LogOut, PenSquare } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";

export default function Topbar({ title }: { title?: string }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="h-14 border-b border-[var(--border)] flex items-center justify-between px-6 bg-[var(--bg-secondary)] sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {title && (
          <h1
            className="text-base font-semibold text-[var(--text-primary)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/compose"
          className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)] text-sm font-medium transition-colors duration-150"
        >
          <PenSquare size={14} />
          <span>Compose</span>
        </Link>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-[var(--bg-hover)] transition-colors"
          >
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={30}
                height={30}
                className="rounded-full ring-1 ring-[var(--border)]"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] text-sm font-semibold">
                {session?.user?.name?.[0] ?? "U"}
              </div>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-10 w-52 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--border)] shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {session?.user?.name ?? "User"}
                </p>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  {session?.user?.email ?? ""}
                </p>
              </div>
              <div className="py-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <Settings size={15} />
                  Settings
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--danger)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
