"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CentcomSeal } from "@/components/CentcomSeal";
import { CLEARANCE_ATTESTATION } from "@/lib/clearanceNotice";
import { submitAccessRequest, type AccessRequestState } from "./actions";

const INITIAL: AccessRequestState | null = null;

export default function WaitlistPage() {
  const [state, action, pending] = useActionState(submitAccessRequest, INITIAL);

  return (
    <div className="min-h-screen flex flex-col bg-[#071018] text-[var(--text)]">
      <div className="bg-[#5c1a1a] text-[#ffcccc] text-center text-[10px] sm:text-xs font-bold uppercase tracking-[0.22em] py-1.5 border-b border-[#8a2a2a]">
        Unclassified // For Official Use Only
      </div>

      <main className="flex-1 flex flex-col items-center px-6 py-10">
        <CentcomSeal size={88} className="mb-4" />
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#c9a227] font-mono mb-2">
          United States Central Command
        </p>
        <h1 className="text-2xl font-semibold text-center text-[#f2efe8] tracking-tight mb-2">
          Request access
        </h1>
        <p className="text-center text-sm text-[#b8c0ca] max-w-lg mb-8 leading-relaxed">
          Anybody may submit a request. You cannot sign in until an administrator
          approves you in Clerk.
        </p>

        <section className="w-full max-w-lg border border-[#3d4a58] bg-[#0a121a] p-5 mb-6">
          <h2 className="text-[11px] uppercase tracking-[0.16em] font-mono text-[#c9a227] mb-3">
            {CLEARANCE_ATTESTATION.title}
          </h2>
          <p className="text-sm text-[#c5cdd6] mb-3 leading-relaxed">
            {CLEARANCE_ATTESTATION.lead}
          </p>
          <ul className="list-disc pl-5 text-sm text-[#c5cdd6] space-y-2 mb-4 leading-relaxed">
            {CLEARANCE_ATTESTATION.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <form action={action} className="w-full max-w-lg flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[11px] uppercase tracking-[0.14em] font-mono text-[#c9a227]">
              Work email
            </span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="px-3 py-2.5 bg-[#071018] border border-[#3d4a58] text-[#f2efe8] placeholder:text-[#6b7785]"
              placeholder="first.last@agency.gov"
            />
          </label>
          <label className="flex items-start gap-2.5 text-sm text-[#c5cdd6] leading-snug cursor-pointer">
            <input
              type="checkbox"
              name="attested"
              required
              className="mt-1 accent-[#c9a227]"
            />
            <span>{CLEARANCE_ATTESTATION.checkbox}</span>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 px-6 font-semibold uppercase tracking-[0.14em] text-sm
              bg-[#c9a227] text-[#0a0a08] border border-[#d4b84a]
              hover:bg-[#d4b84a] disabled:opacity-50"
          >
            {pending ? "Submitting…" : "Submit access request"}
          </button>
          {state && (
            <p
              className={`text-sm leading-relaxed ${
                state.ok ? "text-[var(--ok)]" : "text-[var(--critical)]"
              }`}
              role={state.ok ? "status" : "alert"}
            >
              {state.message}
            </p>
          )}
        </form>

        <p className="mt-8 text-xs text-[#8a9bb0]">
          Already approved?{" "}
          <Link href="/sign-in" className="text-[#c9a227] hover:underline">
            Sign in
          </Link>
        </p>
      </main>

      <div className="bg-[#5c1a1a] text-[#ffcccc] text-center text-[10px] font-bold uppercase tracking-[0.22em] py-1.5 border-t border-[#8a2a2a]">
        Unclassified // For Official Use Only
      </div>
    </div>
  );
}
