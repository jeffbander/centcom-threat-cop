import { describe, expect, it } from "vitest";
import {
  appendPoint,
  mergeTracks,
  parseOpenSkyTrack,
  parseOverpassWebcams,
  pruneTrack,
} from "../convex/lib/tracks";
import { nearbyCuratedWebcams } from "../convex/lib/publicWebcams";

describe("tracks", () => {
  it("parses an OpenSky path into 24h points", () => {
    const now = 1_788_136_254_000;
    const json = {
      icao24: "3c4b26",
      path: [
        [1_788_129_469, 33.9459, -118.4453, 0, 263, false],
        [1_788_129_475, 33.9454, -118.4508, 0, 263, false],
        [1_000_000_000, 1, 1, 0, 0, false],
      ],
    };
    const pts = parseOpenSkyTrack(json, now);
    expect(pts).toHaveLength(2);
    expect(pts[0].latitude).toBeCloseTo(33.9459, 3);
    expect(pts[1].longitude).toBeCloseTo(-118.4508, 3);
  });

  it("drops stale points and caps length", () => {
    const now = Date.parse("2026-08-31T00:00:00Z");
    const points = [
      { t: now - 48 * 3600_000, latitude: 1, longitude: 1 },
      { t: now - 1000, latitude: 2, longitude: 2 },
    ];
    const kept = pruneTrack(points, now);
    expect(kept).toHaveLength(1);
    expect(kept[0].latitude).toBe(2);
  });

  it("skips append when the contact has not moved", () => {
    const a = { t: 1000, latitude: 10, longitude: 20 };
    const next = appendPoint([a], { t: 2000, latitude: 10.0005, longitude: 20 });
    expect(next).toHaveLength(1);
  });

  it("merges snapshot and live tracks by time", () => {
    const merged = mergeTracks(
      [{ t: 1000, latitude: 1, longitude: 1 }],
      [{ t: 2000, latitude: 2, longitude: 2 }],
      3000,
    );
    expect(merged.map((p) => p.latitude)).toEqual([1, 2]);
  });

  it("parses OSM webcam elements with https urls", () => {
    const cams = parseOverpassWebcams(
      {
        elements: [
          {
            id: 1,
            lat: 40.76,
            lon: -73.98,
            tags: {
              name: "Times Square cam",
              tourism: "webcam",
              website: "https://example.com/cam",
            },
          },
        ],
      },
      { latitude: 40.76, longitude: -73.98 },
    );
    expect(cams).toHaveLength(1);
    expect(cams[0].pageUrl).toBe("https://example.com/cam");
  });
});

describe("curated webcams", () => {
  it("returns Kilauea when origin is on the Big Island", () => {
    const cams = nearbyCuratedWebcams({ latitude: 19.41, longitude: -155.28 }, 50);
    expect(cams.some((c) => c.id === "usgs-kilauea")).toBe(true);
  });

  it("returns none for mid-ocean", () => {
    const cams = nearbyCuratedWebcams({ latitude: 0, longitude: -150 }, 50);
    expect(cams).toHaveLength(0);
  });
});
