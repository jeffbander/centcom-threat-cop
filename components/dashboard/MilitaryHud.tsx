"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { threatCondition } from "@/lib/theaters";
import { useDashboard } from "./DashboardContext";

/**
 * Live tactical HUD — counts from COP events + overlay snapshots.
 */
export function MilitaryHud({
  firmsCount,
  satCount,
  adsbCount,
  quakeCount,
  aisCount,
  launchCount,
  firmsStatus,
  satStatus,
  adsbStatus,
  quakeStatus,
  aisStatus,
  launchStatus,
}: {
  firmsCount: number;
  satCount: number;
  adsbCount: number;
  quakeCount: number;
  aisCount: number;
  launchCount: number;
  firmsStatus: string;
  satStatus: string;
  adsbStatus: string;
  quakeStatus: string;
  aisStatus: string;
  launchStatus: string;
}) {
  const { filters, selectedContact, selectedEventId } = useDashboard();
  const overview = useQuery(api.events.overview, {
    categories: filters.categories,
    severities: filters.severities,
    regions: filters.regions,
    timeWindow: filters.timeWindow,
    bookmarkedOnly: filters.bookmarkedOnly,
    search: filters.search || undefined,
  });

  const critical = overview?.criticalCount ?? 0;
  const high = overview?.highCount ?? 0;
  const tc = threatCondition(critical, high);
  const tcColor =
    tc.code === "TC-RED"
      ? "text-[var(--critical)]"
      : tc.code === "TC-ORANGE"
        ? "text-[var(--high)]"
        : tc.code === "TC-YELLOW"
          ? "text-[var(--moderate)]"
          : "text-[var(--ok)]";

  const subject = selectedContact
    ? selectedContact.kind.toUpperCase()
    : selectedEventId
      ? "EVENT"
      : "NONE";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1 border-b border-[var(--border)] bg-[#080c12] text-[10px] font-mono">
      <span className="inline-flex items-center gap-1.5">
        <span
          className={`gsm-pulse-dot !w-1.5 !h-1.5 ${
            tc.code === "TC-GREEN" ? "bg-[var(--ok)]" : "bg-[var(--critical)]"
          }`}
        />
        <span className={`font-bold tracking-wide ${tcColor}`}>{tc.code}</span>
        <span className="text-[var(--text-faint)]">{tc.label}</span>
      </span>
      <span className="text-[var(--critical)]">CRIT {critical}</span>
      <span className="text-[var(--high)]">HIGH {high}</span>
      <span className="text-[#f97316]" title={firmsStatus}>
        FIRMS {firmsCount}
      </span>
      <span className="text-[var(--demo)]" title={satStatus}>
        SAT {satCount}
      </span>
      <span className="text-[#fbbf24]" title={adsbStatus}>
        ADS-B MIL {adsbCount}
      </span>
      <span className="text-[#22d3ee]" title={aisStatus}>
        AIS {aisCount}
      </span>
      <span className="text-[#fb7185]" title={quakeStatus}>
        USGS {quakeCount}
      </span>
      <span className="text-[#c4b5fd]" title={launchStatus}>
        LL2 {launchCount}
      </span>
      <span className="text-[var(--text-faint)] ml-auto">
        SUBJECT {subject}
      </span>
    </div>
  );
}
