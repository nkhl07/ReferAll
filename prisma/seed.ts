import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@referrall.com" },
    update: {},
    create: {
      email: "demo@referrall.com",
      name: "Alex Chen",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
      bio: "Junior at UC Berkeley studying CS. Interested in fintech, ML infrastructure, and product engineering. Previous internship at a startup.",
      targetCompanies: "Stripe, Figma, Anthropic, Scale AI, Ramp",
      targetRoles: "Software Engineer Intern, Product Engineer Intern",
      targetSectors: "Fintech, AI/ML, Developer Tools",
      resume: `Alex Chen | alex@berkeley.edu | github.com/alexchen
Education: UC Berkeley, B.S. Computer Science, Expected May 2025, GPA 3.8
Experience:
- Software Engineer Intern, TechStart Inc (Summer 2023) — Built REST APIs and React dashboards
- Research Assistant, Berkeley AI Lab (2022-2023) — ML model evaluation
Skills: Python, TypeScript, React, Next.js, PostgreSQL, Machine Learning
Activities: Berkeley Blockchain, HackMIT organizer`,
    },
  });

  // Create contacts
  const contacts = await Promise.all([
    prisma.contact.upsert({
      where: { id: "contact_1" },
      update: {},
      create: {
        id: "contact_1",
        userId: user.id,
        name: "Sarah Kim",
        email: "sarah.kim@stripe.com",
        company: "Stripe",
        role: "Senior Software Engineer",
        sector: "Fintech",
        workDescription:
          "Works on Stripe's payments infrastructure team, specifically on fraud detection systems and real-time transaction processing pipelines.",
        linkedinUrl: "https://linkedin.com/in/sarahkim",
        linkedinSummary:
          "5+ years in fintech. UC Berkeley alum (CS, 2019). Previously at Braintree. Passionate about financial inclusion and scalable payments infrastructure.",
        sharedExperiences: JSON.stringify([
          "UC Berkeley alum",
          "CS major",
          "Interest in fintech",
        ]),
        fitScore: 92,
        status: "meeting_scheduled",
        notes:
          "Very responsive. She mentioned she's happy to chat about the recruiting process at Stripe.",
      },
    }),
    prisma.contact.upsert({
      where: { id: "contact_2" },
      update: {},
      create: {
        id: "contact_2",
        userId: user.id,
        name: "Marcus Johnson",
        email: "marcus@anthropic.com",
        company: "Anthropic",
        role: "Research Engineer",
        sector: "AI/ML",
        workDescription:
          "Works on Constitutional AI and model evaluation frameworks. Part of the team building safety benchmarks for large language models.",
        linkedinUrl: "https://linkedin.com/in/marcusjohnson",
        linkedinSummary:
          "ML researcher turned engineer. MIT PhD dropout. Previously at DeepMind. Focused on AI safety and alignment research.",
        sharedExperiences: JSON.stringify([
          "Interest in AI/ML",
          "Research background",
          "HackMIT connection",
        ]),
        fitScore: 88,
        status: "meeting_scheduled",
        notes: "Met briefly at HackMIT. Very knowledgeable about AI safety.",
      },
    }),
    prisma.contact.upsert({
      where: { id: "contact_3" },
      update: {},
      create: {
        id: "contact_3",
        userId: user.id,
        name: "Priya Patel",
        email: "priya@figma.com",
        company: "Figma",
        role: "Product Engineer",
        sector: "Developer Tools",
        workDescription:
          "Building Figma's plugin ecosystem and developer APIs. Works on the runtime environment that powers third-party plugins.",
        linkedinUrl: "https://linkedin.com/in/priyapatel",
        linkedinSummary:
          "Full-stack engineer with design sensibility. Stanford CS. Previously at Adobe. Loves building tools that empower creators.",
        sharedExperiences: JSON.stringify([
          "Interest in developer tools",
          "Full-stack background",
        ]),
        fitScore: 79,
        status: "contacted",
        notes: "Reached out cold. Waiting for response.",
      },
    }),
    prisma.contact.upsert({
      where: { id: "contact_4" },
      update: {},
      create: {
        id: "contact_4",
        userId: user.id,
        name: "David Wu",
        email: "david.wu@ramp.com",
        company: "Ramp",
        role: "Software Engineer",
        sector: "Fintech",
        workDescription:
          "Works on Ramp's expense management platform. Building automation features that help companies reduce spend through AI-powered insights.",
        linkedinUrl: "https://linkedin.com/in/davidwu",
        linkedinSummary:
          "Early-stage startup veteran. NYU Stern + Columbia Engineering. Previously founded a fintech startup. Now at Ramp building the future of corporate finance.",
        sharedExperiences: JSON.stringify([
          "Startup background",
          "Fintech interest",
        ]),
        fitScore: 84,
        status: "replied",
        notes: "Replied positively. Scheduling a call.",
      },
    }),
    prisma.contact.upsert({
      where: { id: "contact_5" },
      update: {},
      create: {
        id: "contact_5",
        userId: user.id,
        name: "Emma Rodriguez",
        email: "emma@scaleai.com",
        company: "Scale AI",
        role: "ML Infrastructure Engineer",
        sector: "AI/ML",
        workDescription:
          "Builds the data pipeline infrastructure that powers Scale's annotation platform. Works on distributed systems handling millions of labeling tasks daily.",
        linkedinUrl: "https://linkedin.com/in/emmarodriguez",
        linkedinSummary:
          "Infrastructure engineer specializing in ML systems. CMU alumni. Loves Kubernetes, distributed systems, and making ML training faster.",
        sharedExperiences: JSON.stringify([
          "ML background",
          "Interest in AI infrastructure",
        ]),
        fitScore: 76,
        status: "new",
        notes: "",
      },
    }),
  ]);

  // Create meetings
  const now = new Date();
  const meetings = await Promise.all([
    prisma.meeting.upsert({
      where: { id: "meeting_1" },
      update: {},
      create: {
        id: "meeting_1",
        userId: user.id,
        contactId: "contact_1",
        title: "Coffee Chat with Sarah Kim — Stripe",
        dateTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000), // 2 days from now, 3pm
        zoomLink: "https://zoom.us/j/123456789",
        status: "scheduled",
        notes: "Ask about the new grad hiring timeline for 2025.",
      },
    }),
    prisma.meeting.upsert({
      where: { id: "meeting_2" },
      update: {},
      create: {
        id: "meeting_2",
        userId: user.id,
        contactId: "contact_2",
        title: "Coffee Chat with Marcus Johnson — Anthropic",
        dateTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000), // 5 days from now, 4pm
        zoomLink: "https://zoom.us/j/987654321",
        status: "scheduled",
        notes: "Interested in understanding how they evaluate research engineers.",
      },
    }),
    prisma.meeting.upsert({
      where: { id: "meeting_3" },
      update: {},
      create: {
        id: "meeting_3",
        userId: user.id,
        contactId: "contact_4",
        title: "Coffee Chat with David Wu — Ramp",
        dateTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // 10 days from now
        status: "scheduled",
        notes: "",
      },
    }),
  ]);

  // Create sent emails
  const sentDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
  const emails = await Promise.all([
    prisma.email.upsert({
      where: { id: "email_1" },
      update: {},
      create: {
        id: "email_1",
        userId: user.id,
        contactId: "contact_1",
        subject: "Coffee Chat Request — UC Berkeley CS Student",
        body: `Hi Sarah,

I hope this message finds you well! I'm Alex, a junior at UC Berkeley studying Computer Science. I came across your profile and was really inspired by your work on Stripe's payments infrastructure team.

As a fellow Cal alum (Go Bears! 🐻), I'd love to learn about your experience transitioning from college into Stripe's engineering org. I'm particularly curious about the fraud detection work you've been doing.

Would you be open to a 20-minute coffee chat sometime in the next two weeks? I'm flexible and happy to work around your schedule.

Thank you so much for considering it!

Best,
Alex Chen`,
        template: "coffee_chat",
        sentAt: sentDate,
        repliedAt: new Date(sentDate.getTime() + 18 * 60 * 60 * 1000),
      },
    }),
    prisma.email.upsert({
      where: { id: "email_2" },
      update: {},
      create: {
        id: "email_2",
        userId: user.id,
        contactId: "contact_3",
        subject: "Coffee Chat — Interested in Figma's Product Engineering Team",
        body: `Hi Priya,

My name is Alex Chen, and I'm a CS junior at UC Berkeley. I've been following Figma's incredible work on the plugin ecosystem and I'm genuinely fascinated by the engineering challenges involved in building a safe, performant plugin runtime.

I'd love to hear about your experience as a product engineer at Figma — especially how you think about the intersection of developer tooling and user experience.

Any chance you'd be open to a quick 20-minute chat in the next couple weeks?

Thanks so much,
Alex`,
        template: "coffee_chat",
        sentAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.email.upsert({
      where: { id: "email_3" },
      update: {},
      create: {
        id: "email_3",
        userId: user.id,
        contactId: "contact_2",
        subject: "Coffee Chat Request — AI/ML Researcher at Berkeley",
        body: `Hi Marcus,

I'm Alex Chen, a CS junior at Berkeley who's been doing ML research at the Berkeley AI Lab. I had the chance to hear you speak briefly at HackMIT and was really inspired by your perspective on AI safety.

I'm deeply interested in Anthropic's mission and would love to learn more about what it's like working as a research engineer there. Would you have 20 minutes for a coffee chat sometime soon?

Excited to connect,
Alex`,
        template: "coffee_chat",
        sentAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        repliedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  // Create follow-ups
  await prisma.followUp.upsert({
    where: { id: "followup_1" },
    update: {},
    create: {
      id: "followup_1",
      emailId: "email_2",
      followUpNumber: 1,
      status: "pending",
      scheduledDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      body: `Hi Priya,

Just wanted to follow up on my previous message — I'd still love to connect if you have a few minutes to spare. No worries if you're swamped!

Best,
Alex`,
    },
  });

  console.log("✅ Seed complete:", {
    user: user.email,
    contacts: contacts.length,
    meetings: meetings.length,
    emails: emails.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
