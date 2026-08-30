"use client";

import { useState } from "react";
import { THEATER_MISSIONS } from "@/lib/theaters";
import { serializeCopView, type CopLayerKey } from "@/lib/copView";
import { useDashboard } from "./DashboardContext";

export function CopShare({
  enabledLayers,
}: {
  enabledLayers: CopLayerKey[];
}) {
  const { mapFocus } = useDashboard();
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const ao = mapFocus
      ? THEATER_MISSIONS.find(
          (m) =>
            Math.abs(m.latitude - mapFocus.latitude) < 0.4 &&
            Math.abs(m.longitude - mapFocus.longitude) < 0.4,
        )?.id
      : undefined;
    const qs = serializeCopView({ ao, layers: enabledLayers });
    const url = `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ""}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy COP view", url);
    }
  };

  return (
    <button
      type="button"
      className="px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--accent)] hover:bg-[var(--bg-hover)] uppercase tracking-wide"
      onClick={() => void onCopy()}
      title="Copy a shareable view of this COP"
    >
      {copied ? "Copied" : "Copy view"}
    </button>
  );
}
