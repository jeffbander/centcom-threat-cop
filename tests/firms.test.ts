import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseFirmsCsv,
  resolveFirmsSourceState,
} from "../convex/lib/firms";

const csv = readFileSync(
  path.join(__dirname, "fixtures/firms-sample.csv"),
  "utf8",
);

describe("parseFirmsCsv", () => {
  it("parses NASA FIRMS CSV into detections with coords, FRP, time, and sensor", () => {
    const detections = parseFirmsCsv(csv);
    expect(detections.length).toBe(3);

    for (const d of detections) {
      expect(Number.isFinite(d.latitude)).toBe(true);
      expect(Number.isFinite(d.longitude)).toBe(true);
      expect(Math.abs(d.latitude)).toBeLessThanOrEqual(90);
      expect(Math.abs(d.longitude)).toBeLessThanOrEqual(180);
      expect(typeof d.frp).toBe("number");
      expect(Number.isFinite(d.frp)).toBe(true);
      expect(Number.isFinite(d.acquiredAt)).toBe(true);
      expect(d.satellite.length).toBeGreaterThan(0);
      expect(d.instrument.toLowerCase()).toContain("viirs");
      expect(d.id.startsWith("firms:")).toBe(true);
    }

    const hottest = detections[0];
    expect(hottest.frp).toBeCloseTo(48.6, 5);
    expect(hottest.latitude).toBeCloseTo(34.06, 4);
    expect(hottest.acquiredAt).toBe(Date.parse("2026-08-20T08:42:00Z"));
  });

  it("drops out-of-range and non-numeric coordinates", () => {
    const detections = parseFirmsCsv(csv);
    expect(detections.every((d) => Math.abs(d.latitude) <= 90)).toBe(true);
  });
});

describe("resolveFirmsSourceState", () => {
  const now = Date.parse("2026-08-20T12:00:00Z");

  it("yields KEY REQUIRED when MAP_KEY is missing (not LIVE, not empty-as-zero)", () => {
    const state = resolveFirmsSourceState({
      mapKey: "",
      now,
      fetchedAt: now,
    });
    expect(state).toBe("KEY_REQUIRED");
    expect(state).not.toBe("LIVE");
  });

  it("yields KEY REQUIRED for an invalid MAP_KEY response", () => {
    const state = resolveFirmsSourceState({
      mapKey: "not-a-real-key",
      now,
      httpStatus: 200,
      bodyPreview: "Invalid MAP_KEY.\n",
      fetchFailed: true,
    });
    expect(state).toBe("KEY_REQUIRED");
    expect(state).not.toBe("LIVE");
    expect(state).not.toBe("UNAVAILABLE");
  });

  it("yields KEY REQUIRED on HTTP 403", () => {
    const state = resolveFirmsSourceState({
      mapKey: "abc",
      now,
      httpStatus: 403,
      bodyPreview: "Forbidden",
    });
    expect(state).toBe("KEY_REQUIRED");
  });

  it("yields LIVE for a fresh successful fetch", () => {
    const state = resolveFirmsSourceState({
      mapKey: "valid-key",
      now,
      fetchedAt: now - 60_000,
      httpStatus: 200,
      bodyPreview: "latitude,longitude,frp\n",
    });
    expect(state).toBe("LIVE");
  });

  it("yields STALE when the snapshot is older than 45 minutes", () => {
    const state = resolveFirmsSourceState({
      mapKey: "valid-key",
      now,
      fetchedAt: now - 50 * 60 * 1000,
      httpStatus: 200,
      bodyPreview: "latitude,longitude\n",
    });
    expect(state).toBe("STALE");
  });

  it("yields UNAVAILABLE on a transport failure with a key present", () => {
    const state = resolveFirmsSourceState({
      mapKey: "valid-key",
      now,
      httpStatus: 503,
      bodyPreview: "upstream down",
      fetchFailed: true,
    });
    expect(state).toBe("UNAVAILABLE");
  });
});
