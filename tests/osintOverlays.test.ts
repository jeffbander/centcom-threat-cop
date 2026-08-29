import { describe, expect, it } from "vitest";
import { OSINT_CABLES, OSINT_SITES } from "@/lib/osintOverlays";

describe("OSINT overlay datasets", () => {
  it("keeps site coordinates in range and ids unique", () => {
    const ids = new Set<string>();
    for (const site of OSINT_SITES) {
      expect(Math.abs(site.latitude)).toBeLessThanOrEqual(90);
      expect(Math.abs(site.longitude)).toBeLessThanOrEqual(180);
      expect(site.name.length).toBeGreaterThan(2);
      expect(ids.has(site.id)).toBe(false);
      ids.add(site.id);
    }
    expect(OSINT_SITES.some((s) => s.kind === "base")).toBe(true);
    expect(OSINT_SITES.some((s) => s.kind === "port")).toBe(true);
    expect(OSINT_SITES.some((s) => s.kind === "nuclear")).toBe(true);
  });

  it("keeps cable corridors as valid polylines", () => {
    for (const cable of OSINT_CABLES) {
      expect(cable.path.length).toBeGreaterThanOrEqual(2);
      for (const [lat, lon] of cable.path) {
        expect(Math.abs(lat)).toBeLessThanOrEqual(90);
        expect(Math.abs(lon)).toBeLessThanOrEqual(180);
      }
    }
  });
});
