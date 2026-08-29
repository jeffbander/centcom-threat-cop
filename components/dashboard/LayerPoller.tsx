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
      /* rate-limit or missing snapshot is fine */
    });
  }, [refresh]);

  return null;
}
