"use client";

import { THEATER_MISSIONS } from "@/lib/theaters";
import { useDashboard } from "./DashboardContext";

export function TheaterMissions() {
  const { requestMapFocus } = useDashboard();
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 px-2 py-1 border-b border-[var(--border)] bg-[#070b10] text-[10px] font-mono"
      role="group"
      aria-label="Theater missions"
    >
      <span className="uppercase tracking-[0.14em] text-[var(--text-faint)] mr-1">
        Missions
      </span>
      <span className="text-[var(--text-faint)] hidden lg:inline mr-1">
        1–{THEATER_MISSIONS.length} jump · 0 world · Esc clear
      </span>
      {THEATER_MISSIONS.map((m, i) => (
        <button
          key={m.id}
          type="button"
          className="px-1.5 py-0.5 rounded border border-[var(--border)] hover:bg-[var(--bg-hover)]"
          style={{ color: m.color, borderColor: `${m.color}66` }}
          onClick={() => requestMapFocus(m.latitude, m.longitude, m.zoom)}
          title={`${m.name} · ${m.status}`}
        >
          <span className="opacity-50 mr-1">{i + 1}</span>
          {m.name}
          <span className="ml-1 opacity-70">{m.status}</span>
        </button>
      ))}
    </div>
  );
}
