"use client";

import {
  CATEGORIES,
  CATEGORY_LABELS,
  REGIONS,
  SEVERITIES,
  SEVERITY_LABELS,
  TIME_WINDOWS,
  TIME_WINDOW_LABELS,
  type Category,
  type Severity,
  type TimeWindow,
} from "@/lib/constants";
import { useDashboard } from "./DashboardContext";
import { trackProductEvent } from "@/lib/analytics";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function toggleInList<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((x) => x !== value)
    : [...list, value];
}

export function FilterRail() {
  const { filters, setFilters, resetFilters } = useDashboard();
  const track = useMutation(api.analytics.track);

  const emitFilter = (kind: string) => {
    trackProductEvent({ name: "filter_changed", meta: { kind } });
    void track({ name: "filter_changed", meta: JSON.stringify({ kind }) });
  };

  return (
    <aside
      className="w-full lg:w-44 shrink-0 border-r border-[var(--border)] bg-[var(--bg-panel)] gsm-scroll overflow-y-auto p-2 flex flex-col gap-3 text-[12px]"
      aria-label="Filters"
    >
      <div className="pb-1.5 border-b border-[var(--border)]">
        <p className="text-[9px] uppercase tracking-[0.14em] font-mono text-[var(--text-faint)]">
          Filters
        </p>
        <p className="mt-1 text-[9px] font-mono text-[var(--text-faint)] leading-snug">
          Keys 1–5 theaters · 0 world · Esc clear
        </p>
      </div>
      <div>
        <h2 className="text-[11px] uppercase tracking-[0.16em] font-mono text-[var(--accent)] mb-2">
          Categories
        </h2>
        <ul className="flex flex-col gap-1">
          {CATEGORIES.map((c) => (
            <li key={c}>
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--bg-hover)] rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(c)}
                  onChange={() => {
                    setFilters({
                      categories: toggleInList(filters.categories, c as Category),
                    });
                    emitFilter("category");
                  }}
                  className="accent-[var(--accent-dim)]"
                />
                <span>{CATEGORY_LABELS[c]}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-[11px] uppercase tracking-[0.16em] font-mono text-[var(--accent)] mb-2">
          Severity
        </h2>
        <ul className="flex flex-col gap-1">
          {SEVERITIES.map((s) => (
            <li key={s}>
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--bg-hover)] rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={filters.severities.includes(s)}
                  onChange={() => {
                    setFilters({
                      severities: toggleInList(filters.severities, s as Severity),
                    });
                    emitFilter("severity");
                  }}
                  className="accent-[var(--accent-dim)]"
                />
                <span className={`sev-${s}`}>{SEVERITY_LABELS[s]}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-[11px] uppercase tracking-[0.16em] font-mono text-[var(--accent)] mb-2">
          Region
        </h2>
        <ul className="flex flex-col gap-1 max-h-40 overflow-y-auto gsm-scroll">
          {REGIONS.map((r) => (
            <li key={r}>
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--bg-hover)] rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={filters.regions.includes(r)}
                  onChange={() => {
                    setFilters({
                      regions: toggleInList(filters.regions, r),
                    });
                    emitFilter("region");
                  }}
                  className="accent-[var(--accent-dim)]"
                />
                <span>{r}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-[11px] uppercase tracking-[0.16em] font-mono text-[var(--accent)] mb-2">
          Time window
        </h2>
        <ul className="flex flex-col gap-1">
          {TIME_WINDOWS.map((tw) => (
            <li key={tw}>
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--bg-hover)] rounded px-1 py-0.5">
                <input
                  type="radio"
                  name="timeWindow"
                  checked={filters.timeWindow === tw}
                  onChange={() => {
                    setFilters({ timeWindow: tw as TimeWindow });
                    emitFilter("timeWindow");
                  }}
                  className="accent-[var(--accent-dim)]"
                />
                <span>{TIME_WINDOW_LABELS[tw]}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={filters.bookmarkedOnly}
            onChange={() => {
              setFilters({ bookmarkedOnly: !filters.bookmarkedOnly });
              emitFilter("bookmarks");
            }}
            className="accent-[var(--accent-dim)]"
          />
          Bookmarked only
        </label>
      </div>

      <button
        type="button"
        onClick={() => {
          resetFilters();
          emitFilter("reset");
        }}
        className="mt-auto text-sm px-3 py-1.5 rounded-[var(--radius)] border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
      >
        Reset filters
      </button>
    </aside>
  );
}
