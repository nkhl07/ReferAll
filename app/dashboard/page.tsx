import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Topbar from "@/components/Topbar";
import MeetingCard from "@/components/dashboard/MeetingCard";
import StatCards from "@/components/dashboard/StatCards";
import FollowUpCard from "@/components/dashboard/FollowUpCard";
import { format, isAfter } from "date-fns";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const userId = session.user.id;

  const [meetings, emails, followUps, totalEmails] = await Promise.all([
    prisma.meeting.findMany({
      where: { userId, status: "scheduled", dateTime: { gte: new Date() } },
      include: { contact: true },
      orderBy: { dateTime: "asc" },
      take: 10,
    }),
    prisma.email.findMany({
      where: { userId, sentAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { id: true, repliedAt: true },
    }),
    prisma.followUp.findMany({
      where: {
        email: { userId },
        status: "pending",
      },
      include: {
        email: { include: { contact: true } },
      },
      orderBy: { scheduledDate: "asc" },
      take: 10,
    }),
    prisma.email.count({ where: { userId } }),
  ]);

  const weekMeetings = await prisma.meeting.count({
    where: { userId, status: "scheduled", dateTime: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  });

  const weekEmails = emails.length;
  const replied = emails.filter((e) => e.repliedAt).length;
  const responseRate = weekEmails > 0 ? Math.round((replied / weekEmails) * 100) : 0;

  const stats = {
    emailsSent: weekEmails,
    meetingsScheduled: weekMeetings,
    followUpsPending: followUps.length,
    responseRate,
  };

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Dashboard" />
      <main className="flex-1 px-6 py-6 space-y-8 max-w-5xl mx-auto w-full">
        {/* Stats row */}
        <StatCards stats={stats} />

        {/* Upcoming meetings */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Upcoming Meetings
            </h2>
            <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] px-2.5 py-1 rounded-full border border-[var(--border)]">
              {meetings.length} scheduled
            </span>
          </div>

          {meetings.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] px-6 py-10 text-center">
              <p className="text-[var(--text-secondary)] text-sm">No upcoming meetings. Start by composing an outreach email.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {meetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          )}
        </section>

        {/* Pending follow-ups */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Pending Follow-Ups
            </h2>
            {followUps.length > 0 && (
              <span className="text-xs text-[var(--warning)] bg-[var(--warning)]/10 px-2.5 py-1 rounded-full border border-[var(--warning)]/20">
                {followUps.length} pending review
              </span>
            )}
          </div>

          {followUps.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] px-6 py-10 text-center">
              <p className="text-[var(--text-secondary)] text-sm">No pending follow-ups. Great job staying on top of your outreach!</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {followUps.map((fu) => (
                <FollowUpCard key={fu.id} followUp={fu} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
