import { describe, expect, it } from "vitest";
import {
  THEATER_MISSIONS,
  inMiddleEastAor,
  inUkraineAor,
  looksMiddleEastRelated,
  looksUkraineRelated,
  threatCondition,
} from "@/lib/theaters";

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

describe("inUkraineAor", () => {
  it("includes Kyiv and excludes Tehran", () => {
    expect(inUkraineAor(50.45, 30.52)).toBe(true);
    expect(inUkraineAor(35.7, 51.4)).toBe(false);
  });
});

describe("inMiddleEastAor", () => {
  it("includes Baghdad and Hormuz, excludes Kyiv", () => {
    expect(inMiddleEastAor(33.3, 44.4)).toBe(true);
    expect(inMiddleEastAor(26.5, 56.0)).toBe(true);
    expect(inMiddleEastAor(50.45, 30.52)).toBe(false);
  });
});

describe("looksMiddleEastRelated", () => {
  it("matches Levant/Gulf language", () => {
    expect(looksMiddleEastRelated("Houthi attack in the Red Sea")).toBe(true);
    expect(looksUkraineRelated("Houthi attack in the Red Sea")).toBe(false);
  });
});

describe("looksUkraineRelated", () => {
  it("matches theater language", () => {
    expect(looksUkraineRelated("Strike reported near Kharkiv")).toBe(true);
    expect(looksUkraineRelated("Typhoon approaches Tokyo")).toBe(false);
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
