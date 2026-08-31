"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { FirmsDetection } from "@/convex/lib/firms";
import type { AdsbContact } from "@/convex/lib/adsb";
import { FIRMS_NEAR_EVENT_KM, bearingDeg, haversineKm } from "@/lib/spatialJoin";
import { useDashboard } from "./DashboardContext";
import { ContactInspector } from "./ContactInspector";

export function ContactSubjectPanel() {
  const {
    selectedContact,
    setSelectedContact,
    setSelectedEventId,
    requestMapFocus,
    filters,
  } = useDashboard();
  const [now] = useState(() => Date.now());
  const events = useQuery(api.events.list, {
    categories: filters.categories,
    severities: filters.severities,
    regions: filters.regions,
    timeWindow: filters.timeWindow,
    bookmarkedOnly: false,
    search: undefined,
  });
  const firmsSnap = useQuery(api.layers.getSnapshot, { layer: "firms", now });
  const adsbSnap = useQuery(api.layers.getSnapshot, { layer: "adsb", now });

  const nearby = useMemo(() => {
    if (!selectedContact) return { events: [], fires: [], tracks: [] };
    const origin = {
      latitude: selectedContact.latitude,
      longitude: selectedContact.longitude,
    };
    const evs = (events ?? [])
      .map((e) => ({
        id: e._id,
        headline: e.headline,
        distanceKm: haversineKm(origin, {
          latitude: e.latitude,
          longitude: e.longitude,
        }),
        bearing: bearingDeg(origin, {
          latitude: e.latitude,
          longitude: e.longitude,
        }),
      }))
      .filter((e) => e.distanceKm <= FIRMS_NEAR_EVENT_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3);

    const fires = (
      Array.isArray(firmsSnap?.records) ? firmsSnap.records : []
    )
      .filter((r): r is FirmsDetection => {
        if (!r || typeof r !== "object") return false;
        const d = r as FirmsDetection;
        return typeof d.id === "string" && d.id !== selectedContact.id;
      })
      .map((d) => ({
        id: d.id,
        frp: d.frp,
        distanceKm: haversineKm(origin, d),
      }))
      .filter((d) => d.distanceKm <= FIRMS_NEAR_EVENT_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3);

    const tracks = (Array.isArray(adsbSnap?.records) ? adsbSnap.records : [])
      .filter((r): r is AdsbContact => {
        if (!r || typeof r !== "object") return false;
        const a = r as AdsbContact;
        return typeof a.id === "string" && a.id !== selectedContact.id;
      })
      .map((a) => ({
        id: a.id,
        callsign: a.callsign,
        distanceKm: haversineKm(origin, a),
      }))
      .filter((a) => a.distanceKm <= 250)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3);

    return { events: evs, fires, tracks };
  }, [selectedContact, events, firmsSnap, adsbSnap]);

  if (!selectedContact) return null;

  const kindLabel =
    selectedContact.kind === "firms"
      ? "FIRMS"
      : selectedContact.kind === "adsb"
        ? "ADS-B"
        : selectedContact.kind === "ais"
          ? "AIS"
          : selectedContact.kind === "quake"
            ? "USGS"
            : selectedContact.kind === "launch"
              ? "LAUNCH"
              : selectedContact.kind === "acled"
                ? "ACLED"
              : "Satellite";

  return (
    <section
      className="border-b border-[var(--border)] bg-[#0c1018] px-3 py-2"
      aria-label="Selected contact"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] font-mono text-[var(--accent)]">
            Dossier · {kindLabel}
          </p>
          <h2 className="text-sm font-semibold text-[var(--text)] truncate">
            {selectedContact.title}
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            {selectedContact.subtitle}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className="px-1.5 py-0.5 text-[10px] font-mono uppercase rounded border border-[var(--border)] text-[var(--accent)] hover:bg-[var(--bg-hover)]"
            onClick={() =>
              requestMapFocus(
                selectedContact.latitude,
                selectedContact.longitude,
                selectedContact.kind === "firms" ? 8 : 6,
              )
            }
          >
            Slew
          </button>
          <button
            type="button"
            className="px-1.5 py-0.5 text-[10px] font-mono uppercase rounded border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
            onClick={() => setSelectedContact(null)}
          >
            Clear
          </button>
        </div>
      </div>
      {selectedContact.assessment && (
        <p className="mt-2 text-[11px] leading-snug text-[var(--text)]">
          {selectedContact.assessment}
        </p>
      )}
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
      {selectedContact.kind === "firms" ? (
        <div className="mt-2">
          <p className="text-[9px] font-mono uppercase tracking-wide text-[var(--text-faint)]">
            Loaded news within 25 km — coincidence, not a FIRMS article
          </p>
          {nearby.events.filter((e) => e.distanceKm <= 25).length === 0 ? (
            <p className="text-[11px] text-[var(--text-muted)]">
              No loaded news within 25 km of this pixel. Sitrep headlines below
              are not about this detection.
            </p>
          ) : (
            <ul>
              {nearby.events
                .filter((e) => e.distanceKm <= 25)
                .map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      className="w-full text-left text-[11px] hover:bg-[var(--bg-hover)] py-0.5"
                      onClick={() => setSelectedEventId(e.id)}
                    >
                      {e.distanceKm.toFixed(0)} km {e.bearing.toFixed(0)}° ·{" "}
                      {e.headline}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      ) : nearby.events.length > 0 ? (
        <div className="mt-2">
          <p className="text-[9px] font-mono uppercase tracking-wide text-[var(--text-faint)]">
            Events within 50 km
          </p>
          <ul>
            {nearby.events.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className="w-full text-left text-[11px] hover:bg-[var(--bg-hover)] py-0.5"
                  onClick={() => setSelectedEventId(e.id)}
                >
                  {e.distanceKm.toFixed(0)} km {e.bearing.toFixed(0)}° ·{" "}
                  {e.headline}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {nearby.fires.length > 0 && (
        <p className="mt-1 text-[10px] font-mono text-[#f97316]">
          FIRMS nearby: {nearby.fires.map((f) => `${f.distanceKm.toFixed(0)}km FRP ${f.frp.toFixed(0)}`).join(" · ")}
        </p>
      )}
      {nearby.tracks.length > 0 && (
        <p className="mt-1 text-[10px] font-mono text-[#fbbf24]">
          ADS-B nearby: {nearby.tracks.map((t) => `${t.callsign} ${t.distanceKm.toFixed(0)}km`).join(" · ")}
        </p>
      )}
      <p className="mt-1.5 text-[10px] leading-snug text-[var(--text-faint)]">
        {selectedContact.provenance}
      </p>
      <ContactInspector />
    </section>
  );
}
