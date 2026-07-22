"use client";

export type OverlayToggles = {
  forces: boolean;
  satellites: boolean;
  newsWire: boolean;
  aois: boolean;
  rangeRings: boolean;
  milHud: boolean;
  xOsint: boolean;
};

export function ShowOverlayControls({
  value,
  onChange,
}: {
  value: OverlayToggles;
  onChange: (next: OverlayToggles) => void;
}) {
  const items: Array<{ key: keyof OverlayToggles; label: string }> = [
    { key: "milHud", label: "Military HUD" },
    { key: "forces", label: "BLUFOR / OPFOR" },
    { key: "rangeRings", label: "Range rings" },
    { key: "aois", label: "Theater AOIs" },
    { key: "satellites", label: "Satellite tracks" },
    { key: "newsWire", label: "OSINT wire" },
    { key: "xOsint", label: "X accounts" },
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
        </label>
      ))}
      <span className="text-[var(--text-faint)] ml-auto max-w-lg text-right text-[10px] font-mono">
        SENSITIVE · not live troop GPS · not real TLEs
      </span>
    </div>
  );
}
