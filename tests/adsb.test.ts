import { describe, expect, it } from "vitest";
import { parseAdsbLol } from "../convex/lib/adsb";

const fixture = {
  ac: [
    {
      hex: "ae54c2",
      flight: "RCH123  ",
      r: "04-4131",
      t: "C17",
      lat: 33.43,
      lon: 44.4,
      alt_baro: 24000,
      gs: 420,
      track: 275.2,
      dbFlags: 1,
    },
    {
      hex: "bad",
      lat: 91,
      lon: 0,
    },
    {
      hex: "abc123",
      flight: "CIV1",
      lat: 40.0,
      lon: -74.0,
      alt_baro: 35000,
      gs: 480,
      track: 90,
      dbFlags: 0,
    },
  ],
};

describe("parseAdsbLol", () => {
  it("keeps in-range aircraft with identity, track, and military flag", () => {
    const rows = parseAdsbLol(fixture);
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe("adsb:ae54c2");
    expect(rows[0].callsign).toBe("RCH123");
    expect(rows[0].military).toBe(true);
    expect(rows[0].altitudeFt).toBe(24000);
    expect(rows[0].trackDeg).toBeCloseTo(275.2, 5);
    expect(Math.abs(rows[0].latitude)).toBeLessThanOrEqual(90);
    expect(rows[1].military).toBe(false);
  });

  it("returns empty for malformed payloads", () => {
    expect(parseAdsbLol(null)).toEqual([]);
    expect(parseAdsbLol({ ac: "nope" })).toEqual([]);
  });
});
