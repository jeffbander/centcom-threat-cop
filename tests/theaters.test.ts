import { describe, expect, it } from "vitest";
import { THEATER_MISSIONS, threatCondition } from "@/lib/theaters";

describe("THEATER_MISSIONS", () => {
  it("has in-range jump targets for each AOI", () => {
    expect(THEATER_MISSIONS.length).toBeGreaterThanOrEqual(5);
    for (const m of THEATER_MISSIONS) {
      expect(Math.abs(m.latitude)).toBeLessThanOrEqual(90);
      expect(Math.abs(m.longitude)).toBeLessThanOrEqual(180);
      expect(m.zoom).toBeGreaterThanOrEqual(3);
      expect(m.name.length).toBeGreaterThan(2);
    }
  });
});

describe("threatCondition", () => {
  it("escalates from green through red on critical/high counts", () => {
    expect(threatCondition(0, 0).code).toBe("TC-GREEN");
    expect(threatCondition(0, 2).code).toBe("TC-YELLOW");
    expect(threatCondition(1, 0).code).toBe("TC-ORANGE");
    expect(threatCondition(3, 0).code).toBe("TC-RED");
  });
});
