/** Per-layer source-state for live COP overlays. Not inferred from empty arrays. */

export const LAYER_SOURCE_STATES = [
  "LIVE",
  "STALE",
  "KEY_REQUIRED",
  "UNAVAILABLE",
] as const;

export type LayerSourceState = (typeof LAYER_SOURCE_STATES)[number];

export const LAYER_IDS = ["firms", "satellites", "adsb"] as const;
export type LayerId = (typeof LAYER_IDS)[number];

export const FIRMS_STALE_MS = 45 * 60 * 1000;
export const SATELLITES_STALE_MS = 6 * 60 * 60 * 1000;
export const ADSB_STALE_MS = 3 * 60 * 1000;

export const STALE_AFTER_MS: Record<LayerId, number> = {
  firms: FIRMS_STALE_MS,
  satellites: SATELLITES_STALE_MS,
  adsb: ADSB_STALE_MS,
};

export function isLayerSourceState(value: string): value is LayerSourceState {
  return (LAYER_SOURCE_STATES as readonly string[]).includes(value);
}

export function isLayerId(value: string): value is LayerId {
  return (LAYER_IDS as readonly string[]).includes(value);
}

/**
 * Resolve overlay freshness from credentials + fetch outcome + age.
 * Empty detections with a working key can still be LIVE (no fires).
 * Missing/invalid keys are KEY_REQUIRED, never LIVE, never silent empty-as-zero.
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
  if (input.layer === "firms") {
    if (input.keyInvalid || input.keyPresent === false) {
      return "KEY_REQUIRED";
    }
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
  return resolveLayerSourceState({
    layer: input.layer,
    now: input.now,
    fetchedAt: input.fetchedAt,
    keyPresent: input.keyPresent,
    staleAfterMs: input.staleAfterMs,
  });
}
