"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  inMiddleEastAor,
  inUkraineAor,
  looksMiddleEastRelated,
  looksUkraineRelated,
} from "@/lib/theaters";
import { firmsAorDelta } from "@/lib/firmsDelta";
import type { FirmsDetection } from "@/convex/lib/firms";
import { useDashboard } from "./DashboardContext";
import { formatRelativeTime } from "@/lib/format";
import { AorGuide } from "./AorGuide";

export function UkraineWatch() {
  return (
    <AorWatch
      label="Ukraine AOR"
      subtitle="Ukraine AOR · last 24h"
      aria="Ukraine AOR watch"
      toneClass="text-[var(--critical)]"
      focusLat={48.25}
      focusLon={31.25}
      focusZoom={5}
      inAor={inUkraineAor}
      related={looksUkraineRelated}
    />
  );
}

export function MiddleEastWatch() {
  return (
    <AorWatch
      label="Middle East AOR"
      subtitle="Levant / Gulf / Red Sea · last 24h"
      aria="Middle East AOR watch"
      toneClass="text-[var(--high)]"
      focusLat={27.5}
      focusLon={45.0}
      focusZoom={4}
      inAor={inMiddleEastAor}
      related={looksMiddleEastRelated}
    />
  );
}

/** Left-rail dock so AOR boards do not sit on top of the map. */
export function AorWatchRail() {
  return (
    <aside
      className="hidden lg:flex w-[270px] xl:w-[300px] shrink-0 flex-col min-h-0 overflow-y-auto gsm-scroll border-r border-[var(--border)] bg-[#070b10]"
      aria-label="Theater AOR watch"
    >
      <p className="px-2 py-1.5 border-b border-[var(--border)] text-[9px] uppercase tracking-[0.14em] font-mono text-[var(--text-faint)]">
        AOR watch
      </p>
      <AorGuide compact />
      <UkraineWatch />
      <MiddleEastWatch />
    </aside>
  );
}

function AorWatch({
  label,
  subtitle,
  aria,
  toneClass,
  focusLat,
  focusLon,
  focusZoom,
  inAor,
  related,
}: {
  label: string;
  subtitle: string;
  aria: string;
  toneClass: string;
  focusLat: number;
  focusLon: number;
  focusZoom: number;
  inAor: (lat: number, lon: number) => boolean;
  related: (text: string) => boolean;
}) {
  const { filters, setSelectedEventId, setSelectedContact, requestMapFocus } =
    useDashboard();
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
  const acledSnap = useQuery(api.layers.getSnapshot, { layer: "acled", now });

  const stats = useMemo(() => {
    const evs = (events ?? []).filter(
      (e) =>
        inAor(e.latitude, e.longitude) ||
        related(`${e.headline} ${e.summary} ${e.region}`),
    );
    const crit = evs.filter((e) => e.severity === "critical").length;
    const high = evs.filter((e) => e.severity === "high").length;
    const firms = (
      Array.isArray(firmsSnap?.records) ? firmsSnap.records : []
    ).filter((r): r is FirmsDetection => {
      if (!r || typeof r !== "object") return false;
      const d = r as FirmsDetection;
      return typeof d.id === "string" && Number.isFinite(d.latitude);
    });
    const thermal = firmsAorDelta(firms, Date.now(), inAor);
    const air = (Array.isArray(adsbSnap?.records) ? adsbSnap.records : []).filter(
      (r) => {
        if (!r || typeof r !== "object") return false;
        const a = r as { latitude?: number; longitude?: number };
        return (
          typeof a.latitude === "number" &&
          typeof a.longitude === "number" &&
          inAor(a.latitude, a.longitude)
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
          inAor(a.latitude, a.longitude)
        );
      },
    );
    const acled = (
      Array.isArray(acledSnap?.records) ? acledSnap.records : []
    ).filter((r) => {
      if (!r || typeof r !== "object") return false;
      const a = r as { latitude?: number; longitude?: number };
      return (
        typeof a.latitude === "number" &&
        typeof a.longitude === "number" &&
        inAor(a.latitude, a.longitude)
      );
    });
    return {
      events: evs.slice(0, 4),
      eventCount: evs.length,
      crit,
      high,
      fires: thermal.aorCount,
      last24: thermal.last24Count,
      delta: thermal.delta,
      hottest: thermal.hottest,
      air: air.length,
      sea: sea.length,
      acled: acled.length,
      acledStatus: acledSnap?.status ?? "…",
    };
  }, [events, firmsSnap, adsbSnap, aisSnap, acledSnap, inAor, related]);

  return (
    <section
      className="shrink-0 px-2 py-2 border-b border-[var(--border)] bg-[#0a0c10] text-[10px] font-mono"
      aria-label={aria}
    >
      <div className="flex flex-col gap-1">
        <button
          type="button"
          className={`text-left uppercase tracking-[0.14em] font-bold ${toneClass}`}
          onClick={() => requestMapFocus(focusLat, focusLon, focusZoom)}
        >
          {label}
        </button>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px]">
          <span className="text-[var(--critical)]">CRIT {stats.crit}</span>
          <span className="text-[var(--high)]">HIGH {stats.high}</span>
          <span className="text-[#f97316]" title="FIRMS in AOR / last 24h vs prior 24h">
            THERMAL {stats.fires} · 24h {stats.last24}
            {stats.delta > 0 ? ` · +${stats.delta}` : stats.delta < 0 ? ` · ${stats.delta}` : ""}
          </span>
          <span className="text-[#ef4444]" title={stats.acledStatus}>
            ACLED {stats.acledStatus === "KEY_REQUIRED" ? "KEY" : stats.acled}
          </span>
          <span className="text-[#fbbf24]">ADS-B {stats.air}</span>
          <span className="text-[#22d3ee]">AIS {stats.sea}</span>
          <span className="text-[var(--text-faint)]">
            {stats.eventCount} events
          </span>
        </div>
      </div>
      {stats.hottest.length > 0 && (
        <p className="mt-0.5 text-[10px] text-[#f97316] truncate">
          New thermals:{" "}
          {stats.hottest.slice(0, 4).map((d, i) => (
            <button
              key={d.id}
              type="button"
              className="hover:underline mr-2"
              onClick={() => {
                setSelectedContact({
                  kind: "firms",
                  id: d.id,
                  latitude: d.latitude,
                  longitude: d.longitude,
                  title: `FIRMS FRP ${d.frp.toFixed(1)} MW`,
                  subtitle,
                  details: [
                    { label: "FRP", value: `${d.frp.toFixed(1)} MW` },
                    {
                      label: "Acquired",
                      value: new Date(d.acquiredAt).toISOString().slice(0, 16) + "Z",
                    },
                  ],
                  provenance: firmsSnap?.provenance ?? "NASA FIRMS",
                });
                requestMapFocus(d.latitude, d.longitude, 8);
              }}
            >
              {i > 0 ? "· " : ""}
              {d.frp.toFixed(0)} MW
            </button>
          ))}
        </p>
      )}
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
