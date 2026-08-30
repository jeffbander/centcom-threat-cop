"use client";

import type { AdsbContact } from "@/convex/lib/adsb";
import type { SelectedContact } from "./DashboardContext";

export function TrackBoard({
  contacts,
  selectedId,
  provenance,
  onSelect,
}: {
  contacts: AdsbContact[];
  selectedId: string | null;
  provenance: string;
  onSelect: (c: SelectedContact) => void;
}) {
  const mil = contacts
    .filter((c) => c.military)
    .slice()
    .sort((a, b) => (b.altitudeFt ?? -1) - (a.altitudeFt ?? -1))
    .slice(0, 14);

  if (mil.length === 0) {
    return (
      <aside className="gsm-track-board hidden md:block" aria-label="Air tracks">
        <p className="gsm-track-board-head">AIR TRACKS · MIL</p>
        <p className="text-[10px] text-[var(--text-faint)] px-2 py-1.5">
          Waiting for ADS-B snapshot…
        </p>
      </aside>
    );
  }

  return (
    <aside className="gsm-track-board hidden md:block" aria-label="Military air tracks">
      <p className="gsm-track-board-head">
        AIR TRACKS · MIL {mil.length}
        {contacts.length > mil.length ? ` / ${contacts.length}` : ""}
      </p>
      <ul className="divide-y divide-[var(--border)]">
        {mil.map((ac) => {
          const selected = selectedId === ac.id;
          return (
            <li key={ac.id}>
              <button
                type="button"
                className={`w-full text-left px-2 py-1 hover:bg-[var(--bg-hover)] ${
                  selected ? "bg-[var(--accent-wash)]" : ""
                }`}
                onClick={() =>
                  onSelect({
                    kind: "adsb",
                    id: ac.id,
                    latitude: ac.latitude,
                    longitude: ac.longitude,
                    title: ac.callsign,
                    subtitle: `MIL · ${ac.typeCode || "type?"} · ADS-B`,
                    details: [
                      { label: "ICAO", value: ac.hex.toUpperCase() },
                      { label: "Reg", value: ac.registration || "—" },
                      { label: "Type", value: ac.typeCode || "—" },
                      {
                        label: "Alt",
                        value:
                          ac.altitudeFt != null
                            ? `${Math.round(ac.altitudeFt)} ft`
                            : "—",
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
                          ac.trackDeg != null
                            ? `${Math.round(ac.trackDeg)}°`
                            : "—",
                      },
                    ],
                    provenance,
                  })
                }
              >
                <span className="block font-mono text-[11px] text-[#fbbf24] truncate">
                  {ac.callsign}
                  {ac.typeCode ? (
                    <span className="text-[var(--text-muted)]">
                      {" "}
                      · {ac.typeCode}
                    </span>
                  ) : null}
                </span>
                <span className="block font-mono text-[9px] text-[var(--text-faint)]">
                  {ac.altitudeFt != null
                    ? `FL${String(Math.round(ac.altitudeFt / 100)).padStart(3, "0")}`
                    : "ALT —"}
                  {ac.groundSpeedKt != null
                    ? ` · ${Math.round(ac.groundSpeedKt)}kt`
                    : ""}
                  {ac.trackDeg != null ? ` · ${Math.round(ac.trackDeg)}°` : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
