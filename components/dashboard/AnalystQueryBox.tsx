"use client";

import { useMemo, useState } from "react";
import {
  ANALYST_LAYERS,
  LOADED_DATA_COVERAGE_NOTE,
  runAnalystQuery,
  type AnalystLayerKey,
  type AnalystRecord,
} from "@/lib/analystQuery";
import { FIRMS_NEAR_EVENT_KM } from "@/lib/spatialJoin";
import { useDashboard } from "./DashboardContext";

export function AnalystQueryBox({ records }: { records: AnalystRecord[] }) {
  const { selectedEventId, setSelectedEventId, setSelectedContact } =
    useDashboard();
  const [layer, setLayer] = useState<AnalystLayerKey | "all">("all");
  const [frpMin, setFrpMin] = useState("");
  const [nearEvent, setNearEvent] = useState(false);
  const [memory, setMemory] = useState<AnalystRecord[] | null>(null);
  const [followUp, setFollowUp] = useState(false);

  const eventCenter = useMemo(() => {
    const ev = records.find(
      (r) => r.layerKey === "events" && r.id === selectedEventId,
    );
    if (!ev) return null;
    return { latitude: ev.latitude, longitude: ev.longitude };
  }, [records, selectedEventId]);

  const spec = {
    layers: (layer === "all" ? undefined : [layer]) as
      | AnalystLayerKey[]
      | undefined,
    filters:
      frpMin.trim() && Number.isFinite(Number(frpMin))
        ? [{ field: "frp" as const, op: "gt" as const, value: Number(frpMin) }]
        : undefined,
    scope:
      nearEvent && eventCenter
        ? { kind: "radius" as const, center: eventCenter, km: FIRMS_NEAR_EVENT_KM }
        : { kind: "anywhere" as const },
    followUp,
    limit: 8,
  };

  const source = followUp && memory ? memory : records;
  const result = runAnalystQuery(source, spec);

  return (
    <section aria-label="Analyst query">
      <h3 className="text-[10px] uppercase tracking-[0.14em] font-mono text-[var(--text-faint)] mb-1.5">
        Analyst query
      </h3>
      <div className="flex flex-wrap gap-1.5 items-center text-[11px] mb-2">
        <label className="flex items-center gap-1">
          <span className="text-[var(--text-faint)] font-mono">Layer</span>
          <select
            className="bg-[#0a1018] border border-[var(--border)] rounded px-1 py-0.5"
            value={layer}
            onChange={(e) => {
              setFollowUp(false);
              setLayer(e.target.value as AnalystLayerKey | "all");
            }}
          >
            <option value="all">all loaded</option>
            {ANALYST_LAYERS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span className="text-[var(--text-faint)] font-mono">FRP &gt;</span>
          <input
            className="w-16 bg-[#0a1018] border border-[var(--border)] rounded px-1 py-0.5"
            value={frpMin}
            inputMode="decimal"
            onChange={(e) => {
              setFrpMin(e.target.value);
            }}
            aria-label="Minimum FRP"
          />
        </label>
        <label className="inline-flex items-center gap-1 cursor-pointer text-[var(--text-muted)]">
          <input
            type="checkbox"
            checked={nearEvent}
            disabled={!eventCenter}
            onChange={(e) => {
              setFollowUp(false);
              setNearEvent(e.target.checked);
            }}
          />
          50 km of event
        </label>
        <button
          type="button"
          className="px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-40"
          disabled={result.items.length === 0}
          onClick={() => {
            setMemory(result.items);
            setFollowUp(true);
          }}
        >
          Follow-up
        </button>
      </div>
      <p className="text-[10px] font-mono text-[var(--text-muted)] mb-1">
        {result.ok ? `${result.count} match` : result.error} ·{" "}
        {result.coverage.scope}
        {result.coverage.followUp ? " · follow-up" : ""}
      </p>
      <ul className="divide-y divide-[var(--border)] border border-[var(--border)] rounded max-h-40 overflow-y-auto gsm-scroll">
        {result.items.map((item) => (
          <li key={`${item.layerKey}:${item.id}`}>
            <button
              type="button"
              className="w-full text-left px-2 py-1 hover:bg-[var(--bg-hover)]"
              onClick={() => {
                if (item.layerKey === "events") {
                  setSelectedEventId(item.id as never);
                } else {
                  setSelectedContact({
                    kind: item.layerKey === "firms" ? "firms" : "satellite",
                    id: item.id,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    title:
                      item.headline ||
                      item.name ||
                      (item.layerKey === "firms" ? "FIRMS detection" : "Satellite"),
                    subtitle: `${item.layerKey} · ${item.latitude.toFixed(2)}°, ${item.longitude.toFixed(2)}°`,
                    details: [
                      ...(item.frp != null
                        ? [{ label: "FRP", value: String(item.frp) }]
                        : []),
                      ...(item.norad
                        ? [{ label: "NORAD", value: String(item.norad) }]
                        : []),
                    ],
                    provenance: LOADED_DATA_COVERAGE_NOTE,
                  });
                }
              }}
            >
              <span className="text-[10px] font-mono uppercase text-[var(--text-faint)]">
                {item.layerKey}
              </span>
              <span className="block text-xs truncate">
                {item.headline || item.name || item.id}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[10px] leading-snug text-[var(--text-faint)]">
        {result.coverageNote}
      </p>
    </section>
  );
}
