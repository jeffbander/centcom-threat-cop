"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
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
import type { QuakeContact } from "@/convex/lib/quakes";
import type { AisContact } from "@/convex/lib/ais";
import type { LaunchContact } from "@/convex/lib/launches";
import type { AcledContact } from "@/convex/lib/acled";
import { firmsUkraineDelta } from "@/lib/firmsDelta";
import type { SelectedContact } from "./DashboardContext";
import { buildNearbyRoster } from "@/lib/nearby";
import { NearbyRoster } from "./NearbyRoster";
import {
  geodeticFromSatRecord,
  groundTrack,
  satelliteContactId,
  type OmmRecord,
} from "@/lib/sgp4";
import type { LiveSatellite } from "./LeafletMapCanvas";
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
  showSatellites = true,
  showAois = true,
  showOsintInfra = true,
  showFirms = true,
  showAdsb = true,
  showQuakes = true,
  showAis = true,
  showLaunches = true,
  showAcled = true,
}: {
  showSatellites?: boolean;
  showAois?: boolean;
  showOsintInfra?: boolean;
  showFirms?: boolean;
  showAdsb?: boolean;
  showQuakes?: boolean;
  showAis?: boolean;
  showLaunches?: boolean;
  showAcled?: boolean;
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
  const [satNow, setSatNow] = useState(() => Date.now());
  const [snapNow, setSnapNow] = useState(() => Date.now());
  const cursorReadout = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setSnapNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!showSatellites) return;
    const id = setInterval(() => setSatNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [showSatellites]);

  const firmsSnap = useQuery(api.layers.getSnapshot, {
    layer: "firms",
    now: snapNow,
  });
  const satSnap = useQuery(api.layers.getSnapshot, {
    layer: "satellites",
    now: snapNow,
  });
  const adsbSnap = useQuery(api.layers.getSnapshot, {
    layer: "adsb",
    now: snapNow,
  });
  const quakeSnap = useQuery(api.layers.getSnapshot, {
    layer: "quakes",
    now: snapNow,
  });
  const aisSnap = useQuery(api.layers.getSnapshot, {
    layer: "ais",
    now: snapNow,
  });
  const launchSnap = useQuery(api.layers.getSnapshot, {
    layer: "launches",
    now: snapNow,
  });
  const acledSnap = useQuery(api.layers.getSnapshot, {
    layer: "acled",
    now: snapNow,
  });

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
    const trackEpoch = Math.floor(satNow / 15_000) * 15_000;
    const out: LiveSatellite[] = [];
    for (const raw of recs) {
      if (!raw || typeof raw !== "object") continue;
      const omm = raw as OmmRecord;
      const geo = geodeticFromSatRecord(omm, satNow);
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
  }, [satSnap, satNow]);

  const adsbContacts = useMemo((): AdsbContact[] => {
    const recs = adsbSnap?.records;
    if (!Array.isArray(recs)) return [];
    return recs.filter((r): r is AdsbContact => {
      if (!r || typeof r !== "object") return false;
      const a = r as AdsbContact;
      return typeof a.id === "string" && Number.isFinite(a.latitude);
    });
  }, [adsbSnap]);

  const quakeContacts = useMemo((): QuakeContact[] => {
    const recs = quakeSnap?.records;
    if (!Array.isArray(recs)) return [];
    return recs.filter((r): r is QuakeContact => {
      if (!r || typeof r !== "object") return false;
      const q = r as QuakeContact;
      return typeof q.id === "string" && Number.isFinite(q.latitude);
    });
  }, [quakeSnap]);

  const aisContacts = useMemo((): AisContact[] => {
    const recs = aisSnap?.records;
    if (!Array.isArray(recs)) return [];
    return recs.filter((r): r is AisContact => {
      if (!r || typeof r !== "object") return false;
      const a = r as AisContact;
      return typeof a.id === "string" && Number.isFinite(a.latitude);
    });
  }, [aisSnap]);

  const launchContacts = useMemo((): LaunchContact[] => {
    const recs = launchSnap?.records;
    if (!Array.isArray(recs)) return [];
    return recs.filter((r): r is LaunchContact => {
      if (!r || typeof r !== "object") return false;
      const a = r as LaunchContact;
      return typeof a.id === "string" && Number.isFinite(a.latitude);
    });
  }, [launchSnap]);

  const acledContacts = useMemo((): AcledContact[] => {
    const recs = acledSnap?.records;
    if (!Array.isArray(recs)) return [];
    return recs.filter((r): r is AcledContact => {
      if (!r || typeof r !== "object") return false;
      const a = r as AcledContact;
      return typeof a.id === "string" && Number.isFinite(a.latitude);
    });
  }, [acledSnap]);

  const uaFirmsDelta = useMemo(
    () => firmsUkraineDelta(firmsDetections, satNow),
    [firmsDetections, satNow],
  );
  const firmsHighlightIds = useMemo(
    () => new Set(uaFirmsDelta.last24.map((d) => d.id)),
    [uaFirmsDelta],
  );

  const rosterContacts = useMemo((): SelectedContact[] => {
    const out: SelectedContact[] = [];
    for (const a of adsbContacts) {
      out.push({
        kind: "adsb",
        id: a.id,
        latitude: a.latitude,
        longitude: a.longitude,
        title: a.callsign,
        subtitle: a.typeCode,
        details: [],
        provenance: adsbSnap?.provenance ?? "",
      });
    }
    for (const a of aisContacts) {
      out.push({
        kind: "ais",
        id: a.id,
        latitude: a.latitude,
        longitude: a.longitude,
        title: a.name,
        subtitle: a.shipTypeLabel,
        details: [],
        provenance: aisSnap?.provenance ?? "",
      });
    }
    for (const q of quakeContacts) {
      out.push({
        kind: "quake",
        id: q.id,
        latitude: q.latitude,
        longitude: q.longitude,
        title: q.title,
        subtitle: `M${q.magnitude.toFixed(1)}`,
        details: [],
        provenance: quakeSnap?.provenance ?? "",
      });
    }
    for (const ln of launchContacts) {
      out.push({
        kind: "launch",
        id: ln.id,
        latitude: ln.latitude,
        longitude: ln.longitude,
        title: ln.name,
        subtitle: ln.status,
        details: [],
        provenance: launchSnap?.provenance ?? "",
      });
    }
    for (const a of acledContacts) {
      out.push({
        kind: "acled",
        id: a.id,
        latitude: a.latitude,
        longitude: a.longitude,
        title: `${a.eventType} · ${a.location}`,
        subtitle: a.subEventType,
        details: [],
        provenance: acledSnap?.provenance ?? "",
      });
    }
    return out;
  }, [
    adsbContacts,
    aisContacts,
    quakeContacts,
    launchContacts,
    acledContacts,
    adsbSnap,
    aisSnap,
    quakeSnap,
    launchSnap,
    acledSnap,
  ]);

  const nearbyItems = useMemo(() => {
    const origin = selectedContact
      ? {
          latitude: selectedContact.latitude,
          longitude: selectedContact.longitude,
        }
      : null;
    return buildNearbyRoster(origin, rosterContacts, 250);
  }, [selectedContact, rosterContacts]);

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
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 border-b border-[var(--border)] text-xs text-[var(--text-muted)] overflow-hidden">
        <span className="font-mono uppercase tracking-[0.14em] text-[var(--accent)]">
          COP · common operating picture
        </span>
        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto min-w-0 justify-end">
          <span className="text-[var(--text-faint)] font-mono text-[10px]">
            ESRI imagery
          </span>
          {showAois && (
            <span className="text-[var(--high)] font-mono text-[10px] uppercase">
              AOIs
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
          {showAis && (
            <span className="text-[#22d3ee] font-mono text-[10px] uppercase">
              AIS {aisSnap?.status ?? "…"} {aisContacts.length}
            </span>
          )}
          {showQuakes && (
            <span className="text-[#fb7185] font-mono text-[10px] uppercase">
              USGS {quakeSnap?.status ?? "…"} {quakeContacts.length}
            </span>
          )}
          {showLaunches && (
            <span className="text-[#c4b5fd] font-mono text-[10px] uppercase">
              LL2 {launchSnap?.status ?? "…"} {launchContacts.length}
            </span>
          )}
          {showAcled && (
            <span className="text-[#ef4444] font-mono text-[10px] uppercase">
              ACLED {acledSnap?.status ?? "…"} {acledContacts.length}
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

      <div className="relative flex-1 min-h-0 gsm-map-shell">
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
        <NearbyRoster
          items={nearbyItems}
          selectedId={selectedContact?.id ?? null}
          onSelect={setSelectedContact}
        />
        <div
          ref={cursorReadout}
          className="gsm-cursor-readout"
          aria-live="off"
          style={{ display: "none" }}
        >
          <span data-dms className="text-[var(--accent)]" />
          <span data-dec className="text-[var(--text-faint)]" />
        </div>
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
              showSatellites={showSatellites}
              showAois={showAois}
              showOsintInfra={showOsintInfra}
              showFirms={showFirms}
              showAdsb={showAdsb}
              showQuakes={showQuakes}
              showAis={showAis}
              showLaunches={showLaunches}
              showAcled={showAcled}
              firmsDetections={firmsDetections}
              liveSatellites={liveSatellites}
              adsbContacts={adsbContacts}
              quakeContacts={quakeContacts}
              aisContacts={aisContacts}
              launchContacts={launchContacts}
              acledContacts={acledContacts}
              firmsHighlightIds={firmsHighlightIds}
              selectedContact={selectedContact}
              onSelectContact={setSelectedContact}
              mapFocus={mapFocus}
              cursorReadout={cursorReadout}
              firmsProvenance={
                firmsSnap?.provenance ??
                "NASA FIRMS VIIRS 24h"
              }
              satProvenance={
                satSnap?.provenance ??
                "CelesTrak GP/OMM · SGP4 at display time"
              }
              adsbProvenance={
                adsbSnap?.provenance ??
                "adsb.lol military ADS-B (ODbL) · public transponders"
              }
              quakeProvenance={
                quakeSnap?.provenance ??
                "USGS M2.5+ 24h"
              }
              aisProvenance={
                aisSnap?.provenance ??
                "Open Waters AIS"
              }
              launchProvenance={
                launchSnap?.provenance ??
                "Launch Library 2"
              }
              acledProvenance={
                acledSnap?.provenance ?? "ACLED Ukraine"
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
