"use client";

import { useEffect } from "react";
import { THEATER_MISSIONS } from "@/lib/theaters";
import { useDashboard } from "./DashboardContext";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/** 1–5 jump theaters, 0 world, Esc clears subject. */
export function CopHotkeys() {
  const {
    requestMapFocus,
    setSelectedContact,
    setSelectedEventId,
  } = useDashboard();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === "Escape") {
        setSelectedContact(null);
        setSelectedEventId(null);
        return;
      }
      if (e.key === "0") {
        requestMapFocus(28, 40, 3);
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= THEATER_MISSIONS.length) {
        const m = THEATER_MISSIONS[n - 1];
        requestMapFocus(m.latitude, m.longitude, m.zoom);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestMapFocus, setSelectedContact, setSelectedEventId]);

  return null;
}
