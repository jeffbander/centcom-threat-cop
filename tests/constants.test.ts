import { describe, expect, it } from "vitest";
import {
  isCategory,
  isPreferredView,
  isProviderId,
  isSeverity,
  isTimeWindow,
} from "@/lib/constants";

describe("allowlists", () => {
  it("validates categories and severities", () => {
    expect(isCategory("geopolitical")).toBe(true);
    expect(isCategory("nope")).toBe(false);
    expect(isSeverity("critical")).toBe(true);
    expect(isSeverity("urgent")).toBe(false);
  });

  it("validates time windows and views", () => {
    expect(isTimeWindow("24h")).toBe(true);
    expect(isTimeWindow("1h")).toBe(false);
    expect(isPreferredView("split")).toBe(true);
    expect(isPreferredView("3d")).toBe(false);
  });

  it("validates providers", () => {
    expect(isProviderId("synthetic")).toBe(true);
    expect(isProviderId("usgs")).toBe(true);
    expect(isProviderId("open_sources")).toBe(true);
    expect(isProviderId("scraped-random")).toBe(false);
  });
});
