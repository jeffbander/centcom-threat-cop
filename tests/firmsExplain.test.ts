import { describe, expect, it } from "vitest";
import type { FirmsDetection } from "../convex/lib/firms";
import { explainFirms } from "../lib/firmsExplain";

function det(partial: Partial<FirmsDetection> & Pick<FirmsDetection, "id" | "latitude" | "longitude" | "frp">): FirmsDetection {
  return {
    acquiredAt: Date.parse("2026-08-30T03:41:00Z"),
    satellite: "N",
    instrument: "VIIRS",
    confidence: "high",
    brightness: 340,
    daynight: "N",
    ...partial,
  };
}

describe("explainFirms", () => {
  it("names a 247 MW Ukraine pixel instead of a generic FIRMS title", () => {
    const d = det({
      id: "firms:hot",
      latitude: 48.29,
      longitude: 37.2,
      frp: 247.4,
    });
    const view = explainFirms(d, [d], Date.parse("2026-08-30T04:00:00Z"));
    expect(view.title).toMatch(/247 MW thermal/);
    expect(view.title).toMatch(/Pokrovsk|Donetsk/);
    expect(view.subtitle).toMatch(/Ukraine AOR/);
    expect(view.subtitle).toMatch(/NOAA-20/);
    expect(view.subtitle).toMatch(/night/);
    expect(view.assessment).toMatch(/247\.4 MW/);
    expect(view.assessment).toMatch(/confirmed strike/i);
    expect(view.assessment).toMatch(/not an article/i);
    expect(view.details.some((r) => r.label === "FRP" && r.value.includes("extreme"))).toBe(
      true,
    );
  });

  it("reports a heat cluster when other pixels sit within 15 km", () => {
    const a = det({
      id: "firms:a",
      latitude: 31.5,
      longitude: 34.47,
      frp: 120,
    });
    const b = det({
      id: "firms:b",
      latitude: 31.51,
      longitude: 34.48,
      frp: 80,
    });
    const view = explainFirms(a, [a, b]);
    expect(view.details.find((r) => r.label === "Cluster")?.value).toMatch(/2 px/);
    expect(view.assessment).toMatch(/heat cluster/i);
    expect(view.title).toMatch(/Gaza/);
  });

  it("does not invent a nearby city for a remote ocean pixel", () => {
    const d = det({
      id: "firms:ocean",
      latitude: 0.1,
      longitude: -150,
      frp: 12,
    });
    const view = explainFirms(d, [d]);
    expect(view.title).toMatch(/0\.10°, -150\.00°/);
    expect(view.assessment).toMatch(/No gazetteer city/);
  });
});
