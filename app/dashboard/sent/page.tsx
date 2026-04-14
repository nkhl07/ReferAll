import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Topbar from "@/components/Topbar";
import SentEmailsList from "@/components/sent/SentEmailsList";

export default async function SentEmailsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const emails = await prisma.email.findMany({
    where: { userId: session.user.id, sentAt: { not: null } },
    include: { contact: true, followUps: true },
    orderBy: { sentAt: "desc" },
  });

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Sent Emails" />
      <main className="flex-1 px-6 py-6 max-w-5xl mx-auto w-full">
        <SentEmailsList emails={emails} />
      </main>
    </div>
  );
}
