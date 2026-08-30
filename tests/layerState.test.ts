import { describe, expect, it } from "vitest";
import {
  presentLayerSnapshotStatus,
  resolveLayerSourceState,
} from "../convex/lib/layerState";

describe("presentLayerSnapshotStatus", () => {
  const now = Date.parse("2026-08-29T12:00:00Z");

  it("keeps a stored STALE snapshot STALE even when fetchedAt is recent", () => {
    const status = presentLayerSnapshotStatus({
      layer: "satellites",
      storedStatus: "STALE",
      now,
      fetchedAt: now - 1_000,
    });
    expect(status).toBe("STALE");
    expect(status).not.toBe("LIVE");
  });

  it("does not let age-based resolve promote a seed snapshot to LIVE", () => {
    const derived = resolveLayerSourceState({
      layer: "satellites",
      now,
      fetchedAt: now,
    });
    expect(derived).toBe("LIVE");

    const presented = presentLayerSnapshotStatus({
      layer: "satellites",
      storedStatus: "STALE",
      now,
      fetchedAt: now,
    });
    expect(presented).toBe("STALE");
  });

  it("still ages a stored LIVE snapshot to STALE after the window", () => {
    const status = presentLayerSnapshotStatus({
      layer: "satellites",
      storedStatus: "LIVE",
      now,
      fetchedAt: now - 7 * 60 * 60 * 1000,
    });
    expect(status).toBe("STALE");
  });

  it("keeps a stored LIVE FIRMS snapshot LIVE when MAP_KEY is unset", () => {
    expect(
      presentLayerSnapshotStatus({
        layer: "firms",
        storedStatus: "LIVE",
        now,
        fetchedAt: now - 60_000,
        keyPresent: false,
      }),
    ).toBe("LIVE");
  });

  it("ages ADS-B LIVE to STALE after three minutes", () => {
    expect(
      presentLayerSnapshotStatus({
        layer: "adsb",
        storedStatus: "LIVE",
        now,
        fetchedAt: now - 4 * 60 * 1000,
      }),
    ).toBe("STALE");
    expect(
      presentLayerSnapshotStatus({
        layer: "adsb",
        storedStatus: "LIVE",
        now,
        fetchedAt: now - 30_000,
      }),
    ).toBe("LIVE");
  });

  it("keeps KEY_REQUIRED and UNAVAILABLE as stored", () => {
    expect(
      presentLayerSnapshotStatus({
        layer: "firms",
        storedStatus: "KEY_REQUIRED",
        now,
        fetchedAt: now,
        keyPresent: true,
      }),
    ).toBe("KEY_REQUIRED");
    expect(
      presentLayerSnapshotStatus({
        layer: "satellites",
        storedStatus: "UNAVAILABLE",
        now,
        fetchedAt: now,
      }),
    ).toBe("UNAVAILABLE");
  });
});
