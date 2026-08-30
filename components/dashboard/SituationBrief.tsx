"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CATEGORY_LABELS,
  SEVERITY_THREAT_LABELS,
  type Category,
  type Severity,
} from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";
import { useDashboard } from "./DashboardContext";
import { FIRMS_NEAR_EVENT_KM, firmsNearEvent } from "@/lib/spatialJoin";
import type { FirmsDetection } from "@/convex/lib/firms";
import type { AdsbContact } from "@/convex/lib/adsb";
import type { QuakeContact } from "@/convex/lib/quakes";
import type { AisContact } from "@/convex/lib/ais";
import type { LaunchContact } from "@/convex/lib/launches";
import type { AcledContact } from "@/convex/lib/acled";
import {
  geodeticFromSatRecord,
  satelliteContactId,
  type OmmRecord,
} from "@/lib/sgp4";
import type { AnalystRecord } from "@/lib/analystQuery";
import { AnalystQueryBox } from "./AnalystQueryBox";
import { explainFirms } from "@/lib/firmsExplain";

export function SituationBrief() {
  const brief = useQuery(api.briefing.situation);
  const { setSelectedEventId, selectedEventId, setSelectedContact, filters } =
    useDashboard();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const selectedEvent = useQuery(
    api.events.getById,
    selectedEventId ? { eventId: selectedEventId } : "skip",
  );
  const firmsSnap = useQuery(api.layers.getSnapshot, { layer: "firms", now });
  const satSnap = useQuery(api.layers.getSnapshot, {
    layer: "satellites",
    now,
  });
  const adsbSnap = useQuery(api.layers.getSnapshot, { layer: "adsb", now });
  const quakeSnap = useQuery(api.layers.getSnapshot, { layer: "quakes", now });
  const aisSnap = useQuery(api.layers.getSnapshot, { layer: "ais", now });
  const launchSnap = useQuery(api.layers.getSnapshot, {
    layer: "launches",
    now,
  });
  const acledSnap = useQuery(api.layers.getSnapshot, { layer: "acled", now });
  const events = useQuery(api.events.list, {
    categories: filters.categories,
    severities: filters.severities,
    regions: filters.regions,
    timeWindow: filters.timeWindow,
    bookmarkedOnly: filters.bookmarkedOnly,
    search: filters.search || undefined,
  });

  const firmsDetections = useMemo((): FirmsDetection[] => {
    const recs = firmsSnap?.records;
    if (!Array.isArray(recs)) return [];
    return recs.filter((r): r is FirmsDetection => {
      if (!r || typeof r !== "object") return false;
      const d = r as FirmsDetection;
      return typeof d.id === "string" && Number.isFinite(d.latitude);
    });
  }, [firmsSnap]);

  const nearbyFires = useMemo(() => {
    if (!selectedEvent) return [];
    return firmsNearEvent(
      {
        latitude: selectedEvent.latitude,
        longitude: selectedEvent.longitude,
      },
      firmsDetections,
      FIRMS_NEAR_EVENT_KM,
    );
  }, [selectedEvent, firmsDetections]);

  const analystRecords = useMemo((): AnalystRecord[] => {
    const out: AnalystRecord[] = [];
    for (const e of events ?? []) {
      out.push({
        layerKey: "events",
        id: e._id,
        latitude: e.latitude,
        longitude: e.longitude,
        headline: e.headline,
      });
    }
    for (const d of firmsDetections) {
      out.push({
        layerKey: "firms",
        id: d.id,
        latitude: d.latitude,
        longitude: d.longitude,
        frp: d.frp,
        headline: `FIRMS ${d.satellite} FRP ${d.frp.toFixed(1)}`,
      });
    }
    const recs = satSnap?.records;
    if (Array.isArray(recs)) {
      const epoch = now;
      for (const raw of recs) {
        if (!raw || typeof raw !== "object") continue;
        const omm = raw as OmmRecord;
        const geo = geodeticFromSatRecord(omm, epoch);
        if (!geo) continue;
        out.push({
          layerKey: "satellites",
          id: satelliteContactId(omm),
          latitude: geo.latitude,
          longitude: geo.longitude,
          name: omm.OBJECT_NAME,
          norad: String(omm.NORAD_CAT_ID),
        });
      }
    }
    const air = adsbSnap?.records;
    if (Array.isArray(air)) {
      for (const raw of air) {
        if (!raw || typeof raw !== "object") continue;
        const a = raw as AdsbContact;
        if (typeof a.id !== "string" || !Number.isFinite(a.latitude)) continue;
        out.push({
          layerKey: "adsb",
          id: a.id,
          latitude: a.latitude,
          longitude: a.longitude,
          name: a.callsign,
          callsign: a.callsign,
          military: a.military,
          altitudeFt: a.altitudeFt ?? undefined,
        });
      }
    }
    const quakes = quakeSnap?.records;
    if (Array.isArray(quakes)) {
      for (const raw of quakes) {
        if (!raw || typeof raw !== "object") continue;
        const q = raw as QuakeContact;
        if (typeof q.id !== "string" || !Number.isFinite(q.latitude)) continue;
        out.push({
          layerKey: "quakes",
          id: q.id,
          latitude: q.latitude,
          longitude: q.longitude,
          name: q.title,
          magnitude: q.magnitude,
        });
      }
    }
    const vessels = aisSnap?.records;
    if (Array.isArray(vessels)) {
      for (const raw of vessels) {
        if (!raw || typeof raw !== "object") continue;
        const a = raw as AisContact;
        if (typeof a.id !== "string" || !Number.isFinite(a.latitude)) continue;
        out.push({
          layerKey: "ais",
          id: a.id,
          latitude: a.latitude,
          longitude: a.longitude,
          name: a.name,
          sogKt: a.sogKt ?? undefined,
        });
      }
    }
    const pads = launchSnap?.records;
    if (Array.isArray(pads)) {
      for (const raw of pads) {
        if (!raw || typeof raw !== "object") continue;
        const ln = raw as LaunchContact;
        if (typeof ln.id !== "string" || !Number.isFinite(ln.latitude)) continue;
        out.push({
          layerKey: "launches",
          id: ln.id,
          latitude: ln.latitude,
          longitude: ln.longitude,
          name: ln.name,
        });
      }
    }
    const coded = acledSnap?.records;
    if (Array.isArray(coded)) {
      for (const raw of coded) {
        if (!raw || typeof raw !== "object") continue;
        const a = raw as AcledContact;
        if (typeof a.id !== "string" || !Number.isFinite(a.latitude)) continue;
        out.push({
          layerKey: "acled",
          id: a.id,
          latitude: a.latitude,
          longitude: a.longitude,
          name: a.location,
          eventType: a.eventType,
          fatalities: a.fatalities,
        });
      }
    }
    return out;
  }, [events, firmsDetections, satSnap, adsbSnap, quakeSnap, aisSnap, launchSnap, acledSnap, now]);

  return (
    <section
      className="w-full flex-1 flex flex-col bg-[#0c1018] min-h-0"
      aria-label="Situation brief"
    >
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[11px] uppercase tracking-[0.16em] font-mono text-[var(--accent)]">
            Sitrep · COP composition
          </h2>
          <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
            {brief === undefined
              ? "Composing…"
              : brief === null
                ? "Sign in required"
                : `${brief.eventCount} events · ${brief.criticalCount} CRIT · ${brief.highCount} HIGH`}
          </p>
        </div>
        {brief && brief.lastRefreshAt && (
          <span className="shrink-0 text-[10px] font-mono text-[var(--text-muted)]">
            ingest {formatRelativeTime(brief.lastRefreshAt)}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto gsm-scroll min-h-0">
        {brief === undefined && (
          <p className="p-4 text-sm text-[var(--text-muted)]" aria-busy="true">
            Building sitrep from stored events…
          </p>
        )}
        {brief === null && (
          <p className="p-4 text-sm text-[var(--text-muted)]">
            Authenticate to view the situation brief.
          </p>
        )}
        {brief && (
          <div className="flex flex-col gap-3 p-3">
            <section aria-label="Source health">
              <h3 className="text-[10px] uppercase tracking-[0.14em] font-mono text-[var(--text-faint)] mb-1.5">
                Source health
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {brief.sourceHealth.map((s) => (
                  <li
                    key={s.provider}
                    title={
                      s.errorSummary ||
                      `${s.status} · ${s.recordsReceived} records`
                    }
                    className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${
                      s.ok
                        ? "border-[var(--ok)]/50 text-[var(--ok)]"
                        : "border-[var(--high)]/60 text-[var(--high)]"
                    }`}
                  >
                    {s.ok ? "●" : "○"} {s.label}
                  </li>
                ))}
              </ul>
              {brief.sourceGaps.length > 0 && (
                <p className="mt-2 text-[11px] text-[var(--high)]">
                  Gaps: {brief.sourceGaps.join(", ")}
                </p>
              )}
            </section>

            <section aria-label="Theaters">
              <h3 className="text-[10px] uppercase tracking-[0.14em] font-mono text-[var(--text-faint)] mb-1.5">
                Theaters
              </h3>
              {brief.theaters.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">
                  No active events in the 7-day window.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)] border border-[var(--border)] rounded">
                  {brief.theaters.map((t) => (
                    <li key={t.region}>
                      <button
                        type="button"
                        className="w-full text-left px-2 py-1.5 hover:bg-[var(--bg-hover)]"
                        onClick={() =>
                          setSelectedEventId(t.topEventId as Id<"events">)
                        }
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-medium">{t.region}</span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            {t.count}
                            {t.critical ? (
                              <span className="text-[var(--critical)]">
                                {" "}
                                · {t.critical}C
                              </span>
                            ) : null}
                            {t.high ? (
                              <span className="text-[var(--high)]">
                                {" "}
                                · {t.high}H
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                          {t.topHeadline}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {selectedEventId && (
              <section aria-label="FIRMS within 50 km of selected event">
                <h3 className="text-[10px] uppercase tracking-[0.14em] font-mono text-[var(--text-faint)] mb-1.5">
                  FIRMS within 50 km
                </h3>
                {selectedEvent === undefined ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    Locating event…
                  </p>
                ) : nearbyFires.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    No loaded FIRMS detections within 50 km of this event.
                    {firmsSnap?.status === "KEY_REQUIRED"
                      ? " FIRMS MAP_KEY required."
                      : firmsSnap?.status === "UNAVAILABLE"
                        ? " FIRMS layer unavailable."
                        : ""}
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--border)] border border-[var(--border)] rounded">
                    {nearbyFires.slice(0, 8).map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          className="w-full text-left px-2 py-1.5 hover:bg-[var(--bg-hover)]"
                          onClick={() => {
                            const view = explainFirms(
                              d,
                              nearbyFires,
                              Date.now(),
                              firmsSnap?.provenance ?? "NASA FIRMS",
                            );
                            setSelectedContact({
                              ...view,
                              subtitle: `${d.distanceKm.toFixed(1)} km from selected event · ${view.subtitle}`,
                            });
                          }}
                        >
                          <span className="text-xs font-medium">
                            FRP {d.frp.toFixed(1)} MW
                          </span>
                          <span className="block text-[10px] font-mono text-[var(--text-muted)]">
                            {d.distanceKm.toFixed(1)} km · {d.satellite}{" "}
                            {d.instrument}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <AnalystQueryBox records={analystRecords} />

            <section aria-label="Priority events">
              <h3 className="text-[10px] uppercase tracking-[0.14em] font-mono text-[var(--text-faint)] mb-1.5">
                Priority lines
              </h3>
              <ul className="divide-y divide-[var(--border)]">
                {brief.topEvents.map((e) => (
                  <li key={e._id}>
                    <button
                      type="button"
                      className="w-full text-left py-2 hover:bg-[var(--bg-hover)]"
                      onClick={() =>
                        setSelectedEventId(e._id as Id<"events">)
                      }
                    >
                      <span
                        className={`text-[10px] font-mono uppercase tracking-wide ${
                          e.severity === "critical"
                            ? "text-[var(--critical)]"
                            : e.severity === "high"
                              ? "text-[var(--high)]"
                              : "text-[var(--text-faint)]"
                        }`}
                      >
                        {SEVERITY_THREAT_LABELS[e.severity as Severity]}
                      </span>
                      <span className="block text-sm font-medium leading-snug">
                        {e.headline}
                      </span>
                      <span className="block text-[11px] text-[var(--text-muted)]">
                        {CATEGORY_LABELS[e.category as Category]} · {e.region} ·{" "}
                        {formatRelativeTime(e.occurredAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {brief.categoryCounts.length > 0 && (
              <p className="text-[10px] font-mono text-[var(--text-faint)]">
                Mix:{" "}
                {brief.categoryCounts
                  .slice(0, 6)
                  .map(
                    (c) =>
                      `${CATEGORY_LABELS[c.category as Category]} ${c.count}`,
                  )
                  .join(" · ")}
              </p>
            )}

            <p className="text-[10px] leading-relaxed text-[var(--text-faint)] border-t border-[var(--border)] pt-2">
              {brief.disclosure}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
