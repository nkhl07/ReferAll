"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Save, UserCircle, Target, LinkIcon, CheckCircle2, Video, Loader2, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import type { User as PrismaUser } from "@prisma/client";

// Brand icons as inline SVGs
function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function MicrosoftIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022" />
      <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00" />
      <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF" />
      <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900" />
    </svg>
  );
}

function ZoomIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#2D8CFF">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 13.5l-3-2.1V15c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1V9c0-.55.45-1 1-1h5.5c.55 0 1 .45 1 1v1.6l3-2.1c.31-.22.72 0 .72.38v5.25c0 .37-.41.59-.72.37z" />
    </svg>
  );
}

function TeamsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#5059C9">
      <path d="M19.5 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm1.5 1h-3a1 1 0 0 0-1 1v4.5a3.5 3.5 0 0 0 5 3.17V10.5a1 1 0 0 0-1-1zM12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm4 8H8a2 2 0 0 0-2 2v5a5 5 0 0 0 10 0v-5a2 2 0 0 0-2-2z" />
    </svg>
  );
}

export default function SettingsForm({
  user,
  connectedProviders,
  apolloConfigured,
  apolloCreditsToday,
}: {
  user: PrismaUser;
  connectedProviders: string[];
  apolloConfigured: boolean;
  apolloCreditsToday: number;
}) {
  const [form, setForm] = useState({
    name: user.name ?? "",
    bio: user.bio ?? "",
    resume: user.resume ?? "",
    targetCompanies: user.targetCompanies ?? "",
    targetRoles: user.targetRoles ?? "",
    targetSectors: user.targetSectors ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apolloTesting, setApolloTesting] = useState(false);
  const [apolloStatus, setApolloStatus] = useState<"idle" | "ok" | "error">("idle");

  const handleTestApollo = async () => {
    setApolloTesting(true);
    setApolloStatus("idle");
    try {
      const res = await fetch("/api/apollo/status", { method: "POST" });
      const data = await res.json();
      setApolloStatus(data.connected ? "ok" : "error");
    } catch {
      setApolloStatus("error");
    } finally {
      setApolloTesting(false);
    }
  };

  const [activeEmailProvider, setActiveEmailProvider] = useState<string | null>(
    user.emailProvider ?? null
  );
  const [activeMeetingProvider, setActiveMeetingProvider] = useState<string | null>(
    user.meetingProvider ?? null
  );
  const [switchConfirm, setSwitchConfirm] = useState<string | null>(null);

  const isGoogleConnected = connectedProviders.includes("google");
  const isMicrosoftConnected = connectedProviders.includes("microsoft-entra-id");
  const isZoomConnected = connectedProviders.includes("zoom");

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const setEmailProvider = async (provider: string) => {
    await fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailProvider: provider }),
    });
    setActiveEmailProvider(provider);
  };

  const setMeetingProvider = async (provider: string) => {
    await fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingProvider: provider }),
    });
    setActiveMeetingProvider(provider);
  };

  const handleEmailProviderSwitch = (provider: string) => {
    if (activeEmailProvider && activeEmailProvider !== provider) {
      setSwitchConfirm(provider);
    } else {
      setEmailProvider(provider);
    }
  };

  const confirmSwitch = () => {
    if (switchConfirm) {
      setEmailProvider(switchConfirm);
      setSwitchConfirm(null);
    }
  };

  const Section = ({
    title,
    icon: Icon,
    children,
  }: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
  }) => (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--border)]">
        <Icon size={16} className="text-[var(--accent)]" />
        <h2
          className="text-sm font-semibold text-[var(--text-primary)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {title}
        </h2>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );

  const Field = ({
    label,
    name,
    multiline,
    placeholder,
    hint,
  }: {
    label: string;
    name: keyof typeof form;
    multiline?: boolean;
    placeholder?: string;
    hint?: string;
  }) => (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={form[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          placeholder={placeholder}
          rows={5}
          className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 resize-none focus:outline-none focus:border-[var(--accent)]/60 transition-colors"
        />
      ) : (
        <input
          type="text"
          value={form[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          placeholder={placeholder}
          className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]/60 transition-colors"
        />
      )}
      {hint && <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Switch confirmation dialog */}
      {switchConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] p-6 max-w-sm w-full mx-4 space-y-4">
            <h3
              className="text-base font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Switch email provider?
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              This will switch your email provider from{" "}
              <span className="text-[var(--text-primary)]">
                {activeEmailProvider === "google" ? "Gmail" : "Outlook"}
              </span>{" "}
              to{" "}
              <span className="text-[var(--text-primary)]">
                {switchConfirm === "google" ? "Gmail" : "Outlook"}
              </span>
              . Emails and calendar will use the new provider going forward.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSwitchConfirm(null)}
                className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSwitch}
                className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] transition-colors"
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile */}
      <Section title="Your Profile" icon={UserCircle}>
        <Field label="Full Name" name="name" placeholder="Alex Chen" />
        <Field
          label="Personal Bio"
          name="bio"
          multiline
          placeholder="Brief description of who you are — used to personalize outreach emails."
          hint="Tip: Include your school, major, year, and interests. This is used in AI email generation."
        />
        <Field
          label="Resume / Background"
          name="resume"
          multiline
          placeholder="Paste your resume text here (plain text works best)."
          hint="The AI uses this to find shared experiences with your contacts."
        />
      </Section>

      {/* Targeting */}
      <Section title="Targeting Preferences" icon={Target}>
        <Field
          label="Target Companies"
          name="targetCompanies"
          placeholder="Stripe, Figma, Anthropic, Scale AI"
          hint="Comma-separated list of companies you're interested in."
        />
        <Field
          label="Target Roles"
          name="targetRoles"
          placeholder="Software Engineer Intern, Product Engineer Intern"
          hint="Comma-separated list of roles you're applying for."
        />
        <Field
          label="Target Sectors"
          name="targetSectors"
          placeholder="Fintech, AI/ML, Developer Tools"
          hint="Comma-separated list of sectors you're focused on."
        />
      </Section>

      {/* Email & Calendar Provider */}
      <Section title="Email & Calendar Provider" icon={LinkIcon}>
        <p className="text-xs text-[var(--text-secondary)] -mt-1">
          Choose which account to use for sending emails and reading your calendar. Only one can be
          active at a time.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ProviderCard
            icon={<GoogleIcon size={20} />}
            name="Google"
            description="Gmail + Google Calendar"
            connected={isGoogleConnected}
            active={activeEmailProvider === "google"}
            onConnect={() => signIn("google", { callbackUrl: "/dashboard/settings" })}
            onSetActive={() => handleEmailProviderSwitch("google")}
          />
          <ProviderCard
            icon={<MicrosoftIcon size={20} />}
            name="Microsoft"
            description="Outlook + Microsoft Calendar"
            connected={isMicrosoftConnected}
            active={activeEmailProvider === "microsoft-entra-id"}
            onConnect={() =>
              signIn("microsoft-entra-id", { callbackUrl: "/dashboard/settings" })
            }
            onSetActive={() => handleEmailProviderSwitch("microsoft-entra-id")}
          />
        </div>
      </Section>

      {/* Video Meetings */}
      <Section title="Video Meetings" icon={Video}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ProviderCard
            icon={<ZoomIcon size={20} />}
            name="Zoom"
            description="Auto-create Zoom links for meetings"
            connected={isZoomConnected}
            active={activeMeetingProvider === "zoom"}
            onConnect={() => window.open("/api/auth/signin?provider=zoom", "_blank")}
            onSetActive={() => setMeetingProvider("zoom")}
          />
          <ProviderCard
            icon={<TeamsIcon size={20} />}
            name="Microsoft Teams"
            description="Auto-create Teams links for meetings"
            connected={isMicrosoftConnected}
            active={activeMeetingProvider === "teams"}
            badge={isMicrosoftConnected ? "Included with Microsoft" : undefined}
            onConnect={() =>
              signIn("microsoft-entra-id", { callbackUrl: "/dashboard/settings" })
            }
            onSetActive={() => setMeetingProvider("teams")}
          />
        </div>
      </Section>

      {/* Apollo */}
      <Section title="Apollo.io" icon={ExternalLink}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">People Search API</span>
              {apolloConfigured ? (
                <span className="flex items-center gap-1 text-xs text-[var(--success)]">
                  <CheckCircle size={12} /> Configured
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-[var(--danger)]">
                  <XCircle size={12} /> Not configured
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {apolloConfigured
                ? `Credits used today: ${apolloCreditsToday} / 50`
                : "Add APOLLO_API_KEY to your .env to enable people search."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {apolloConfigured && (
              <button
                onClick={handleTestApollo}
                disabled={apolloTesting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-60 transition-colors"
              >
                {apolloTesting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : apolloStatus === "ok" ? (
                  <CheckCircle size={12} className="text-[var(--success)]" />
                ) : apolloStatus === "error" ? (
                  <XCircle size={12} className="text-[var(--danger)]" />
                ) : null}
                {apolloStatus === "ok" ? "Connected" : apolloStatus === "error" ? "Failed" : "Test Connection"}
              </button>
            )}
            <a
              href="https://app.apollo.io/#/settings/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium bg-[var(--accent-subtle)] border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
            >
              Get API key <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </Section>

      {/* Save button */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-[var(--success)]">
            <CheckCircle2 size={15} />
            Saved!
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)] text-sm font-medium transition-colors disabled:opacity-60"
        >
          <Save size={14} />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function ProviderCard({
  icon,
  name,
  description,
  connected,
  active,
  badge,
  onConnect,
  onSetActive,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  connected: boolean;
  active: boolean;
  badge?: string;
  onConnect: () => void;
  onSetActive: () => void;
}) {
  const borderColor = active
    ? "border-[var(--accent)]/60"
    : connected
    ? "border-[var(--border)]"
    : "border-[var(--border)]";

  return (
    <div
      className={`rounded-[var(--radius-md)] border bg-[var(--bg-primary)] p-4 flex flex-col gap-3 transition-colors ${borderColor}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {icon}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">{name}</span>
              {active && (
                <span className="flex items-center gap-1 text-xs text-[var(--success)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] inline-block" />
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">{description}</p>
          </div>
        </div>
      </div>

      {badge && (
        <span className="self-start px-2 py-0.5 rounded-full text-xs bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20">
          {badge}
        </span>
      )}

      <div className="flex gap-2">
        {!connected ? (
          <button
            onClick={onConnect}
            className="flex-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium bg-[var(--accent-subtle)] border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
          >
            Connect
          </button>
        ) : active ? (
          <span className="flex-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium text-center text-[var(--text-secondary)] border border-[var(--border)]">
            In use
          </span>
        ) : (
          <button
            onClick={onSetActive}
            className="flex-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium bg-[var(--accent-subtle)] border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
          >
            Set as active
          </button>
        )}
      </div>
    </div>
  );
}
