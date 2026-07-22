"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  CATEGORY_LABELS,
  SEVERITY_THREAT_LABELS,
  type Category,
  type Severity,
} from "@/lib/constants";
import { formatAbsolute, formatRelativeTime } from "@/lib/format";
import { useDashboard } from "./DashboardContext";
import { trackProductEvent } from "@/lib/analytics";
import { isSafeHttpsUrl } from "@/lib/validation";

export function EventDetailPanel() {
  const { selectedEventId, setSelectedEventId, detailOpen, setDetailOpen } =
    useDashboard();
  const detail = useQuery(
    api.events.getById,
    selectedEventId ? { eventId: selectedEventId } : "skip",
  );
  const toggleBookmark = useMutation(api.bookmarks.toggle);
  const track = useMutation(api.analytics.track);

  if (!detailOpen || !selectedEventId) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close detail panel"
        onClick={() => {
          setDetailOpen(false);
        }}
      />
      <aside className="relative w-full max-w-lg h-full bg-[var(--bg-panel)] border-l border-[var(--border-strong)] shadow-2xl overflow-y-auto gsm-scroll p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-mono text-[var(--accent)]">
              Event detail
            </p>
            {detail === undefined && (
              <p className="mt-2 text-sm text-[var(--text-muted)]">Loading…</p>
            )}
            {detail === null && (
              <p className="mt-2 text-sm text-[var(--critical)]" role="alert">
                Event not found or you do not have access.
              </p>
            )}
            {detail && (
              <h2
                id="event-detail-title"
                className="mt-1 text-xl font-bold text-[var(--text)] text-balance"
              >
                {detail.headline}
              </h2>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDetailOpen(false)}
            className="px-2 py-1 text-sm rounded border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
          >
            Close
          </button>
        </div>

        {detail && (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 rounded border border-[var(--border)]">
                {CATEGORY_LABELS[detail.category as Category]}
              </span>
              <span
                className={`px-2 py-0.5 rounded border bg-sev-${detail.severity} sev-${detail.severity}`}
              >
                {SEVERITY_THREAT_LABELS[detail.severity as Severity]}
              </span>
              {!detail.isSynthetic && (
                <span className="px-2 py-0.5 rounded border border-[var(--ok)] text-[var(--ok)]">
                  Open-source
                </span>
              )}
              <span className="px-2 py-0.5 rounded border border-[var(--border)]">
                Confidence: {detail.confidence}
              </span>
              {detail.isSynthetic && (
                <span className="px-2 py-0.5 rounded border border-[var(--demo)] bg-[var(--demo-wash)] text-[var(--demo)] font-semibold">
                  Sensitive
                </span>
              )}
            </div>

            <section>
              <h3 className="text-[11px] uppercase tracking-[0.14em] font-mono text-[var(--text-faint)] mb-1">
                System-generated summary
              </h3>
              <p className="text-sm text-[var(--text)] whitespace-pre-wrap">
                {detail.summary}
              </p>
              <p className="mt-2 text-xs text-[var(--demo)] border border-[var(--demo)] bg-[var(--demo-wash)] rounded px-2 py-1.5">
                {detail.generatedContentDisclosure}
              </p>
            </section>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[var(--text-faint)] text-xs">Location</dt>
                <dd>
                  {detail.region} ({detail.countryCode}) ·{" "}
                  {detail.latitude.toFixed(2)}, {detail.longitude.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-faint)] text-xs">First observed</dt>
                <dd className="font-mono text-xs">
                  {formatAbsolute(detail.firstObservedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-faint)] text-xs">Occurred</dt>
                <dd className="font-mono text-xs">
                  {formatAbsolute(detail.occurredAt)} (
                  {formatRelativeTime(detail.occurredAt)})
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-faint)] text-xs">Last updated</dt>
                <dd className="font-mono text-xs">
                  {formatAbsolute(detail.updatedAt)}
                </dd>
              </div>
            </dl>

            <section>
              <h3 className="text-[11px] uppercase tracking-[0.14em] font-mono text-[var(--text-faint)] mb-1">
                Why this is ranked
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                {detail.rankExplanation}
              </p>
              {detail.whyItMatters && (
                <p className="mt-2 text-sm text-[var(--text)]">
                  {detail.whyItMatters}
                </p>
              )}
            </section>

            <section>
              <h3 className="text-[11px] uppercase tracking-[0.14em] font-mono text-[var(--text-faint)] mb-2">
                Sources (open original)
              </h3>
              <ul className="flex flex-col gap-2">
                {detail.sources.map((s) => (
                  <li
                    key={s._id}
                    className="text-sm border border-[var(--border)] rounded px-3 py-2"
                  >
                    <p className="font-medium">{s.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {s.publisher} · {s.verificationStatus}
                    </p>
                    {isSafeHttpsUrl(s.sourceUrl) ? (
                      <a
                        href={s.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent)] text-xs hover:underline break-all"
                        onClick={() => {
                          trackProductEvent({ name: "source_link_followed" });
                          void track({ name: "source_link_followed" });
                        }}
                      >
                        {s.sourceUrl}
                      </a>
                    ) : (
                      <span className="text-xs text-[var(--text-faint)]">
                        Link unavailable
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {detail.related.length > 0 && (
              <section>
                <h3 className="text-[11px] uppercase tracking-[0.14em] font-mono text-[var(--text-faint)] mb-2">
                  Related events
                </h3>
                <ul className="flex flex-col gap-1">
                  {detail.related.map((r) => (
                    <li key={r._id}>
                      <button
                        type="button"
                        className="text-left text-sm text-[var(--accent)] hover:underline"
                        onClick={() => setSelectedEventId(r._id)}
                      >
                        {r.headline}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-auto flex flex-wrap gap-2 pt-4 border-t border-[var(--border)]">
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded border border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
                onClick={async () => {
                  await toggleBookmark({ eventId: detail._id });
                  trackProductEvent({ name: "event_bookmarked" });
                  void track({ name: "event_bookmarked" });
                }}
              >
                {detail.bookmarked ? "Remove bookmark" : "Bookmark"}
              </button>
              <Link
                href={`/event/${detail._id}`}
                className="px-3 py-1.5 text-sm rounded border border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
              >
                Open full page
              </Link>
              <a
                href={`mailto:ops@mswlab.ai?subject=${encodeURIComponent(
                  `Issue report: ${detail.externalId}`,
                )}&body=${encodeURIComponent(
                  "Describe the issue with this event listing (do not include PHI):\n\n",
                )}`}
                className="px-3 py-1.5 text-sm rounded border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
              >
                Report an issue
              </a>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
