import { describe, expect, it } from "vitest";
import { FIRMS_NEAR_EVENT_KM, firmsNearEvent } from "@/lib/spatialJoin";

describe("firmsNearEvent", () => {
  it("returns only FIRMS detections within 50 km of the event", () => {
    const event = { latitude: 34.0522, longitude: -118.2437 };
    const detections = [
      {
        id: "near",
        latitude: 34.06,
        longitude: -118.25,
        frp: 40,
      },
      {
        id: "far",
        latitude: 36.17,
        longitude: -115.14,
        frp: 90,
      },
    ];
    const hits = firmsNearEvent(event, detections, FIRMS_NEAR_EVENT_KM);
    expect(hits.map((h) => h.id)).toEqual(["near"]);
    expect(hits[0].distanceKm).toBeLessThanOrEqual(50);
  });
});
