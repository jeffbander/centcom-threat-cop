import { describe, expect, it } from "vitest";
import { formatDms, formatZuluDtg } from "@/lib/coords";

describe("formatDms", () => {
  it("formats northern/eastern hemisphere with padded minutes", () => {
    expect(formatDms(33.5, 44.4)).toBe(`33°30'00.0"N 44°24'00.0"E`);
  });

  it("formats southern/western hemisphere", () => {
    const s = formatDms(-12.5, -45.25);
    expect(s).toContain("S");
    expect(s).toContain("W");
    expect(s).toContain("12°");
  });

  it("returns em dash for non-finite input", () => {
    expect(formatDms(Number.NaN, 0)).toBe("—");
  });
});

describe("formatZuluDtg", () => {
  it("emits a DTG with Zulu suffix", () => {
    const s = formatZuluDtg(Date.UTC(2026, 7, 29, 12, 34, 0));
    expect(s).toBe("291234Z AUG 26");
  });
});
