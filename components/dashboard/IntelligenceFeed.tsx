"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  CATEGORY_LABELS,
  SEVERITY_THREAT_LABELS,
  type Category,
  type Severity,
} from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";
import { useDashboard } from "./DashboardContext";
import { trackProductEvent } from "@/lib/analytics";
import type { Id } from "@/convex/_generated/dataModel";

export function IntelligenceFeed() {
  const { filters, selectedEventId, setSelectedEventId, preferredView } =
    useDashboard();
  const events = useQuery(api.events.list, {
    categories: filters.categories,
    severities: filters.severities,
    regions: filters.regions,
    timeWindow: filters.timeWindow,
    bookmarkedOnly: filters.bookmarkedOnly,
    search: filters.search || undefined,
  });
  const toggleBookmark = useMutation(api.bookmarks.toggle);
  const track = useMutation(api.analytics.track);

  if (preferredView === "map") {
    return null;
  }

  return (
    <section
      className="w-full flex-1 flex flex-col bg-[var(--bg-panel)] min-h-0"
      aria-label="Intelligence feed"
    >
      <div className="px-3 py-1.5 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="text-[11px] uppercase tracking-[0.16em] font-mono text-[var(--accent)]">
          Priority threat feed
        </h2>
        <span className="text-xs text-[var(--text-faint)] font-mono">
          {events ? `${events.length} events` : "…"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto gsm-scroll min-h-0">
        {events === undefined && (
          <p className="p-4 text-sm text-[var(--text-muted)]" aria-busy="true">
            Loading feed…
          </p>
        )}
        {events && events.length === 0 && (
          <p className="p-4 text-sm text-[var(--text-muted)]">
            No matching events. Adjust filters or expand the time window.
          </p>
        )}
        <ul className="divide-y divide-[var(--border)]">
          {events?.map((e) => (
            <li key={e._id}>
              <article
                className={`p-3 hover:bg-[var(--bg-hover)] transition-colors ${
                  selectedEventId === e._id
                    ? "bg-[var(--accent-wash)] border-l-2 border-l-[var(--accent)]"
                    : "border-l-2 border-l-transparent"
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    setSelectedEventId(e._id);
                    trackProductEvent({
                      name: "event_opened",
                      meta: { surface: "feed" },
                    });
                    void track({
                      name: "event_opened",
                      meta: JSON.stringify({ surface: "feed" }),
                    });
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[var(--text)] leading-snug">
                      {e.headline}
                    </h3>
                    <span
                      className={`text-[10px] uppercase font-mono shrink-0 sev-${e.severity}`}
                    >
                      {SEVERITY_THREAT_LABELS[e.severity as Severity]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {CATEGORY_LABELS[e.category as Category]} · {e.region} ·{" "}
                    {formatRelativeTime(e.occurredAt)}
                  </p>
                  <p className="mt-1.5 text-sm text-[var(--text-muted)] line-clamp-2">
                    {e.summary}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono text-[var(--text-faint)]">
                    <span>{e.sourceCount} sources</span>
                    <span>·</span>
                    <span>Confidence: {e.confidence}</span>
                    {e.isSynthetic && (
                      <span className="text-[var(--demo)]">Sensitive</span>
                    )}
                  </div>
                </button>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]"
                    onClick={async (ev) => {
                      ev.stopPropagation();
                      await toggleBookmark({
                        eventId: e._id as Id<"events">,
                      });
                      trackProductEvent({ name: "event_bookmarked" });
                      void track({ name: "event_bookmarked" });
                    }}
                    aria-pressed={e.bookmarked}
                  >
                    {e.bookmarked ? "Bookmarked" : "Bookmark"}
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
