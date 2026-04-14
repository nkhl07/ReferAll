import Sidebar from "@/components/Sidebar";
import SessionProvider from "@/components/SessionProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
        <Sidebar />
        {/* Main area — offset by sidebar width on desktop */}
        <div className="flex-1 flex flex-col min-w-0 md:ml-56 overflow-auto">
          {children}
        </div>
      </div>
    </SessionProvider>
  );
}
