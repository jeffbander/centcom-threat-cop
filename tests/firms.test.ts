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

  it("parses keyless NASA 24h CSV headers (no instrument column)", () => {
    const publicCsv = [
      "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight",
      "19.40081,-155.27916,339.18,0.7,0.75,2026-08-28,0039,N,nominal,2.0NRT,296.7,16.51,D",
    ].join("\n");
    const detections = parseFirmsCsv(publicCsv);
    expect(detections).toHaveLength(1);
    expect(detections[0].frp).toBeCloseTo(16.51, 5);
    expect(detections[0].instrument).toBe("VIIRS");
    expect(detections[0].acquiredAt).toBe(Date.parse("2026-08-28T00:39:00Z"));
    expect(Math.abs(detections[0].latitude)).toBeLessThanOrEqual(90);
  });

  it("reserves Ukraine AOR detections even when global FRP is higher", () => {
    const lines = [
      "latitude,longitude,frp,acq_date,acq_time,satellite,instrument,confidence",
    ];
    for (let i = 0; i < 8; i++) {
      lines.push(`64.1,112.${i},90.0,2026-08-28,0100,N,VIIRS,high`);
    }
    lines.push("50.45,30.52,6.2,2026-08-28,0115,N,VIIRS,nominal");
    const detections = parseFirmsCsv(lines.join("\n"), 8);
    expect(detections.some((d) => d.latitude === 50.45 && d.longitude === 30.52)).toBe(
      true,
    );
  });
});

describe("resolveFirmsSourceState", () => {
  const now = Date.parse("2026-08-20T12:00:00Z");

  it("treats a successful public (keyless) fetch as LIVE", () => {
    const state = resolveFirmsSourceState({
      mapKey: "",
      now,
      fetchedAt: now,
    });
    expect(state).toBe("LIVE");
  });

  it("yields UNAVAILABLE when nothing has been fetched yet", () => {
    const state = resolveFirmsSourceState({
      mapKey: "",
      now,
      fetchedAt: null,
    });
    expect(state).toBe("UNAVAILABLE");
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
