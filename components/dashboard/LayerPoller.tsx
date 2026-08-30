"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

/** Kick a FIRMS + CelesTrak snapshot refresh while the dashboard is open. */
export function LayerPoller() {
  const refresh = useMutation(api.layers.requestRefresh);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void refresh({ layer: "all" }).catch(() => {
      /* rate-limit, missing function, or first-load auth race */
    });
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => {
      void refresh({ layer: "adsb" }).catch(() => {
        /* rate-limit is fine — cron still refreshes */
      });
    }, 90_000);
    return () => clearInterval(id);
  }, [refresh]);

  return null;
}
