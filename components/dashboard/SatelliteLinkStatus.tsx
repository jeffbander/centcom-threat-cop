"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

type LinkState = {
  ip: string | null;
  lat: number | null;
  lon: number | null;
  source: "gps" | "ip" | "pending" | "denied";
  sessionStart: number;
};

function formatTimer(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function formatCoord(n: number | null, kind: "lat" | "lon"): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const hemi =
    kind === "lat" ? (n >= 0 ? "N" : "S") : n >= 0 ? "E" : "W";
  return `${Math.abs(n).toFixed(4)}°${hemi}`;
}

/**
 * Compact “auth trace” strip: session timer, public IP, operator lat/lon.
 * Shown above Operational Briefing for security-monitoring presentation.
 */
export function SatelliteLinkStatus() {
  const { user } = useUser();
  const [now, setNow] = useState(() => Date.now());
  const [state, setState] = useState<LinkState>(() => ({
    ip: null,
    lat: null,
    lon: null,
    source: "pending",
    sessionStart: Date.now(),
  }));

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const applyIpGeo = async () => {
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        if (!ipRes.ok) throw new Error("ip");
        const ipJson = (await ipRes.json()) as { ip?: string };
        const ip = ipJson.ip ?? null;

        let lat: number | null = null;
        let lon: number | null = null;
        try {
          const geoRes = await fetch("https://ipapi.co/json/");
          if (geoRes.ok) {
            const g = (await geoRes.json()) as {
              latitude?: number;
              longitude?: number;
            };
            if (typeof g.latitude === "number") lat = g.latitude;
            if (typeof g.longitude === "number") lon = g.longitude;
          }
        } catch {
          /* optional */
        }

        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            ip,
            lat: prev.source === "gps" ? prev.lat : lat,
            lon: prev.source === "gps" ? prev.lon : lon,
            source: prev.source === "gps" ? "gps" : lat != null ? "ip" : "pending",
          }));
        }
      } catch {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            ip: prev.ip ?? "UNAVAILABLE",
          }));
        }
      }
    };

    void applyIpGeo();

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          setState((prev) => ({
            ...prev,
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            source: "gps",
          }));
        },
        () => {
          if (cancelled) return;
          setState((prev) => ({
            ...prev,
            source: prev.lat != null ? prev.source : "denied",
          }));
        },
        { enableHighAccuracy: false, timeout: 12_000, maximumAge: 120_000 },
      );
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const operator =
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    user?.fullName ||
    "OPERATOR";

  const elapsed = now - state.sessionStart;
  const linkUp = Boolean(state.ip && state.ip !== "UNAVAILABLE");

  return (
    <div
      className="gsm-sat-link shrink-0 border-b border-[var(--ok)]/40 bg-[#06140c] px-3 py-2"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            linkUp ? "bg-[var(--ok)] gsm-sat-link-pulse" : "bg-[var(--high)]"
          }`}
          aria-hidden
        />
        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] font-mono text-[var(--ok)]">
          Direct Satellite Link established
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] sm:text-[11px] font-mono text-[var(--text-muted)]">
        <div>
          <span className="text-[var(--text-faint)]">SESSION </span>
          <span className="text-[var(--text)] tabular-nums">
            {formatTimer(elapsed)}
          </span>
        </div>
        <div className="truncate" title={operator}>
          <span className="text-[var(--text-faint)]">AUTH </span>
          <span className="text-[var(--accent)]">{operator}</span>
        </div>
        <div className="truncate" title={state.ip ?? undefined}>
          <span className="text-[var(--text-faint)]">IP </span>
          <span className="text-[var(--text)]">
            {state.ip ?? "RESOLVING…"}
          </span>
        </div>
        <div>
          <span className="text-[var(--text-faint)]">FIX </span>
          <span className="text-[var(--text)]">
            {formatCoord(state.lat, "lat")}{" "}
            {formatCoord(state.lon, "lon")}
          </span>
          <span className="text-[var(--text-faint)] ml-1">
            {state.source === "gps"
              ? "GPS"
              : state.source === "ip"
                ? "NET"
                : state.source === "denied"
                  ? "NO-GPS"
                  : "…"}
          </span>
        </div>
      </div>
    </div>
  );
}
