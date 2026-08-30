"use client";

import Link from "next/link";
import { AorGuide } from "./AorGuide";
import { FilterRail } from "./FilterRail";
import { useDashboard } from "./DashboardContext";

export function CopSettingsPanel() {
  const { settingsOpen, setSettingsOpen } = useDashboard();
  if (!settingsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cop-settings-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close settings"
        onClick={() => setSettingsOpen(false)}
      />
      <aside className="relative w-full max-w-md h-full bg-[var(--bg-panel)] border-l border-[var(--border-strong)] shadow-2xl overflow-y-auto gsm-scroll p-5 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              id="cop-settings-title"
              className="text-[11px] uppercase tracking-[0.16em] font-mono text-[var(--accent)]"
            >
              COP settings
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Event filters and how to read the AOR watch.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="px-2 py-1 text-sm rounded border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
          >
            Close
          </button>
        </div>

        <section className="flex flex-col gap-3 border border-[var(--border)] rounded p-3">
          <h2 className="text-[11px] uppercase tracking-[0.16em] font-mono text-[var(--accent)]">
            Event filters
          </h2>
          <FilterRail />
        </section>

        <div className="border border-[var(--border)] rounded p-3">
          <AorGuide />
        </div>

        <p className="text-xs text-[var(--text-faint)]">
          Saved defaults for next login live on{" "}
          <Link
            href="/settings"
            className="text-[var(--accent)] hover:underline"
          >
            Account preferences
          </Link>
          .
        </p>
      </aside>
    </div>
  );
}
