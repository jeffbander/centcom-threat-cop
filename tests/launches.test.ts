import { describe, expect, it } from "vitest";
import { parseLaunchLibrary } from "../convex/lib/launches";

const fixture = {
  results: [
    {
      id: "abc-1",
      name: "Falcon 9 | Starlink",
      net: "2026-09-01T12:00:00Z",
      status: { abbrev: "Go" },
      launch_service_provider: { name: "SpaceX" },
      rocket: { configuration: { name: "Falcon 9" } },
      pad: {
        name: "SLC-40",
        latitude: "28.5619",
        longitude: "-80.5772",
        location: { name: "Cape Canaveral, FL, USA" },
      },
    },
    {
      id: "no-pad",
      name: "Mystery",
      net: "2026-09-02T00:00:00Z",
      pad: { name: "unknown" },
    },
  ],
};

describe("parseLaunchLibrary", () => {
  it("keeps upcoming launches with in-range pads", () => {
    const rows = parseLaunchLibrary(fixture);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("launch:abc-1");
    expect(rows[0].provider).toBe("SpaceX");
    expect(rows[0].latitude).toBeCloseTo(28.5619, 4);
    expect(rows[0].status).toBe("Go");
  });

  it("returns empty for malformed payloads", () => {
    expect(parseLaunchLibrary(null)).toEqual([]);
    expect(parseLaunchLibrary({ results: "nope" })).toEqual([]);
  });
});
