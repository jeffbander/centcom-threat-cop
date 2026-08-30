"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { inUkraineAor, looksUkraineRelated } from "@/lib/theaters";
import { useDashboard } from "./DashboardContext";
import { formatRelativeTime } from "@/lib/format";

/**
 * Ukraine AOR watch — public events + FIRMS + ADS-B + AIS in the box.
 * Not troop GPS and not a targeting feed.
 */
export function UkraineWatch() {
  const { filters, setSelectedEventId, requestMapFocus } = useDashboard();
  const [now] = useState(() => Date.now());
  const events = useQuery(api.events.list, {
    categories: filters.categories,
    severities: filters.severities,
    regions: [],
    timeWindow: filters.timeWindow,
    bookmarkedOnly: false,
    search: undefined,
  });
  const firmsSnap = useQuery(api.layers.getSnapshot, { layer: "firms", now });
  const adsbSnap = useQuery(api.layers.getSnapshot, { layer: "adsb", now });
  const aisSnap = useQuery(api.layers.getSnapshot, { layer: "ais", now });

  const stats = useMemo(() => {
    const evs = (events ?? []).filter(
      (e) =>
        inUkraineAor(e.latitude, e.longitude) ||
        looksUkraineRelated(`${e.headline} ${e.summary} ${e.region}`),
    );
    const crit = evs.filter((e) => e.severity === "critical").length;
    const high = evs.filter((e) => e.severity === "high").length;
    const fires = (
      Array.isArray(firmsSnap?.records) ? firmsSnap.records : []
    ).filter((r) => {
      if (!r || typeof r !== "object") return false;
      const d = r as { latitude?: number; longitude?: number };
      return (
        typeof d.latitude === "number" &&
        typeof d.longitude === "number" &&
        inUkraineAor(d.latitude, d.longitude)
      );
    });
    const air = (Array.isArray(adsbSnap?.records) ? adsbSnap.records : []).filter(
      (r) => {
        if (!r || typeof r !== "object") return false;
        const a = r as { latitude?: number; longitude?: number };
        return (
          typeof a.latitude === "number" &&
          typeof a.longitude === "number" &&
          inUkraineAor(a.latitude, a.longitude)
        );
      },
    );
    const sea = (Array.isArray(aisSnap?.records) ? aisSnap.records : []).filter(
      (r) => {
        if (!r || typeof r !== "object") return false;
        const a = r as { latitude?: number; longitude?: number };
        return (
          typeof a.latitude === "number" &&
          typeof a.longitude === "number" &&
          inUkraineAor(a.latitude, a.longitude)
        );
      },
    );
    return {
      events: evs.slice(0, 4),
      eventCount: evs.length,
      crit,
      high,
      fires: fires.length,
      air: air.length,
      sea: sea.length,
    };
  }, [events, firmsSnap, adsbSnap, aisSnap]);

  return (
    <section
      className="px-2 py-1 border-b border-[var(--border)] bg-[#0a0c10] text-[10px] font-mono"
      aria-label="Ukraine AOR watch"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          className="uppercase tracking-[0.14em] text-[var(--critical)] font-bold"
          onClick={() => requestMapFocus(48.25, 31.25, 5)}
        >
          Ukraine AOR
        </button>
        <span className="text-[var(--critical)]">CRIT {stats.crit}</span>
        <span className="text-[var(--high)]">HIGH {stats.high}</span>
        <span className="text-[#f97316]">THERMAL {stats.fires}</span>
        <span className="text-[#fbbf24]">ADS-B {stats.air}</span>
        <span className="text-[#22d3ee]">AIS {stats.sea}</span>
        <span className="text-[var(--text-faint)]">
          {stats.eventCount} events in AOR
        </span>
      </div>
      {stats.events.length > 0 && (
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {stats.events.map((e) => (
            <li key={e._id}>
              <button
                type="button"
                className="w-full text-left truncate hover:bg-[var(--bg-hover)] text-[11px]"
                onClick={() => setSelectedEventId(e._id)}
              >
                <span
                  className={
                    e.severity === "critical"
                      ? "text-[var(--critical)]"
                      : e.severity === "high"
                        ? "text-[var(--high)]"
                        : "text-[var(--text-muted)]"
                  }
                >
                  {e.severity.toUpperCase()}
                </span>
                <span className="text-[var(--text-faint)]">
                  {" "}
                  · {formatRelativeTime(e.occurredAt)} ·{" "}
                </span>
                {e.headline}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
