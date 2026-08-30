"use client";

import type { NearbyContact } from "@/lib/nearby";
import type { SelectedContact } from "./DashboardContext";

export type NearbyItem = NearbyContact<SelectedContact>;

const KIND_TONE: Record<SelectedContact["kind"], string> = {
  firms: "text-[#f97316]",
  satellite: "text-[var(--demo)]",
  adsb: "text-[#fbbf24]",
  quake: "text-[#fb7185]",
  ais: "text-[#22d3ee]",
  launch: "text-[#c4b5fd]",
  acled: "text-[#ef4444]",
};

export function NearbyRoster({
  items,
  selectedId,
  onSelect,
}: {
  items: NearbyItem[];
  selectedId: string | null;
  onSelect: (c: SelectedContact) => void;
}) {
  if (items.length === 0) return null;
  return (
    <aside className="gsm-nearby-board hidden md:block" aria-label="Nearby contacts">
      <p className="gsm-track-board-head">NEAR 250 KM · {items.length}</p>
      <ul className="divide-y divide-[var(--border)]">
        {items.map((n) => {
          const selected = selectedId === n.contact.id;
          return (
            <li key={n.contact.id}>
              <button
                type="button"
                className={`w-full text-left px-2 py-1 hover:bg-[var(--bg-hover)] ${
                  selected ? "bg-[var(--accent-wash)]" : ""
                }`}
                onClick={() => onSelect(n.contact)}
              >
                <span
                  className={`block font-mono text-[10px] uppercase ${KIND_TONE[n.contact.kind]}`}
                >
                  {n.contact.kind} · {n.distanceKm.toFixed(0)} km
                </span>
                <span className="block text-[11px] truncate text-[var(--text)]">
                  {n.contact.title}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
