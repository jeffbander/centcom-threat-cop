import { describe, expect, it } from "vitest";
import { aisShipTypeLabel, parseOpenWatersVessels } from "../convex/lib/ais";

const fixture = {
  features: [
    {
      id: 636000000,
      geometry: { coordinates: [55.1, 26.2] },
      properties: {
        mmsi: 636000000,
        name: "EXAMPLE TANKER",
        type: 80,
        sog: 12.4,
        cog: 90,
        heading: 88,
        nav_status: 0,
      },
    },
    {
      id: 1,
      geometry: { coordinates: [200, 0] },
      properties: { mmsi: "bad", type: 70, sog: 5 },
    },
    {
      geometry: { coordinates: [54.0, 25.0] },
      properties: { mmsi: 367000001, name: "TUG", type: 52, sog: 0 },
    },
  ],
};

describe("parseOpenWatersVessels", () => {
  it("keeps in-range vessels and ranks tankers above idle tugs", () => {
    const rows = parseOpenWatersVessels(fixture);
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe("ais:636000000");
    expect(rows[0].shipTypeLabel).toBe("tanker");
    expect(rows[0].sogKt).toBeCloseTo(12.4, 5);
    expect(Math.abs(rows[0].latitude)).toBeLessThanOrEqual(90);
  });

  it("labels AIS type 35 as military", () => {
    expect(aisShipTypeLabel(35)).toBe("military");
    expect(aisShipTypeLabel(71)).toBe("cargo");
  });

  it("returns empty for malformed payloads", () => {
    expect(parseOpenWatersVessels(null)).toEqual([]);
    expect(parseOpenWatersVessels({ features: {} })).toEqual([]);
  });
});
