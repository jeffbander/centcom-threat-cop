"use client";

/** Shared copy for AOR watch + COP settings. */
export function AorGuide({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="px-2 py-2 border-b border-[var(--border)] text-[10px] font-mono leading-snug text-[var(--text-muted)]">
        <p className="uppercase tracking-[0.14em] text-[var(--text-faint)] mb-1">
          How to use
        </p>
        <p>
          <span className="text-[var(--text)]">AOR</span> is the watch box.
          Click the theater name to jump the map.
        </p>
        <p className="mt-1">
          <span className="text-[#f97316]">Thermals</span> are NASA FIRMS heat
          pixels (fires, flares, explosions) — public heat, not targeting. Click
          a MW value to inspect. 24h vs prior 24h is the delta.
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-2 text-sm text-[var(--text-muted)]">
      <h2 className="text-[11px] uppercase tracking-[0.16em] font-mono text-[var(--accent)]">
        AOR and thermals
      </h2>
      <p>
        <strong className="text-[var(--text)]">AOR</strong> (area of
        responsibility) is the geographic box this COP is watching. Ukraine
        covers the country and near border. Middle East covers Levant, Gulf, Red
        Sea, and Iran. Counts and headlines in the left rail are only what falls
        in that box (or names it).
      </p>
      <p>
        <strong className="text-[#f97316]">Thermals</strong> are NASA FIRMS
        satellite heat detections — public fire/heat pixels from wildfire,
        industry, flares, or strikes. They are not a targeting feed.{" "}
        <strong className="text-[var(--text)]">FRP</strong> is fire radiative
        power in megawatts; hotter detections sort first.
      </p>
      <ol className="list-decimal pl-4 flex flex-col gap-1">
        <li>Click Ukraine AOR or Middle East AOR to slew the map to that box.</li>
        <li>Keep FIRMS fires on in Layers to plot heat on the map.</li>
        <li>Click a MW value (for example 107 MW) to inspect that detection.</li>
        <li>
          Read THERMAL 35 · 24h 29 · +23 as: 35 heat pixels in the AOR, 29 in
          the last 24 hours, 23 more than the previous 24 hours.
        </li>
        <li>Click a headline under the AOR to open that event.</li>
      </ol>
    </section>
  );
}
