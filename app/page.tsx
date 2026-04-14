import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SignInButton from "@/components/SignInButton";
import SessionProvider from "@/components/SessionProvider";
import { Sparkles, Calendar, Mail, BarChart3, ArrowRight, CheckCircle } from "lucide-react";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Emails",
      description: "Claude generates personalized outreach emails by matching your background with each contact.",
    },
    {
      icon: Calendar,
      title: "Calendar Integration",
      description: "Reads your Google Calendar and suggests the best available time slots automatically.",
    },
    {
      icon: Mail,
      title: "Auto Follow-Ups",
      description: "Never drop the ball. The system queues smart follow-ups if you don't hear back in 2 weeks.",
    },
    {
      icon: BarChart3,
      title: "Activity Dashboard",
      description: "Track every email, meeting, and follow-up in one clean, focused view.",
    },
  ];

  const benefits = [
    "Personalized cold emails in seconds",
    "Auto-scheduled follow-ups",
    "Google Calendar availability detection",
    "Zoom link generation",
    "Fit scores for each contact",
    "Full email history per contact",
  ];

  return (
    <SessionProvider>
      <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
        {/* Navbar */}
        <nav className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center">
              <span className="text-[var(--bg-primary)] font-bold text-sm" style={{ fontFamily: "var(--font-heading)" }}>R</span>
            </div>
            <span
              className="text-white font-semibold text-lg"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              ReferrAll
            </span>
          </div>
          <SignInButton />
        </nav>

        {/* Hero */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent)]/20 text-[var(--accent)] text-xs font-medium mb-6">
              <Sparkles size={12} />
              Powered by Claude AI
            </div>

            <h1
              className="text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight mb-6"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Land referrals &amp;{" "}
              <span style={{ color: "var(--accent)" }}>coffee chats</span>
              {" "}on autopilot
            </h1>

            <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed mb-10">
              ReferrAll writes personalized outreach emails, schedules follow-ups, and connects to your calendar — so you can focus on building real relationships.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <SignInButton large />
              <Link
                href="#features"
                className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors"
              >
                See how it works
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Features */}
          <div id="features" className="w-full max-w-4xl mx-auto mt-24">
            <h2
              className="text-2xl font-bold text-white mb-10 text-center"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Everything you need to network smarter
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] p-5 text-left hover:bg-[var(--bg-hover)] hover:border-[var(--accent)]/20 transition-all duration-150"
                >
                  <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--accent-subtle)] border border-[var(--accent)]/20 flex items-center justify-center mb-3">
                    <Icon size={18} className="text-[var(--accent)]" />
                  </div>
                  <h3
                    className="text-sm font-semibold text-white mb-1.5"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {description}
                  </p>
                </div>
              ))}
            </div>

            {/* Benefits list */}
            <div className="mt-12 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-8">
              <h3
                className="text-lg font-semibold text-white mb-5 text-center"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                What&apos;s included
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {benefits.map((b) => (
                  <div key={b} className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                    <CheckCircle size={15} className="text-[var(--success)] shrink-0" />
                    {b}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-[var(--border)] px-6 py-4 text-center">
          <p className="text-xs text-[var(--text-secondary)]">
            © 2024 ReferrAll. Built for ambitious students.
          </p>
        </footer>
      </div>
    </SessionProvider>
  );
}
