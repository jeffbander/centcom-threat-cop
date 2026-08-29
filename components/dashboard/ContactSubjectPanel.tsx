"use client";

import { useDashboard } from "./DashboardContext";

export function ContactSubjectPanel() {
  const { selectedContact, setSelectedContact } = useDashboard();
  if (!selectedContact) return null;

  return (
    <section
      className="border-b border-[var(--border)] bg-[#0c1018] px-3 py-2"
      aria-label="Selected contact"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] font-mono text-[var(--accent)]">
            Contact · {selectedContact.kind === "firms" ? "FIRMS" : "Satellite"}
          </p>
          <h2 className="text-sm font-semibold text-[var(--text)] truncate">
            {selectedContact.title}
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            {selectedContact.subtitle}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 px-1.5 py-0.5 text-[10px] font-mono uppercase rounded border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
          onClick={() => setSelectedContact(null)}
        >
          Clear
        </button>
      </div>
      <dl className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
        {selectedContact.details.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="font-mono uppercase tracking-wide text-[9px] text-[var(--text-faint)]">
              {row.label}
            </dt>
            <dd className="text-[var(--text)] truncate">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1.5 text-[10px] leading-snug text-[var(--text-faint)]">
        {selectedContact.provenance}
      </p>
    </section>
  );
}
