"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

/** 30 minutes — only while this component is mounted (app open + dashboard). */
const POLL_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Client-only X OSINT scheduler.
 * - Runs only when the authenticated dashboard is open (component mounted).
 * - Does not run when the browser tab is closed or the user leaves the dashboard.
 * - Server crons are not used for X (avoids charges while the app is idle).
 */
export function XOsintPoller({ enabled = true }: { enabled?: boolean }) {
  const requestPoll = useMutation(api.xFeed.requestPoll);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const poll = async () => {
      if (cancelled || inFlight.current) return;
      // Skip when tab is in background to reduce surprise API burn
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      inFlight.current = true;
      try {
        await requestPoll({});
      } catch {
        // Rate limit / missing token — UI surfaces status elsewhere
      } finally {
        inFlight.current = false;
      }
    };

    // One pull shortly after open so the wire isn't empty, then every 30 min
    const initial = window.setTimeout(() => {
      void poll();
    }, 3_000);

    const interval = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    const onVisible = () => {
      // Optional: do not force-poll on every tab focus — only the 30m timer
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, requestPoll]);

  return null;
}
