/** Per-layer source-state for live COP overlays. Not inferred from empty arrays. */

export const LAYER_SOURCE_STATES = [
  "LIVE",
  "STALE",
  "KEY_REQUIRED",
  "UNAVAILABLE",
] as const;

export type LayerSourceState = (typeof LAYER_SOURCE_STATES)[number];

export const LAYER_IDS = [
  "firms",
  "satellites",
  "adsb",
  "quakes",
  "ais",
  "launches",
  "acled",
] as const;
export type LayerId = (typeof LAYER_IDS)[number];

export const FIRMS_STALE_MS = 45 * 60 * 1000;
export const SATELLITES_STALE_MS = 6 * 60 * 60 * 1000;
export const ADSB_STALE_MS = 3 * 60 * 1000;
export const QUAKES_STALE_MS = 20 * 60 * 1000;
export const AIS_STALE_MS = 8 * 60 * 1000;
export const LAUNCHES_STALE_MS = 6 * 60 * 60 * 1000;
export const ACLED_STALE_MS = 36 * 60 * 60 * 1000;

export const STALE_AFTER_MS: Record<LayerId, number> = {
  firms: FIRMS_STALE_MS,
  satellites: SATELLITES_STALE_MS,
  adsb: ADSB_STALE_MS,
  quakes: QUAKES_STALE_MS,
  ais: AIS_STALE_MS,
  launches: LAUNCHES_STALE_MS,
  acled: ACLED_STALE_MS,
};

export function isLayerSourceState(value: string): value is LayerSourceState {
  return (LAYER_SOURCE_STATES as readonly string[]).includes(value);
}

export function isLayerId(value: string): value is LayerId {
  return (LAYER_IDS as readonly string[]).includes(value);
}

/**
 * Resolve overlay freshness from credentials + fetch outcome + age.
 * Empty detections with a working source can still be LIVE (no fires).
 * Invalid MAP_KEY is KEY_REQUIRED. Public FIRMS CSV needs no key.
 */
export function resolveLayerSourceState(input: {
  layer: LayerId;
  now: number;
  fetchedAt: number | null;
  keyPresent?: boolean;
  keyInvalid?: boolean;
  fetchFailed?: boolean;
  staleAfterMs?: number;
}): LayerSourceState {
  if (input.layer === "firms" && input.keyInvalid) {
    return "KEY_REQUIRED";
  }
  if (input.layer === "acled" && input.keyPresent === false) {
    return "KEY_REQUIRED";
  }
  if (input.fetchFailed) return "UNAVAILABLE";
  if (input.fetchedAt == null || !Number.isFinite(input.fetchedAt)) {
    return "UNAVAILABLE";
  }
  const staleAfter = input.staleAfterMs ?? STALE_AFTER_MS[input.layer];
  if (input.now - input.fetchedAt > staleAfter) return "STALE";
  return "LIVE";
}

/**
 * Present a stored snapshot's chip. Age can demote LIVE → STALE.
 * Stored STALE / KEY_REQUIRED / UNAVAILABLE never promote to LIVE just
 * because `fetchedAt` is recent (seeded catalogs write fetchedAt=now).
 */
export function presentLayerSnapshotStatus(input: {
  layer: LayerId;
  storedStatus: LayerSourceState;
  now: number;
  fetchedAt: number | null;
  keyPresent?: boolean;
  staleAfterMs?: number;
}): LayerSourceState {
  if (input.storedStatus === "KEY_REQUIRED") return "KEY_REQUIRED";
  if (input.storedStatus === "UNAVAILABLE") return "UNAVAILABLE";
  if (input.storedStatus === "STALE") return "STALE";
  // Stored LIVE may age to STALE. Do not demote to KEY_REQUIRED just because
  // FIRMS_MAP_KEY is unset — public 24h CSV does not use a MAP_KEY.
  return resolveLayerSourceState({
    layer: input.layer,
    now: input.now,
    fetchedAt: input.fetchedAt,
    keyPresent: true,
    staleAfterMs: input.staleAfterMs,
  });
}
