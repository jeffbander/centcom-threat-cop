"use client";

/**
 * Live COP overlays on Esri imagery. Contacts are public feeds.
 */

import { Fragment, useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Popup,
  Tooltip,
  Polyline,
  Polygon,
  Marker,
  ScaleControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  type Category,
  type Severity,
} from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";
import { THEATER_AOIS } from "@/lib/showOverlays";
import type { FirmsDetection } from "@/convex/lib/firms";
import type { AdsbContact } from "@/convex/lib/adsb";
import type { QuakeContact } from "@/convex/lib/quakes";
import type { AisContact } from "@/convex/lib/ais";
import type { LaunchContact } from "@/convex/lib/launches";
import type { AcledContact } from "@/convex/lib/acled";
import { acledTone } from "@/convex/lib/acled";
import type { SelectedContact } from "./DashboardContext";
import { explainFirms } from "@/lib/firmsExplain";
import type { GroundTrack } from "@/lib/sgp4";
import { destinationPoint } from "@/lib/spatialJoin";
import {
  OSINT_CABLES,
  OSINT_KIND_COLOR,
  OSINT_KIND_GLYPH,
  OSINT_KIND_LABEL,
  OSINT_SITES,
  type OsintKind,
} from "@/lib/osintOverlays";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

export type MapEvent = {
  _id: Id<"events">;
  headline: string;
  category: Category;
  severity: Severity;
  region: string;
  latitude: number;
  longitude: number;
  occurredAt: number;
  summary: string;
  isSynthetic?: boolean;
};

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  moderate: "#eab308",
  informational: "#94a3b8",
};

function osintIcon(kind: OsintKind, name: string) {
  const color = OSINT_KIND_COLOR[kind];
  const glyph = OSINT_KIND_GLYPH[kind];
  const safe = name.replace(/"/g, "");
  return L.divIcon({
    className: "gsm-osint-icon",
    html: `<div title="${safe}" style="
      width:18px;height:18px;
      background:#0b0f14ee;
      border:1px solid ${color};
      color:${color};
      box-shadow:0 0 6px ${color}44;
      display:flex;align-items:center;justify-content:center;
      font:700 10px/1 ui-monospace,monospace;
    ">${glyph}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function OsintInfraLayer() {
  return (
    <>
      {OSINT_CABLES.map((cable) => (
        <Fragment key={cable.id}>
          <Polyline
            positions={cable.path}
            pathOptions={{
              color: OSINT_KIND_COLOR.cable,
              weight: 2,
              opacity: 0.55,
              dashArray: "6 5",
            }}
          >
            <Tooltip sticky>
              <div className="text-xs max-w-[220px]">
                <div className="font-semibold" style={{ color: OSINT_KIND_COLOR.cable }}>
                  {cable.name}
                </div>
                <div className="text-[10px] opacity-70">{cable.note}</div>
                <div className="text-[10px] uppercase tracking-wide mt-0.5">
                  Approximate corridor · not the true cable
                </div>
              </div>
            </Tooltip>
          </Polyline>
        </Fragment>
      ))}
      {OSINT_SITES.map((site) => (
        <Marker
          key={site.id}
          position={[site.latitude, site.longitude]}
          icon={osintIcon(site.kind, site.name)}
          zIndexOffset={400}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <div className="text-xs max-w-[240px]">
              <div className="font-bold text-[10px] uppercase tracking-wide opacity-70">
                {OSINT_KIND_LABEL[site.kind]}
              </div>
              <div className="font-semibold" style={{ color: OSINT_KIND_COLOR[site.kind] }}>
                {site.name}
              </div>
              <div className="opacity-80">{site.country}</div>
              <div className="text-[10px] opacity-70 mt-0.5">{site.note}</div>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}

function satIcon(color: string, name: string) {
  return L.divIcon({
    className: "gsm-sat-icon",
    html: `<div style="position:relative;width:14px;height:14px">
      <div style="
        width:12px;height:12px;border-radius:2px;transform:rotate(45deg);
        background:${color};border:1px solid #0b0f14;
        box-shadow:0 0 10px ${color}, 0 0 2px #fff;
      "></div>
      <div style="
        position:absolute;left:16px;top:-2px;white-space:nowrap;
        color:${color};font:700 9px/1 ui-monospace,monospace;
        text-shadow:0 0 4px #000,0 1px 2px #000;
      ">${name}</div>
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export type LiveSatellite = {
  id: string;
  name: string;
  norad: string;
  latitude: number;
  longitude: number;
  altitudeKm: number;
  track?: GroundTrack;
};

function CursorHud({
  onCursor,
}: {
  onCursor: (lat: number, lon: number) => void;
}) {
  const last = useRef(0);
  useMapEvents({
    mousemove(e) {
      const t = performance.now();
      if (t - last.current < 80) return;
      last.current = t;
      onCursor(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitOrFocus({
  events,
  selectedId,
  selectedContact,
  mapFocus,
}: {
  events: MapEvent[];
  selectedId: Id<"events"> | null;
  selectedContact: SelectedContact | null;
  mapFocus: { latitude: number; longitude: number; zoom: number; nonce: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedId) {
      const e = events.find((x) => x._id === selectedId);
      if (e) {
        map.flyTo([e.latitude, e.longitude], Math.max(map.getZoom(), 5), {
          duration: 0.55,
        });
      }
    }
  }, [selectedId, events, map]);

  useEffect(() => {
    if (selectedContact) {
      map.flyTo(
        [selectedContact.latitude, selectedContact.longitude],
        Math.max(map.getZoom(), 4),
        { duration: 0.55 },
      );
    }
  }, [selectedContact, map]);

  useEffect(() => {
    map.setView([28, 40], 3);
  }, [map]);

  useEffect(() => {
    if (!mapFocus) return;
    map.flyTo([mapFocus.latitude, mapFocus.longitude], mapFocus.zoom, {
      duration: 0.7,
    });
  }, [mapFocus, map]);

  return null;
}

function aircraftIcon(
  trackDeg: number | null,
  military: boolean,
  callsign: string,
  selected: boolean,
) {
  const color = military ? "#fbbf24" : "#38bdf8";
  const rot = trackDeg ?? 0;
  const safe = callsign.replace(/"/g, "");
  return L.divIcon({
    className: "gsm-adsb-icon",
    html: `<div style="transform:rotate(${rot}deg);width:16px;height:16px">
      <div title="${safe}" style="
        width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
        border-bottom:14px solid ${selected ? "#e8eef6" : color};
        filter:drop-shadow(0 0 4px ${color});
        margin-left:3px;
      "></div>
    </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function LiveSatelliteLayer({
  satellites,
  selectedId,
  onSelect,
  provenance,
}: {
  satellites: LiveSatellite[];
  selectedId: string | null;
  onSelect: (c: SelectedContact) => void;
  provenance: string;
}) {
  const color = "#a78bfa";
  return (
    <>
      {satellites.map((sat) => {
        const selected = selectedId === sat.id;
        return (
          <Fragment key={sat.id}>
          {(sat.track ?? []).map((seg, i) =>
            seg.length >= 2 ? (
              <Polyline
                key={`${sat.id}-trk-${i}`}
                positions={seg}
                pathOptions={{
                  color,
                  weight: selected ? 2 : 1,
                  opacity: selected ? 0.85 : 0.4,
                  dashArray: "4 6",
                }}
              />
            ) : null,
          )}
          <Marker
            key={sat.id}
            position={[sat.latitude, sat.longitude]}
            icon={satIcon(selected ? "#e8eef6" : color, sat.name)}
            zIndexOffset={selected ? 900 : 500}
            eventHandlers={{
              click: () =>
                onSelect({
                  kind: "satellite",
                  id: sat.id,
                  latitude: sat.latitude,
                  longitude: sat.longitude,
                  title: sat.name,
                  subtitle: `NORAD ${sat.norad} · CelesTrak GP · SGP4`,
                  details: [
                    { label: "NORAD", value: sat.norad },
                    {
                      label: "Lat",
                      value: `${sat.latitude.toFixed(3)}°`,
                    },
                    {
                      label: "Lon",
                      value: `${sat.longitude.toFixed(3)}°`,
                    },
                    {
                      label: "Alt",
                      value: `${sat.altitudeKm.toFixed(0)} km`,
                    },
                  ],
                  provenance,
                }),
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.98}>
              <div className="text-xs min-w-[160px]">
                <div className="font-bold" style={{ color }}>
                  {sat.name}
                </div>
                <div className="opacity-80">
                  NORAD {sat.norad} · CelesTrak GP · SGP4
                </div>
                <div className="text-[10px] opacity-60 font-mono mt-0.5">
                  {sat.latitude.toFixed(2)}°, {sat.longitude.toFixed(2)}° ·{" "}
                  {sat.altitudeKm.toFixed(0)} km
                </div>
              </div>
            </Tooltip>
          </Marker>
          </Fragment>
        );
      })}
    </>
  );
}

function AdsbLayer({
  contacts,
  selectedId,
  onSelect,
  provenance,
}: {
  contacts: AdsbContact[];
  selectedId: string | null;
  onSelect: (c: SelectedContact) => void;
  provenance: string;
}) {
  return (
    <>
      {contacts.map((ac) => {
        const selected = selectedId === ac.id;
        const tick =
          ac.trackDeg != null
            ? destinationPoint(ac, ac.trackDeg, selected ? 40 : 22)
            : null;
        const color = ac.military ? "#fbbf24" : "#38bdf8";
        return (
          <Fragment key={ac.id}>
          {tick ? (
            <Polyline
              positions={[
                [ac.latitude, ac.longitude],
                [tick.latitude, tick.longitude],
              ]}
              pathOptions={{
                color,
                weight: selected ? 2 : 1,
                opacity: selected ? 0.9 : 0.55,
              }}
            />
          ) : null}
          <Marker
            position={[ac.latitude, ac.longitude]}
            icon={aircraftIcon(ac.trackDeg, ac.military, ac.callsign, selected)}
            zIndexOffset={selected ? 950 : 700}
            eventHandlers={{
              click: () =>
                onSelect({
                  kind: "adsb",
                  id: ac.id,
                  latitude: ac.latitude,
                  longitude: ac.longitude,
                  title: ac.callsign,
                  subtitle: `${ac.military ? "MIL" : "CIV"} · ${ac.typeCode || "type?"} · ADS-B`,
                  details: [
                    { label: "ICAO", value: ac.hex.toUpperCase() },
                    { label: "Reg", value: ac.registration || "—" },
                    { label: "Type", value: ac.typeCode || "—" },
                    {
                      label: "Alt",
                      value:
                        ac.altitudeFt != null ? `${Math.round(ac.altitudeFt)} ft` : "—",
                    },
                    {
                      label: "GS",
                      value:
                        ac.groundSpeedKt != null
                          ? `${Math.round(ac.groundSpeedKt)} kt`
                          : "—",
                    },
                    {
                      label: "Trk",
                      value:
                        ac.trackDeg != null ? `${Math.round(ac.trackDeg)}°` : "—",
                    },
                  ],
                  provenance,
                }),
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <div className="text-xs">
                <div className="font-bold">{ac.callsign}</div>
                <div className="opacity-80">
                  {ac.military ? "MIL" : "CIV"} · {ac.typeCode || "?"} ·{" "}
                  {ac.altitudeFt != null ? `${Math.round(ac.altitudeFt)} ft` : "alt?"}
                </div>
              </div>
            </Tooltip>
          </Marker>
          </Fragment>
        );
      })}
    </>
  );
}

function shipIcon(
  headingDeg: number | null,
  kind: string,
  selected: boolean,
) {
  const color =
    kind === "military" ? "#fbbf24" : kind === "tanker" ? "#fb923c" : "#22d3ee";
  const rot = headingDeg ?? 0;
  return L.divIcon({
    className: "gsm-ais-icon",
    html: `<div style="transform:rotate(${rot}deg);width:14px;height:14px">
      <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:12px solid ${
        selected ? "#e8eef6" : color
      };margin-left:3px;filter:drop-shadow(0 0 4px ${color})"></div>
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function launchIcon(selected: boolean) {
  const color = selected ? "#e8eef6" : "#c4b5fd";
  return L.divIcon({
    className: "gsm-launch-icon",
    html: `<div style="width:14px;height:14px;color:${color};font:700 12px/14px ui-monospace,monospace;text-shadow:0 0 6px #000">▲</div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function AisLayer({
  contacts,
  selectedId,
  onSelect,
  provenance,
}: {
  contacts: AisContact[];
  selectedId: string | null;
  onSelect: (c: SelectedContact) => void;
  provenance: string;
}) {
  return (
    <>
      {contacts.map((v) => {
        const selected = selectedId === v.id;
        const hdg = v.headingDeg ?? v.cogDeg;
        const tick =
          hdg != null ? destinationPoint(v, hdg, selected ? 18 : 10) : null;
        const color =
          v.shipTypeLabel === "military"
            ? "#fbbf24"
            : v.shipTypeLabel === "tanker"
              ? "#fb923c"
              : "#22d3ee";
        return (
          <Fragment key={v.id}>
            {tick ? (
              <Polyline
                positions={[
                  [v.latitude, v.longitude],
                  [tick.latitude, tick.longitude],
                ]}
                pathOptions={{
                  color,
                  weight: selected ? 2 : 1,
                  opacity: selected ? 0.9 : 0.5,
                }}
              />
            ) : null}
            <Marker
              position={[v.latitude, v.longitude]}
              icon={shipIcon(hdg, v.shipTypeLabel, selected)}
              zIndexOffset={selected ? 940 : 680}
              eventHandlers={{
                click: () =>
                  onSelect({
                    kind: "ais",
                    id: v.id,
                    latitude: v.latitude,
                    longitude: v.longitude,
                    title: v.name,
                    subtitle: `${v.shipTypeLabel.toUpperCase()} · MMSI ${v.mmsi} · AIS`,
                    details: [
                      { label: "MMSI", value: v.mmsi },
                      { label: "Type", value: v.shipTypeLabel },
                      {
                        label: "SOG",
                        value: v.sogKt != null ? `${v.sogKt.toFixed(1)} kt` : "—",
                      },
                      {
                        label: "HDG",
                        value: hdg != null ? `${Math.round(hdg)}°` : "—",
                      },
                    ],
                    provenance,
                  }),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <div className="text-xs">
                  <div className="font-bold">{v.name}</div>
                  <div className="opacity-80">
                    {v.shipTypeLabel} · MMSI {v.mmsi}
                    {v.sogKt != null ? ` · ${v.sogKt.toFixed(0)} kt` : ""}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          </Fragment>
        );
      })}
    </>
  );
}

function QuakesLayer({
  contacts,
  selectedId,
  onSelect,
  provenance,
}: {
  contacts: QuakeContact[];
  selectedId: string | null;
  onSelect: (c: SelectedContact) => void;
  provenance: string;
}) {
  return (
    <>
      {contacts.map((q) => {
        const selected = selectedId === q.id;
        const fill =
          q.magnitude >= 6 ? "#ef4444" : q.magnitude >= 4.5 ? "#fb7185" : "#fbbf24";
        return (
          <CircleMarker
            key={q.id}
            center={[q.latitude, q.longitude]}
            radius={selected ? 10 : 4 + q.magnitude}
            pathOptions={{
              color: selected ? "#e8eef6" : fill,
              weight: selected ? 2 : 1,
              fillColor: fill,
              fillOpacity: 0.35,
            }}
            eventHandlers={{
              click: () =>
                onSelect({
                  kind: "quake",
                  id: q.id,
                  latitude: q.latitude,
                  longitude: q.longitude,
                  title: `M${q.magnitude.toFixed(1)} ${q.place}`,
                  subtitle: "USGS earthquake",
                  details: [
                    { label: "Mag", value: q.magnitude.toFixed(1) },
                    { label: "Depth", value: `${q.depthKm.toFixed(0)} km` },
                    {
                      label: "When",
                      value: q.occurredAt
                        ? new Date(q.occurredAt).toISOString().slice(0, 16) + "Z"
                        : "—",
                    },
                    { label: "Tsunami", value: q.tsunami ? "flag" : "no" },
                  ],
                  provenance,
                }),
            }}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              <div className="text-xs">
                <div className="font-semibold">M{q.magnitude.toFixed(1)}</div>
                <div className="opacity-80">{q.place}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

function LaunchesLayer({
  contacts,
  selectedId,
  onSelect,
  provenance,
}: {
  contacts: LaunchContact[];
  selectedId: string | null;
  onSelect: (c: SelectedContact) => void;
  provenance: string;
}) {
  return (
    <>
      {contacts.map((ln) => {
        const selected = selectedId === ln.id;
        return (
          <Marker
            key={ln.id}
            position={[ln.latitude, ln.longitude]}
            icon={launchIcon(selected)}
            zIndexOffset={selected ? 960 : 720}
            eventHandlers={{
              click: () =>
                onSelect({
                  kind: "launch",
                  id: ln.id,
                  latitude: ln.latitude,
                  longitude: ln.longitude,
                  title: ln.name,
                  subtitle: `${ln.status} · ${ln.rocket} · LL2`,
                  details: [
                    { label: "NET", value: new Date(ln.netAt).toISOString().slice(0, 16) + "Z" },
                    { label: "Pad", value: ln.pad },
                    { label: "Site", value: ln.location },
                    { label: "LSP", value: ln.provider },
                    { label: "Status", value: ln.status },
                  ],
                  provenance,
                }),
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <div className="text-xs max-w-[220px]">
                <div className="font-bold">{ln.name}</div>
                <div className="opacity-80">
                  {ln.status} · {ln.pad}
                </div>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}

function AcledLayer({
  contacts,
  selectedId,
  onSelect,
  provenance,
}: {
  contacts: AcledContact[];
  selectedId: string | null;
  onSelect: (c: SelectedContact) => void;
  provenance: string;
}) {
  return (
    <>
      {contacts.map((e) => {
        const selected = selectedId === e.id;
        const fill = acledTone(e.eventType);
        return (
          <CircleMarker
            key={e.id}
            center={[e.latitude, e.longitude]}
            radius={selected ? 9 : e.fatalities > 0 ? 7 : 5}
            pathOptions={{
              color: selected ? "#e8eef6" : fill,
              weight: selected ? 2 : 1,
              fillColor: fill,
              fillOpacity: 0.75,
            }}
            eventHandlers={{
              click: () =>
                onSelect({
                  kind: "acled",
                  id: e.id,
                  latitude: e.latitude,
                  longitude: e.longitude,
                  title: `${e.eventType} · ${e.location}`,
                  subtitle: `${e.subEventType || e.eventType} · ACLED`,
                  details: [
                    { label: "Date", value: e.eventDate },
                    { label: "Admin", value: e.admin1 || "—" },
                    { label: "Actor 1", value: e.actor1 || "—" },
                    { label: "Actor 2", value: e.actor2 || "—" },
                    { label: "Killed", value: String(e.fatalities) },
                    { label: "Notes", value: e.notes || "—" },
                  ],
                  provenance,
                }),
            }}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              <div className="text-xs max-w-[240px]">
                <div className="font-semibold">{e.eventType}</div>
                <div className="opacity-80">
                  {e.location} · {e.eventDate}
                  {e.fatalities ? ` · ${e.fatalities} killed` : ""}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

function FirmsLayer({
  detections,
  selectedId,
  onSelect,
  provenance,
  highlightIds,
}: {
  detections: FirmsDetection[];
  selectedId: string | null;
  onSelect: (c: SelectedContact) => void;
  provenance: string;
  highlightIds?: Set<string>;
}) {
  return (
    <>
      {detections.map((d) => {
        const selected = selectedId === d.id;
        const hot = highlightIds?.has(d.id) ?? false;
        const fill = d.frp >= 30 ? "#ef4444" : d.frp >= 10 ? "#f97316" : "#fbbf24";
        const view = explainFirms(d, detections, Date.now(), provenance);
        return (
          <CircleMarker
            key={d.id}
            center={[d.latitude, d.longitude]}
            radius={selected ? 9 : hot ? 8 : 5}
            pathOptions={{
              color: selected ? "#e8eef6" : hot ? "#fecaca" : "#0b0f14",
              weight: selected || hot ? 2 : 1,
              fillColor: fill,
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: () => onSelect(view),
            }}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              <div className="text-xs">
                <div className="font-semibold">{view.tooltip}</div>
                <div className="opacity-80">NASA FIRMS heat pixel</div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

export default function LeafletMapCanvas({
  events,
  selectedEventId,
  onSelectEvent,
  showSatellites,
  showAois = true,
  showOsintInfra = true,
  showFirms = true,
  showAdsb = true,
  showQuakes = true,
  showAis = true,
  showLaunches = true,
  showAcled = true,
  firmsDetections = [],
  liveSatellites = [],
  adsbContacts = [],
  quakeContacts = [],
  aisContacts = [],
  launchContacts = [],
  acledContacts = [],
  firmsHighlightIds,
  selectedContact = null,
  onSelectContact,
  firmsProvenance = "NASA FIRMS",
  satProvenance = "CelesTrak GP · SGP4",
  adsbProvenance = "adsb.lol military ADS-B",
  quakeProvenance = "USGS earthquakes",
  aisProvenance = "Open Waters AIS",
  launchProvenance = "Launch Library 2",
  acledProvenance = "ACLED Ukraine",
  mapFocus = null,
  onCursor,
}: {
  events: MapEvent[];
  selectedEventId: Id<"events"> | null;
  onSelectEvent: (id: Id<"events">) => void;
  showSatellites: boolean;
  showAois?: boolean;
  showOsintInfra?: boolean;
  showFirms?: boolean;
  showAdsb?: boolean;
  showQuakes?: boolean;
  showAis?: boolean;
  showLaunches?: boolean;
  showAcled?: boolean;
  firmsDetections?: FirmsDetection[];
  liveSatellites?: LiveSatellite[];
  adsbContacts?: AdsbContact[];
  quakeContacts?: QuakeContact[];
  aisContacts?: AisContact[];
  launchContacts?: LaunchContact[];
  acledContacts?: AcledContact[];
  firmsHighlightIds?: Set<string>;
  selectedContact?: SelectedContact | null;
  onSelectContact?: (c: SelectedContact) => void;
  firmsProvenance?: string;
  satProvenance?: string;
  adsbProvenance?: string;
  quakeProvenance?: string;
  aisProvenance?: string;
  launchProvenance?: string;
  acledProvenance?: string;
  mapFocus?: { latitude: number; longitude: number; zoom: number; nonce: number } | null;
  onCursor?: (lat: number, lon: number) => void;
}) {
  const validEvents = useMemo(
    () =>
      events.filter(
        (e) =>
          Number.isFinite(e.latitude) &&
          Number.isFinite(e.longitude) &&
          Math.abs(e.latitude) <= 90 &&
          Math.abs(e.longitude) <= 180,
      ),
    [events],
  );

  return (
    <MapContainer
      center={[28, 40]}
      zoom={3}
      minZoom={2}
      maxZoom={12}
      className="gsm-leaflet-map h-full w-full min-h-[320px] z-0"
      worldCopyJump
      scrollWheelZoom
    >
      <TileLayer
        attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics · overlays sensitive'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
      />
      <TileLayer
        attribution=""
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
        opacity={0.85}
      />

      <FitOrFocus
        events={validEvents}
        selectedId={selectedEventId}
        selectedContact={selectedContact}
        mapFocus={mapFocus}
      />
      {onCursor ? <CursorHud onCursor={onCursor} /> : null}
      <ScaleControl position="bottomleft" imperial={false} maxWidth={120} />

      {/* Theater AOIs */}
      {showAois &&
        THEATER_AOIS.map((ao) => (
          <Polygon
            key={ao.id}
            positions={ao.polygon}
            pathOptions={{
              color: ao.color,
              weight: 1.5,
              dashArray: "8 6",
              fillColor: ao.color,
              fillOpacity: 0.06,
            }}
          >
            <Tooltip sticky>
              <div className="text-xs font-mono">
                <strong>{ao.name}</strong> · {ao.status}
              </div>
            </Tooltip>
          </Polygon>
        ))}

      {showFirms && onSelectContact && (
        <FirmsLayer
          detections={firmsDetections}
          selectedId={selectedContact?.kind === "firms" ? selectedContact.id : null}
          onSelect={onSelectContact}
          provenance={firmsProvenance}
          highlightIds={firmsHighlightIds}
        />
      )}

      {showSatellites && onSelectContact && (
        <LiveSatelliteLayer
          satellites={liveSatellites}
          selectedId={
            selectedContact?.kind === "satellite" ? selectedContact.id : null
          }
          onSelect={onSelectContact}
          provenance={satProvenance}
        />
      )}

      {showAdsb && onSelectContact && (
        <AdsbLayer
          contacts={adsbContacts}
          selectedId={selectedContact?.kind === "adsb" ? selectedContact.id : null}
          onSelect={onSelectContact}
          provenance={adsbProvenance}
        />
      )}

      {showAis && onSelectContact && (
        <AisLayer
          contacts={aisContacts}
          selectedId={selectedContact?.kind === "ais" ? selectedContact.id : null}
          onSelect={onSelectContact}
          provenance={aisProvenance}
        />
      )}

      {showQuakes && onSelectContact && (
        <QuakesLayer
          contacts={quakeContacts}
          selectedId={selectedContact?.kind === "quake" ? selectedContact.id : null}
          onSelect={onSelectContact}
          provenance={quakeProvenance}
        />
      )}

      {showLaunches && onSelectContact && (
        <LaunchesLayer
          contacts={launchContacts}
          selectedId={selectedContact?.kind === "launch" ? selectedContact.id : null}
          onSelect={onSelectContact}
          provenance={launchProvenance}
        />
      )}

      {showAcled && onSelectContact && (
        <AcledLayer
          contacts={acledContacts}
          selectedId={selectedContact?.kind === "acled" ? selectedContact.id : null}
          onSelect={onSelectContact}
          provenance={acledProvenance}
        />
      )}

      {selectedContact &&
        [50_000, 150_000].map((meters) => (
          <Circle
            key={`ring-${meters}`}
            center={[selectedContact.latitude, selectedContact.longitude]}
            radius={meters}
            pathOptions={{
              color: "#e8eef6",
              weight: meters === 50_000 ? 1.25 : 1,
              dashArray: meters === 50_000 ? "2 6" : "1 8",
              fillOpacity: meters === 50_000 ? 0.03 : 0,
              opacity: meters === 50_000 ? 0.85 : 0.4,
            }}
          />
        ))}

      {showOsintInfra && <OsintInfraLayer />}

      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={40}
        spiderfyOnMaxZoom
        showCoverageOnHover={false}
      >
        {validEvents.map((e) => {
          const color = SEVERITY_COLOR[e.severity];
          const selected = selectedEventId === e._id;
          return (
            <CircleMarker
              key={e._id}
              center={[e.latitude, e.longitude]}
              radius={selected ? 11 : 7}
              pathOptions={{
                color: selected ? "#e8eef6" : "#0b0f14",
                weight: selected ? 2 : 1,
                fillColor: color,
                fillOpacity: 0.92,
              }}
              eventHandlers={{
                click: () => onSelectEvent(e._id),
              }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
                <div className="text-xs max-w-[260px]">
                  <div className="font-semibold">{e.headline}</div>
                  <div className="opacity-80">
                    {CATEGORY_LABELS[e.category]} ·{" "}
                    {SEVERITY_LABELS[e.severity]} · {e.region} ·{" "}
                    {formatRelativeTime(e.occurredAt)}
                  </div>
                </div>
              </Tooltip>
              <Popup>
                <div className="text-sm max-w-[280px] text-[#0b0f14]">
                  <p className="font-semibold m-0 mb-1">{e.headline}</p>
                  <p className="m-0 mb-1 text-xs opacity-80">
                    {CATEGORY_LABELS[e.category]} ·{" "}
                    {SEVERITY_LABELS[e.severity]} · {e.region}
                  </p>
                  <p className="m-0 text-xs line-clamp-3">{e.summary}</p>
                  <button
                    type="button"
                    className="mt-2 text-xs underline"
                    onClick={() => onSelectEvent(e._id)}
                  >
                    Open detail
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MarkerClusterGroup>

    </MapContainer>
  );
}
