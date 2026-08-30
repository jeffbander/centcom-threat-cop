import { describe, expect, it } from "vitest";
import { parseUsgsGeojson } from "../convex/lib/quakes";

const fixture = {
  features: [
    {
      id: "us7000test",
      geometry: { coordinates: [44.4, 33.3, 12] },
      properties: {
        mag: 5.4,
        place: "10 km E of Baghdad, Iraq",
        time: 1_700_000_000_000,
        title: "M 5.4 - 10 km E of Baghdad, Iraq",
        tsunami: 0,
        url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000test",
      },
    },
    {
      id: "tiny",
      geometry: { coordinates: [0, 0, 1] },
      properties: { mag: 1.1, place: "too small", time: 1 },
    },
    {
      id: "bad",
      geometry: { coordinates: [200, 0, 1] },
      properties: { mag: 6, place: "out of range", time: 1 },
    },
  ],
};

describe("parseUsgsGeojson", () => {
  it("keeps in-range M2.5+ quakes as contacts", () => {
    const rows = parseUsgsGeojson(fixture);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("quake:us7000test");
    expect(rows[0].magnitude).toBeCloseTo(5.4, 5);
    expect(rows[0].latitude).toBeCloseTo(33.3, 5);
    expect(rows[0].longitude).toBeCloseTo(44.4, 5);
    expect(rows[0].tsunami).toBe(false);
  });

  it("returns empty for malformed payloads", () => {
    expect(parseUsgsGeojson(null)).toEqual([]);
    expect(parseUsgsGeojson({ features: "nope" })).toEqual([]);
  });
});
