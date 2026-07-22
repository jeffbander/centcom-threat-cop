"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatRelativeTime } from "@/lib/format";
import { useDashboard } from "./DashboardContext";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Horizontal news-style ticker from live open-source geopolitical / high-severity events.
 * Not a classified intel product.
 */
export function NewsTicker() {
  const { filters, setSelectedEventId } = useDashboard();
  const events = useQuery(api.events.list, {
    categories: filters.categories.length
      ? filters.categories
      : ["geopolitical", "cybersecurity", "transportation", "energy"],
    severities: filters.severities,
    regions: filters.regions,
    timeWindow: filters.timeWindow,
    bookmarkedOnly: false,
    search: filters.search || undefined,
  });

  const items = (events ?? [])
    .filter((e) => !e.isSynthetic)
    .slice(0, 24);

  if (events === undefined) {
    return (
      <div className="border-b border-[var(--border)] bg-[#0a1018] px-3 py-1.5 text-xs font-mono text-[var(--text-faint)]">
        Loading open-source news wire…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border-b border-[var(--border)] bg-[#0a1018] px-3 py-1.5 text-xs text-[var(--text-faint)]">
        News wire empty — hit Refresh to pull UN / theater open-source items.
      </div>
    );
  }

  // Duplicate for seamless marquee
  const loop = [...items, ...items];

  return (
    <div
      className="relative border-b border-[var(--border)] bg-[#0a1018] overflow-hidden"
      aria-label="Open-source news wire"
    >
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-2 bg-gradient-to-r from-[#0a1018] via-[#0a1018] to-transparent pr-8">
        <span className="text-[10px] uppercase tracking-[0.16em] font-mono text-[var(--critical)] font-semibold whitespace-nowrap">
          OSINT WIRE
        </span>
      </div>
      <div className="gsm-marquee flex gap-8 py-1.5 pl-28 whitespace-nowrap">
        {loop.map((e, i) => (
          <button
            key={`${e._id}-${i}`}
            type="button"
            onClick={() => setSelectedEventId(e._id as Id<"events">)}
            className="inline-flex items-center gap-2 text-xs hover:text-[var(--accent)] text-[var(--text-muted)]"
          >
            <span
              className={`font-mono text-[10px] sev-${e.severity} uppercase`}
            >
              {e.severity === "critical"
                ? "CRIT"
                : e.severity === "high"
                  ? "HIGH"
                  : e.severity === "moderate"
                    ? "ELEV"
                    : "WATCH"}
            </span>
            <span className="text-[var(--text)] max-w-[420px] truncate">
              {e.headline}
            </span>
            <span className="text-[var(--text-faint)] font-mono">
              {e.region} · {formatRelativeTime(e.occurredAt)}
            </span>
            <span className="text-[var(--border-strong)]" aria-hidden>
              │
            </span>
          </button>
        ))}
      </div>
      <p className="sr-only">
        Open-source headlines only. Not real-time troop or satellite tracking.
      </p>
    </div>
  );
}
