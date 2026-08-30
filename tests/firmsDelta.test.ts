import { describe, expect, it } from "vitest";
import { firmsUkraineDelta } from "@/lib/firmsDelta";
import type { FirmsDetection } from "@/convex/lib/firms";

function det(
  partial: Pick<FirmsDetection, "id" | "latitude" | "longitude" | "frp" | "acquiredAt">,
): FirmsDetection {
  return {
    satellite: "N",
    instrument: "VIIRS",
    confidence: "high",
    brightness: null,
    daynight: "N",
    ...partial,
  };
}

describe("firmsUkraineDelta", () => {
  const now = Date.parse("2026-08-30T12:00:00Z");

  it("counts new vs previous 24h thermals inside the Ukraine AOR", () => {
    const rows = [
      det({
        id: "new",
        latitude: 50.45,
        longitude: 30.52,
        frp: 40,
        acquiredAt: now - 3 * 60 * 60 * 1000,
      }),
      det({
        id: "old",
        latitude: 50.0,
        longitude: 36.2,
        frp: 20,
        acquiredAt: now - 30 * 60 * 60 * 1000,
      }),
      det({
        id: "siberia",
        latitude: 64.0,
        longitude: 112.0,
        frp: 90,
        acquiredAt: now - 1 * 60 * 60 * 1000,
      }),
    ];
    const d = firmsUkraineDelta(rows, now);
    expect(d.aorCount).toBe(2);
    expect(d.last24Count).toBe(1);
    expect(d.prev24Count).toBe(1);
    expect(d.delta).toBe(0);
    expect(d.hottest[0].id).toBe("new");
  });
});
