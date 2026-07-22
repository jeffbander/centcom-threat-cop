"use client";

/**
 * Real basemap + military COP overlays (Leaflet + free Carto dark tiles).
 * Force / satellite layers are ILLUSTRATIVE for show — not live tracking.
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
  ILLUSTRATIVE_SATELLITES,
  ILLUSTRATIVE_UNITS,
  KIND_GLYPH,
  SAT_KIND_COLOR,
  SIDE_COLOR,
  THEATER_AOIS,
  type ForceSide,
  type UnitKind,
} from "@/lib/showOverlays";
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

function FitOrFocus({
  events,
  selectedId,
}: {
  events: MapEvent[];
  selectedId: Id<"events"> | null;
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
    map.setView([28, 40], 3);
  }, [map]);

  return null;
}

function SatelliteLayer({ tick }: { tick: number }) {
  return (
    <>
      {ILLUSTRATIVE_SATELLITES.map((sat) => {
        const color = SAT_KIND_COLOR[sat.kind];
        const positions = sat.track.map(
          (p) => [p.lat, p.lon] as [number, number],
        );
        const speed = sat.speed ?? 1;
        const idx = Math.floor(tick * speed) % sat.track.length;
        const cur = sat.track[idx];
        const next = sat.track[(idx + 1) % sat.track.length];
        // trail segment (last few points)
        const trailStart = Math.max(0, idx - 8);
        const trail = sat.track
          .slice(trailStart, idx + 1)
          .map((p) => [p.lat, p.lon] as [number, number]);

        return (
          <Fragment key={sat.id}>
            {/* Full ground track */}
            <Polyline
              positions={positions}
              pathOptions={{
                color,
                weight: 1.25,
                dashArray: "5 7",
                opacity: 0.45,
              }}
            />
            {/* Bright recent trail */}
            {trail.length > 1 && (
              <Polyline
                positions={trail}
                pathOptions={{
                  color,
                  weight: 2.5,
                  opacity: 0.9,
                }}
              />
            )}
            {/* Sensor footprint */}
            {sat.footprintKm && (
              <Circle
                center={[cur.lat, cur.lon]}
                radius={sat.footprintKm * 1000}
                pathOptions={{
                  color,
                  weight: 1,
                  fillColor: color,
                  fillOpacity: 0.06,
                  dashArray: "2 4",
                }}
              />
            )}
            <Marker position={[cur.lat, cur.lon]} icon={satIcon(color, sat.name)}>
              <Tooltip direction="top" offset={[0, -10]} opacity={0.98}>
                <div className="text-xs min-w-[160px]">
                  <div className="font-bold" style={{ color }}>
                    {sat.name}
                  </div>
                  <div className="opacity-80">
                    {sat.kind} · ILLUSTRATIVE track
                  </div>
                  <div className="text-[10px] opacity-70 mt-0.5">{sat.note}</div>
                  <div className="text-[10px] opacity-60 font-mono mt-0.5">
                    {cur.lat.toFixed(2)}°, {cur.lon.toFixed(2)}° →{" "}
                    {next.lat.toFixed(1)}°, {next.lon.toFixed(1)}°
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

export default function LeafletMapCanvas({
  events,
  selectedEventId,
  onSelectEvent,
  showForces,
  showSatellites,
  showAois = true,
  showRangeRings = true,
  satTick,
}: {
  events: MapEvent[];
  selectedEventId: Id<"events"> | null;
  onSelectEvent: (id: Id<"events">) => void;
  showForces: boolean;
  showSatellites: boolean;
  showAois?: boolean;
  showRangeRings?: boolean;
  satTick: number;
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

      <FitOrFocus events={validEvents} selectedId={selectedEventId} />

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

      {showSatellites && <SatelliteLayer tick={satTick} />}

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
