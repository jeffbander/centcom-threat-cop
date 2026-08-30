"use client";

import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { CentcomSeal } from "./CentcomSeal";

/**
 * Official-style access gate. Presentation branding only — not a DoD trademark.
 */
export function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-[#071018] text-[var(--text)]">
      <div className="bg-[#5c1a1a] text-[#ffcccc] text-center text-[10px] sm:text-xs font-bold uppercase tracking-[0.22em] py-1.5 border-b border-[#8a2a2a]">
        Unclassified // For Official Use Only
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <CentcomSeal size={128} className="mb-6" />

        <p className="text-[11px] uppercase tracking-[0.28em] text-[#c9a227] font-mono mb-2">
          United States Central Command
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-center text-[#f2efe8] tracking-tight mb-6">
          Threat Common Operating Picture
        </h1>

        <p className="text-center text-sm text-[#b8c0ca] max-w-lg mb-8 leading-relaxed">
          This is a U.S. Government information system. Use of this system
          constitutes consent to monitoring. Unauthorized access is prohibited
          and may result in administrative, civil, or criminal penalties.
        </p>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <SignInButton mode="modal">
            <button
              type="button"
              className="w-full py-3 px-6 font-semibold uppercase tracking-[0.14em] text-sm
                bg-[#c9a227] text-[#0a0a08] border border-[#d4b84a]
                hover:bg-[#d4b84a] focus-visible:outline focus-visible:outline-2
                focus-visible:outline-offset-2 focus-visible:outline-[#f5e6a8]"
            >
              Sign in
            </button>
          </SignInButton>
          <Link
            href="/waitlist"
            className="block w-full py-2.5 px-6 text-center text-xs font-mono uppercase tracking-[0.12em]
              border border-[#3d4a58] text-[#c5cdd6] hover:bg-[#0e1822]
              focus-visible:outline focus-visible:outline-2
              focus-visible:outline-offset-2 focus-visible:outline-[#c9a227]"
          >
            Request access
          </Link>
        </div>
      </main>

      <div className="bg-[#5c1a1a] text-[#ffcccc] text-center text-[10px] font-bold uppercase tracking-[0.22em] py-1.5 border-t border-[#8a2a2a]">
        Unclassified // For Official Use Only
      </div>
    </div>
  );
}
