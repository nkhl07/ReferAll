"use client";

import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";

export default function SignInButton({ large }: { large?: boolean }) {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className={`flex items-center gap-2 font-medium transition-colors rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)] ${
        large ? "px-6 py-3 text-base" : "px-4 py-2 text-sm"
      }`}
    >
      <LogIn size={large ? 16 : 14} />
      Sign in with Google
    </button>
  );
}
