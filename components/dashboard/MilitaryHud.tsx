"use client";

import { useEffect, useState } from "react";
import {
  ILLUSTRATIVE_SATELLITES,
  ILLUSTRATIVE_UNITS,
  SAT_KIND_COLOR,
  THEATER_AOIS,
  type SatKind,
} from "@/lib/showOverlays";

/**
 * Compact military HUD — kept short so Operational Briefing has room.
 */
export function MilitaryHud() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const blue = ILLUSTRATIVE_UNITS.filter((u) => u.side === "blue").length;
  const red = ILLUSTRATIVE_UNITS.filter((u) => u.side === "red").length;
  const satsByKind = ILLUSTRATIVE_SATELLITES.reduce(
    (acc, s) => {
      acc[s.kind] = (acc[s.kind] ?? 0) + 1;
      return acc;
    },
    {} as Partial<Record<SatKind, number>>,
  );
  const orbitPhase = tick % 60;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1 border-b border-[var(--border)] bg-[#080c12] text-[10px] font-mono">
      <span className="inline-flex items-center gap-1.5">
        <span className="gsm-pulse-dot bg-[var(--critical)] !w-1.5 !h-1.5" />
        <span className="text-[var(--critical)] font-bold tracking-wide">
          TC-ORANGE
        </span>
        <span className="text-[var(--text-faint)]">sensitive</span>
      </span>
      <span className="text-[var(--accent)]">BLU {blue}</span>
      <span className="text-[var(--critical)]">OPF {red}</span>
      <span className="text-[var(--text-faint)] hidden sm:inline">
        {THEATER_AOIS.map((ao) => ao.name.replace("AO ", "")).join(" · ")}
      </span>
      <span className="ml-auto flex flex-wrap gap-1.5 text-[var(--text-faint)]">
        {(Object.keys(satsByKind) as SatKind[]).map((k) => (
          <span key={k} style={{ color: SAT_KIND_COLOR[k] }}>
            {k}:{satsByKind[k]}
          </span>
        ))}
        <span className="text-[var(--demo)]">φ{orbitPhase}s</span>
      </span>
    </div>
  );
}
