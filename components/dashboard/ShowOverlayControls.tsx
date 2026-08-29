"use client";

import type { LayerSourceState } from "@/convex/lib/layerState";

export type OverlayToggles = {
  forces: boolean;
  satellites: boolean;
  firms: boolean;
  newsWire: boolean;
  aois: boolean;
  rangeRings: boolean;
  milHud: boolean;
  xOsint: boolean;
  osintInfra: boolean;
};

export type LayerChip = {
  status: LayerSourceState | string;
  count: number;
};

function SourceChip({
  label,
  chip,
}: {
  label: string;
  chip?: LayerChip;
}) {
  if (!chip) return null;
  const tone =
    chip.status === "LIVE"
      ? "text-[var(--ok)] border-[var(--ok)]/50"
      : chip.status === "STALE"
        ? "text-[var(--high)] border-[var(--high)]/50"
        : chip.status === "KEY_REQUIRED"
          ? "text-[var(--text-faint)] border-[var(--border)]"
          : "text-[var(--critical)] border-[var(--critical)]/50";
  return (
    <span
      className={`font-mono text-[9px] uppercase tracking-wide px-1 py-0.5 rounded border ${tone}`}
      title={`${label} ${chip.status} · ${chip.count}`}
    >
      {chip.status}
      {chip.status === "LIVE" || chip.status === "STALE"
        ? ` · ${chip.count}`
        : ""}
    </span>
  );
}

export function ShowOverlayControls({
  value,
  onChange,
  firmsChip,
  satChip,
}: {
  value: OverlayToggles;
  onChange: (next: OverlayToggles) => void;
  firmsChip?: LayerChip;
  satChip?: LayerChip;
}) {
  const items: Array<{ key: keyof OverlayToggles; label: string }> = [
    { key: "firms", label: "FIRMS fires" },
    { key: "satellites", label: "CelesTrak SGP4" },
    { key: "milHud", label: "Military HUD" },
    { key: "forces", label: "BLUFOR / OPFOR" },
    { key: "rangeRings", label: "Range rings" },
    { key: "aois", label: "Theater AOIs" },
    { key: "newsWire", label: "OSINT wire" },
    { key: "xOsint", label: "X accounts" },
    { key: "osintInfra", label: "OSINT infra" },
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-2 py-1 border-b border-[var(--border)] bg-[#0a1018] text-[11px]"
      role="group"
      aria-label="Military overlay layers"
    >
      <span className="font-mono uppercase tracking-[0.14em] text-[var(--demo)] text-[9px]">
        Layers
      </span>
      {items.map((item) => (
        <label
          key={item.key}
          className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <input
            type="checkbox"
            checked={value[item.key]}
            onChange={(e) =>
              onChange({ ...value, [item.key]: e.target.checked })
            }
            className="accent-[var(--accent-dim)]"
          />
          {item.label}
          {item.key === "firms" ? (
            <SourceChip label="FIRMS" chip={firmsChip} />
          ) : null}
          {item.key === "satellites" ? (
            <SourceChip label="Sats" chip={satChip} />
          ) : null}
        </label>
      ))}
      <span className="text-[var(--text-faint)] ml-auto max-w-lg text-right text-[10px] font-mono">
        FIRMS NASA public · sats CelesTrak SGP4 · BLUFOR/OPFOR illustrative
      </span>
    </div>
  );
}
