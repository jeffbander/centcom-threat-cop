"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatZuluDtg } from "@/lib/coords";
import { useDashboard } from "./DashboardContext";
import { trackProductEvent } from "@/lib/analytics";

export function Header() {
  const { filters, setFilters, setSettingsOpen } = useDashboard();
  const freshness = useQuery(api.ingestion.freshness);
  const requestRefresh = useMutation(api.ingestion.requestRefresh);
  const requestLayerRefresh = useMutation(api.layers.requestRefresh);
  const track = useMutation(api.analytics.track);
  const [clock, setClock] = useState(() => formatZuluDtg());
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setClock(formatZuluDtg()), 1000);
    return () => clearInterval(id);
  }, []);

  const onRefresh = async () => {
    setRefreshError(null);
    setRefreshing(true);
    try {
      await requestRefresh({});
      try {
        await requestLayerRefresh({ layer: "all" });
      } catch {
        /* layer rate-limit is independent */
      }
      trackProductEvent({ name: "refresh_requested" });
      void track({ name: "refresh_requested" });
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <header className="flex flex-wrap items-center gap-2 px-3 py-1.5 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0"
          aria-hidden
        />
        <Link
          href="/"
          className="font-semibold tracking-tight text-[var(--text)] truncate"
        >
          CENTCOM · Threat COP
        </Link>
      </div>

      <div className="flex items-center gap-3 text-xs font-mono text-[var(--text-muted)] ml-auto sm:ml-4">
        <time
          dateTime={new Date().toISOString()}
          aria-live="polite"
          className="text-[var(--accent)]"
          title="Zulu / UTC"
        >
          <span className="text-[var(--text-faint)] mr-1">ZULU</span>
          {clock}
        </time>
        <span className="hidden md:inline text-[var(--text-faint)]">
          LINK UP · AUTH VALID
        </span>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border ${
            freshness?.isStale
              ? "border-[var(--high)] text-[var(--high)]"
              : "border-[var(--border)] text-[var(--text-muted)]"
          }`}
          title="Data freshness"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              freshness?.isStale ? "bg-[var(--high)]" : "bg-[var(--ok)]"
            }`}
            aria-hidden
          />
          {freshness === undefined
            ? "Loading…"
            : freshness?.isStale
              ? "Stale data"
              : "Data current"}
        </span>
        {freshness?.liveOpenSourceActive && (
          <span
            className="px-2 py-0.5 rounded border border-[var(--ok)] text-[var(--ok)] font-semibold"
            role="status"
            title={(freshness.providers ?? []).join(", ")}
          >
            LIVE OPEN-SOURCE
          </span>
        )}

      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 sm:max-w-md">
        <label className="sr-only" htmlFor="global-search">
          Search events
        </label>
        <input
          id="global-search"
          type="search"
          placeholder="Search headlines…"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          className="w-full px-3 py-1.5 text-sm rounded-[var(--radius)] bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-faint)]"
        />
      </div>

      <nav className="flex items-center gap-2 text-sm" aria-label="Primary">
        <Link
          href="/bookmarks"
          className="px-2 py-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
        >
          Bookmarks
        </Link>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="px-2 py-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
        >
          Settings
        </button>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={refreshing}
          className="px-2.5 py-1 rounded-[var(--radius)] border border-[var(--border-strong)] text-[var(--text)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
        <UserButton afterSignOutUrl="/" />
      </nav>
      {refreshError && (
        <p className="w-full text-xs text-[var(--critical)]" role="alert">
          {refreshError}
        </p>
      )}
    </header>
  );
}
