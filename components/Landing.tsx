"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--accent)]"
            aria-hidden
          />
          <span className="font-semibold tracking-tight text-[var(--text)]">
            CENTCOM · Threat COP
          </span>
          <span className="text-[11px] uppercase tracking-[0.16em] font-mono text-[var(--text-faint)]">
            Military UX
          </span>
        </div>
        <div className="flex gap-2">
          <SignInButton mode="modal">
            <button className="px-3 py-1.5 text-sm rounded-[var(--radius)] border border-[var(--border-strong)] text-[var(--text)] hover:bg-[var(--bg-hover)]">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="px-3 py-1.5 text-sm rounded-[var(--radius)] bg-[var(--accent-dim)] text-[#0b0f14] font-semibold hover:bg-[var(--accent)]">
              Request access
            </button>
          </SignUpButton>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-3xl mx-auto text-center gap-8">
        <p className="text-[11px] uppercase tracking-[0.18em] font-mono text-[var(--accent)]">
          CENTCOM · Threat COP · Military UX
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance text-[var(--text)]">
          Global threat situations on one screen
        </h1>
        <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-xl text-pretty">
          Live open-source feeds (USGS, GDACS, NASA EONET, UN peace/security),
          Operational Briefing from X, and theater COP layers — map, prioritized
          feed, and sourced detail. Sensitive operational use. Not an emergency
          notification system.
        </p>
        <ul className="grid sm:grid-cols-3 gap-4 w-full text-left text-sm">
          {[
            {
              t: "Threat picture",
              d: "Ranked events with threat severity, confidence, and source links.",
            },
            {
              t: "Theaters & hazards",
              d: "Strategic baselines plus real multi-hazard and seismic feeds.",
            },
            {
              t: "Attention order",
              d: "Explainable priority scoring — no predictive kill-chain claims.",
            },
          ].map((item) => (
            <li
              key={item.t}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-panel)] p-4"
            >
              <p className="font-semibold text-[var(--text)] mb-1">{item.t}</p>
              <p className="text-[var(--text-muted)] text-sm">{item.d}</p>
            </li>
          ))}
        </ul>
        <SignInButton mode="modal">
          <button className="px-6 py-3 rounded-[var(--radius)] bg-[var(--accent-dim)] text-[#0b0f14] font-semibold text-base hover:bg-[var(--accent)]">
            Sign in to open the console
          </button>
        </SignInButton>
        <p className="text-xs text-[var(--text-faint)] max-w-md">
          Sensitive. Open-source public data only. System-generated summaries
          are never presented as verified intelligence facts. Inspect original
          sources.
        </p>
      </main>
    </div>
  );
}
