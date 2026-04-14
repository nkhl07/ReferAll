import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReferrAll — Smart Coffee Chat & Referral Outreach",
  description:
    "Automate your outreach, schedule coffee chats, and land referrals with AI-powered personalized emails.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full min-h-screen" style={{ background: "var(--bg-primary)" }} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
