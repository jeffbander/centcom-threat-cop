import { describe, expect, it } from "vitest";
import {
  isSafeHttpsUrl,
  isValidLatitude,
  isValidLongitude,
  isValidTimestamp,
  sanitizePlainText,
} from "@/lib/validation";

describe("coordinates", () => {
  it("accepts valid lat/lon", () => {
    expect(isValidLatitude(0)).toBe(true);
    expect(isValidLatitude(90)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
    expect(isValidLatitude(91)).toBe(false);
    expect(isValidLongitude(200)).toBe(false);
    expect(isValidLatitude(NaN)).toBe(false);
  });
});

describe("timestamps", () => {
  it("accepts finite positive epoch ms", () => {
    expect(isValidTimestamp(Date.now())).toBe(true);
    expect(isValidTimestamp(-1)).toBe(false);
    expect(isValidTimestamp(Infinity)).toBe(false);
  });
});

describe("isSafeHttpsUrl", () => {
  it("allows https only", () => {
    expect(isSafeHttpsUrl("https://example.com/a")).toBe(true);
    expect(isSafeHttpsUrl("http://example.com")).toBe(false);
    expect(isSafeHttpsUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpsUrl("data:text/html,hi")).toBe(false);
    expect(isSafeHttpsUrl("not a url")).toBe(false);
  });
});

describe("sanitizePlainText", () => {
  it("strips control chars and truncates", () => {
    expect(sanitizePlainText("a\u0000b", 10)).toBe("ab");
    expect(sanitizePlainText("hello world", 5)).toBe("hello");
  });
});
