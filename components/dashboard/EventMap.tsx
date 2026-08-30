"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  type Category,
  type Severity,
} from "@/lib/constants";
import { useDashboard } from "./DashboardContext";
import { formatRelativeTime } from "@/lib/format";
import { trackProductEvent } from "@/lib/analytics";
import type { MapEvent } from "./LeafletMapCanvas";
import type { FirmsDetection } from "@/convex/lib/firms";
import type { AdsbContact } from "@/convex/lib/adsb";
import {
  geodeticFromSatRecord,
  groundTrack,
  satelliteContactId,
  type OmmRecord,
} from "@/lib/sgp4";
import type { LiveSatellite } from "./LeafletMapCanvas";
import { formatDms } from "@/lib/coords";
import { TrackBoard } from "./TrackBoard";

const LeafletMapCanvas = dynamic(() => import("./LeafletMapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center bg-[#0e1520] text-sm text-[var(--text-muted)]">
      Loading map tiles…
    </div>
  ),
});

type EventRow = MapEvent & {
  summary: string;
};

export function EventMap({
  showForces = true,
  showSatellites = true,
  showAois = true,
  showRangeRings = true,
  showOsintInfra = true,
  showFirms = true,
  showAdsb = true,
}: {
  showForces?: boolean;
  showSatellites?: boolean;
  showAois?: boolean;
  showRangeRings?: boolean;
  showOsintInfra?: boolean;
  showFirms?: boolean;
  showAdsb?: boolean;
}) {
  const {
    filters,
    selectedEventId,
    setSelectedEventId,
    selectedContact,
    setSelectedContact,
    preferredView,
    mapFocus,
  } = useDashboard();
  const events = useQuery(api.events.list, {
    categories: filters.categories,
    severities: filters.severities,
    regions: filters.regions,
    timeWindow: filters.timeWindow,
    bookmarkedOnly: filters.bookmarkedOnly,
    search: filters.search || undefined,
  });
  const track = useMutation(api.analytics.track);
  const [showList, setShowList] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const ms = showSatellites ? 1000 : 15_000;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [showSatellites]);

  const firmsSnap = useQuery(api.layers.getSnapshot, {
    layer: "firms",
    now,
  });
  const satSnap = useQuery(api.layers.getSnapshot, {
    layer: "satellites",
    now,
  });
  const adsbSnap = useQuery(api.layers.getSnapshot, {
    layer: "adsb",
    now,
  });
  const [cursor, setCursor] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const onCursor = useCallback((lat: number, lon: number) => {
    setCursor({ lat, lon });
  }, []);

  const firmsDetections = useMemo((): FirmsDetection[] => {
    const recs = firmsSnap?.records;
    if (!Array.isArray(recs)) return [];
    return recs.filter((r): r is FirmsDetection => {
      if (!r || typeof r !== "object") return false;
      const d = r as FirmsDetection;
      return (
        typeof d.id === "string" &&
        Number.isFinite(d.latitude) &&
        Number.isFinite(d.longitude)
      );
    });
  }, [firmsSnap]);

  const liveSatellites = useMemo((): LiveSatellite[] => {
    const recs = satSnap?.records;
    if (!Array.isArray(recs)) return [];
    const trackEpoch = Math.floor(now / 15_000) * 15_000;
    const out: LiveSatellite[] = [];
    for (const raw of recs) {
      if (!raw || typeof raw !== "object") continue;
      const omm = raw as OmmRecord;
      const geo = geodeticFromSatRecord(omm, now);
      if (!geo) continue;
      out.push({
        id: satelliteContactId(omm),
        name: omm.OBJECT_NAME,
        norad: String(omm.NORAD_CAT_ID),
        latitude: geo.latitude,
        longitude: geo.longitude,
        altitudeKm: geo.altitudeKm,
        track: groundTrack(omm, trackEpoch, 90, 90),
      });
    }
    return out;
  }, [satSnap, now]);

  const adsbContacts = useMemo((): AdsbContact[] => {
    const recs = adsbSnap?.records;
    if (!Array.isArray(recs)) return [];
    return recs.filter((r): r is AdsbContact => {
      if (!r || typeof r !== "object") return false;
      const a = r as AdsbContact;
      return typeof a.id === "string" && Number.isFinite(a.latitude);
    });
  }, [adsbSnap]);

  const rows = (events as EventRow[] | undefined) ?? [];

  const onSelect = (id: Id<"events">) => {
    setSelectedEventId(id);
    trackProductEvent({ name: "event_opened", meta: { surface: "map" } });
    void track({
      name: "event_opened",
      meta: JSON.stringify({ surface: "map" }),
    });
  };

  if (preferredView === "list") {
    return (
      <AccessibleEventList
        events={rows}
        loading={events === undefined}
      />
    );
  }

  return (
    <section
      className="flex-1 min-h-[320px] flex flex-col border-r border-[var(--border)] bg-[var(--bg)]"
      aria-label="Event map"
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
        <span className="font-mono uppercase tracking-[0.14em] text-[var(--accent)]">
          COP · common operating picture
        </span>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="text-[var(--text-faint)] font-mono text-[10px]">
            ESRI imagery
          </span>
          {showAois && (
            <span className="text-[var(--high)] font-mono text-[10px] uppercase">
              AOIs
            </span>
          )}
          {showForces && (
            <span className="text-[var(--demo)] font-mono text-[10px] uppercase">
              Forces
            </span>
          )}
          {showFirms && (
            <span className="text-[var(--ok)] font-mono text-[10px] uppercase">
              FIRMS {firmsSnap?.status ?? "…"}
            </span>
          )}
          {showSatellites && (
            <span className="text-[var(--ok)] font-mono text-[10px] uppercase">
              SGP4 {satSnap?.status ?? "…"}
            </span>
          )}
          {showAdsb && (
            <span className="text-[#fbbf24] font-mono text-[10px] uppercase">
              ADS-B {adsbSnap?.status ?? "…"} {adsbContacts.length}
            </span>
          )}
          {cursor && (
            <span className="text-[var(--text-faint)] font-mono text-[10px]">
              {cursor.lat.toFixed(3)}° {cursor.lon.toFixed(3)}°
            </span>
          )}
          {showOsintInfra && (
            <span className="text-[var(--ok)] font-mono text-[10px] uppercase">
              OSINT infra
            </span>
          )}
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={() => setShowList((v) => !v)}
            aria-expanded={showList}
          >
            {showList ? "Hide list" : "Accessible list"}
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-[360px] gsm-map-shell">
        <span className="gsm-map-corner gsm-map-corner-tl" aria-hidden />
        <span className="gsm-map-corner gsm-map-corner-tr" aria-hidden />
        <span className="gsm-map-corner gsm-map-corner-bl" aria-hidden />
        <span className="gsm-map-corner gsm-map-corner-br" aria-hidden />
        <span className="gsm-map-north" aria-hidden>
          N
        </span>
        {showAdsb && (
          <TrackBoard
            contacts={adsbContacts}
            selectedId={
              selectedContact?.kind === "adsb" ? selectedContact.id : null
            }
            provenance={
              adsbSnap?.provenance ??
              "adsb.lol military ADS-B (ODbL) · public transponders"
            }
            onSelect={setSelectedContact}
          />
        )}
        {cursor && (
          <div className="gsm-cursor-readout" aria-live="off">
            <span className="text-[var(--accent)]">{formatDms(cursor.lat, cursor.lon)}</span>
            <span className="text-[var(--text-faint)]">
              {cursor.lat.toFixed(4)} {cursor.lon.toFixed(4)}
            </span>
          </div>
        )}
        {events === undefined ? (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] bg-[#0e1520]">
            Loading map…
          </div>
        ) : (
          <div className="absolute inset-0">
            <LeafletMapCanvas
              events={rows}
              selectedEventId={selectedEventId}
              onSelectEvent={onSelect}
              showForces={showForces}
              showSatellites={showSatellites}
              showAois={showAois}
              showRangeRings={showRangeRings}
              showOsintInfra={showOsintInfra}
              showFirms={showFirms}
              showAdsb={showAdsb}
              firmsDetections={firmsDetections}
              liveSatellites={liveSatellites}
              adsbContacts={adsbContacts}
              selectedContact={selectedContact}
              onSelectContact={setSelectedContact}
              mapFocus={mapFocus}
              onCursor={onCursor}
              firmsProvenance={
                firmsSnap?.provenance ??
                "NASA FIRMS — public hotspot detections, not events"
              }
              satProvenance={
                satSnap?.provenance ??
                "CelesTrak GP/OMM · SGP4 at display time"
              }
              adsbProvenance={
                adsbSnap?.provenance ??
                "adsb.lol military ADS-B (ODbL) · public transponders"
              }
            />
          </div>
        )}

        {events && rows.length === 0 && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[1000] rounded border border-[var(--border)] bg-[var(--bg-panel)]/90 px-3 py-1.5 text-xs text-[var(--text-muted)]">
            No events match filters — basemap still active. Adjust filters or
            Refresh.
          </div>
        )}
      </div>

      {showList && (
        <AccessibleEventList events={rows} loading={events === undefined} compact />
      )}
    </section>
  );
}

function AccessibleEventList({
  events,
  loading,
  compact,
}: {
  events: EventRow[];
  loading: boolean;
  compact?: boolean;
}) {
  const { selectedEventId, setSelectedEventId } = useDashboard();
  return (
    <div
      className={`${compact ? "border-t max-h-40" : "flex-1"} overflow-y-auto gsm-scroll border-[var(--border)] bg-[var(--bg-panel)]`}
    >
      <h3 className="sr-only">Mapped events list</h3>
      {loading && (
        <p className="p-3 text-sm text-[var(--text-muted)]">Loading events…</p>
      )}
      {!loading && events.length === 0 && (
        <p className="p-3 text-sm text-[var(--text-muted)]">No events to list.</p>
      )}
      <ul className="divide-y divide-[var(--border)]">
        {events.map((e) => (
          <li key={e._id}>
            <button
              type="button"
              onClick={() => setSelectedEventId(e._id)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-hover)] ${
                selectedEventId === e._id ? "bg-[var(--accent-wash)]" : ""
              }`}
            >
              <span className="font-medium">{e.headline}</span>
              <span className="block text-xs text-[var(--text-muted)]">
                {e.region} · {SEVERITY_LABELS[e.severity as Severity]} ·{" "}
                {formatRelativeTime(e.occurredAt)} ·{" "}
                {CATEGORY_LABELS[e.category as Category]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
