import type { FirmsDetection } from "@/convex/lib/firms";
import { inUkraineAor } from "./theaters";

const DAY_MS = 24 * 60 * 60 * 1000;

export type FirmsUkraineDelta = {
  aorCount: number;
  last24Count: number;
  prev24Count: number;
  delta: number;
  last24: FirmsDetection[];
  hottest: FirmsDetection[];
};

export function firmsUkraineDelta(
  detections: FirmsDetection[],
  now: number,
): FirmsUkraineDelta {
  const aor = detections.filter(
    (d) =>
      Number.isFinite(d.latitude) &&
      Number.isFinite(d.longitude) &&
      inUkraineAor(d.latitude, d.longitude),
  );
  const last24 = aor
    .filter((d) => now - d.acquiredAt <= DAY_MS && now - d.acquiredAt >= 0)
    .sort((a, b) => b.frp - a.frp || b.acquiredAt - a.acquiredAt);
  const prev24Count = aor.filter((d) => {
    const age = now - d.acquiredAt;
    return age > DAY_MS && age <= 2 * DAY_MS;
  }).length;
  return {
    aorCount: aor.length,
    last24Count: last24.length,
    prev24Count,
    delta: last24.length - prev24Count,
    last24,
    hottest: last24.slice(0, 8),
  };
}
