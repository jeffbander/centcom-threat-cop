"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useDashboard } from "./DashboardContext";
import { formatAbsolute } from "@/lib/format";

export function OverviewBar() {
  const { filters } = useDashboard();
  const overview = useQuery(api.events.overview, {
    categories: filters.categories,
    severities: filters.severities,
    regions: filters.regions,
    timeWindow: filters.timeWindow,
    bookmarkedOnly: filters.bookmarkedOnly,
    search: filters.search || undefined,
  });

  if (overview === undefined) {
    return (
      <div
        className="px-3 py-1 border-b border-[var(--border)] bg-[var(--bg-elevated)] text-xs text-[var(--text-muted)]"
        aria-busy="true"
      >
        Loading overview…
      </div>
    );
  }

  if (overview === null) {
    return null;
  }

  return (
    <section
      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1 border-b border-[var(--border)] bg-[var(--bg-elevated)] text-xs font-mono"
      aria-label="Situation overview"
    >
      <Metric label="CRIT" value={overview.criticalCount} tone="critical" />
      <Metric label="HIGH" value={overview.highCount} tone="high" />
      <Metric
        label="THEATERS"
        value={overview.elevatedRegions.length}
        detail={overview.elevatedRegions
          .map((r) => `${r.region} (${r.count})`)
          .join(", ")}
      />
      <Metric label="24H" value={overview.addedLast24h} />
      <Metric
        label="REFRESH"
        value={
          overview.lastSuccessfulRefreshAt
            ? formatAbsolute(overview.lastSuccessfulRefreshAt).slice(5, 16)
            : "—"
        }
        isText
      />
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
  detail,
  isText,
}: {
  label: string;
  value: number | string;
  tone?: "critical" | "high";
  detail?: string;
  isText?: boolean;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5" title={detail}>
      <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--text-faint)]">
        {label}
      </span>
      <span
        className={`text-sm font-semibold tabular-nums ${
          tone === "critical"
            ? "text-[var(--critical)]"
            : tone === "high"
              ? "text-[var(--high)]"
              : "text-[var(--text)]"
        } ${isText ? "text-xs font-mono" : ""}`}
      >
        {value}
      </span>
    </span>
  );
}
