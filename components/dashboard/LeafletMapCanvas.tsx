"use client";

/**
 * Real basemap + military COP overlays (Leaflet + free Carto dark tiles).
 * FIRMS + CelesTrak SGP4 are live contacts. Force markers stay illustrative.
 */

import { Fragment, useEffect, useMemo } from "react";
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
  useMap,
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
import {
  ILLUSTRATIVE_UNITS,
  KIND_GLYPH,
  SIDE_COLOR,
  THEATER_AOIS,
  type ForceSide,
  type UnitKind,
} from "@/lib/showOverlays";
import type { FirmsDetection } from "@/convex/lib/firms";
import type { SelectedContact } from "./DashboardContext";
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

function forceIcon(side: ForceSide, kind: UnitKind, callsign?: string) {
  const color = SIDE_COLOR[side];
  const glyph = KIND_GLYPH[kind] ?? "●";
  // NATO-ish: blue rounded rect, red diamond via rotate
  const borderRadius = side === "red" ? "2px" : side === "blue" ? "3px" : "50%";
  const transform = side === "red" ? "rotate(45deg)" : "none";
  const innerTransform = side === "red" ? "rotate(-45deg)" : "none";
  const safeCs = (callsign ?? "").replace(/"/g, "");
  return L.divIcon({
    className: "gsm-force-icon",
    html: `<div title="${safeCs}" style="
      width:26px;height:26px;
      background:#0b0f14ee;
      border:2px solid ${color};
      border-radius:${borderRadius};
      transform:${transform};
      color:${color};
      box-shadow:0 0 8px ${color}55, 0 0 0 1px #000;
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:${innerTransform};font-size:12px;line-height:1;font-family:ui-monospace,monospace">${glyph}</span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

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
};

function FitOrFocus({
  events,
  selectedId,
  selectedContact,
}: {
  events: MapEvent[];
  selectedId: Id<"events"> | null;
  selectedContact: SelectedContact | null;
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

  return null;
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
}: {
  detections: FirmsDetection[];
  selectedId: string | null;
  onSelect: (c: SelectedContact) => void;
  provenance: string;
}) {
  return (
    <>
      {detections.map((d) => {
        const selected = selectedId === d.id;
        const fill = d.frp >= 30 ? "#ef4444" : d.frp >= 10 ? "#f97316" : "#fbbf24";
        return (
          <CircleMarker
            key={d.id}
            center={[d.latitude, d.longitude]}
            radius={selected ? 9 : 5}
            pathOptions={{
              color: selected ? "#e8eef6" : "#0b0f14",
              weight: selected ? 2 : 1,
              fillColor: fill,
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: () =>
                onSelect({
                  kind: "firms",
                  id: d.id,
                  latitude: d.latitude,
                  longitude: d.longitude,
                  title: `FIRMS ${d.satellite} ${d.instrument}`,
                  subtitle: `FRP ${d.frp.toFixed(1)} MW · contact, not an event`,
                  details: [
                    { label: "FRP", value: `${d.frp.toFixed(1)} MW` },
                    { label: "Sensor", value: `${d.satellite} ${d.instrument}` },
                    {
                      label: "Acquired",
                      value: new Date(d.acquiredAt).toISOString().slice(0, 16) + "Z",
                    },
                    { label: "Confidence", value: d.confidence || "—" },
                    {
                      label: "Lat/Lon",
                      value: `${d.latitude.toFixed(3)}, ${d.longitude.toFixed(3)}`,
                    },
                  ],
                  provenance,
                }),
            }}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              <div className="text-xs">
                <div className="font-semibold">FIRMS hotspot</div>
                <div className="opacity-80">
                  FRP {d.frp.toFixed(1)} MW · {d.satellite} {d.instrument}
                </div>
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
  showForces,
  showSatellites,
  showAois = true,
  showRangeRings = true,
  showOsintInfra = true,
  showFirms = true,
  firmsDetections = [],
  liveSatellites = [],
  selectedContact = null,
  onSelectContact,
  firmsProvenance = "NASA FIRMS",
  satProvenance = "CelesTrak GP · SGP4",
}: {
  events: MapEvent[];
  selectedEventId: Id<"events"> | null;
  onSelectEvent: (id: Id<"events">) => void;
  showForces: boolean;
  showSatellites: boolean;
  showAois?: boolean;
  showRangeRings?: boolean;
  showOsintInfra?: boolean;
  showFirms?: boolean;
  firmsDetections?: FirmsDetection[];
  liveSatellites?: LiveSatellite[];
  selectedContact?: SelectedContact | null;
  onSelectContact?: (c: SelectedContact) => void;
  firmsProvenance?: string;
  satProvenance?: string;
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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a> · overlays sensitive'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />

      <FitOrFocus
        events={validEvents}
        selectedId={selectedEventId}
        selectedContact={selectedContact}
      />

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
                <div className="text-[10px] opacity-70">
                  Illustrative AOI · not official boundary
                </div>
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

      {showOsintInfra && <OsintInfraLayer />}

      {/* Range rings under force markers */}
      {showForces &&
        showRangeRings &&
        ILLUSTRATIVE_UNITS.filter((u) => u.rangeKm).map((u) => (
          <Circle
            key={`rng-${u.id}`}
            center={[u.latitude, u.longitude]}
            radius={(u.rangeKm ?? 0) * 1000}
            pathOptions={{
              color: SIDE_COLOR[u.side],
              weight: 1,
              fillColor: SIDE_COLOR[u.side],
              fillOpacity: 0.04,
              dashArray: "3 5",
              opacity: 0.55,
            }}
          />
        ))}

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

      {showForces &&
        ILLUSTRATIVE_UNITS.map((u) => (
          <Marker
            key={u.id}
            position={[u.latitude, u.longitude]}
            icon={forceIcon(u.side, u.kind, u.callsign)}
            zIndexOffset={600}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <div className="text-xs max-w-[240px]">
                <div className="font-bold text-purple-700 text-[10px] uppercase tracking-wide">
                  Illustrative · not real tracking
                </div>
                <div className="font-semibold" style={{ color: SIDE_COLOR[u.side] }}>
                  {u.label}
                  {u.callsign ? ` · ${u.callsign}` : ""}
                </div>
                <div className="opacity-80">
                  {u.side.toUpperCase()} · {u.kind} · {u.theater}
                  {u.rangeKm ? ` · R${u.rangeKm}km` : ""}
                </div>
                <div className="opacity-70 text-[10px] mt-0.5">{u.note}</div>
              </div>
            </Tooltip>
          </Marker>
        ))}
    </MapContainer>
  );
}
