import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Topbar from "@/components/Topbar";
import EmailComposer from "@/components/compose/EmailComposer";

export default async function ComposePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [contacts, user] = await Promise.all([
    prisma.contact.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        role: true,
        sector: true,
        workDescription: true,
        linkedinSummary: true,
        sharedExperiences: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, bio: true, resume: true, targetRoles: true, targetSectors: true },
    }),
  ]);

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Compose Email" />
      <main className="flex-1 overflow-hidden">
        <EmailComposer contacts={contacts} user={user} />
      </main>
    </div>
  );
}
