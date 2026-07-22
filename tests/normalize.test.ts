import { describe, expect, it } from "vitest";
import { normalizeProviderRecord } from "../convex/lib/normalize";

describe("normalizeProviderRecord", () => {
  const base = {
    externalId: "t-1",
    headline: "Test",
    summary: "Summary",
    category: "weather",
    severity: "high",
    confidence: "medium",
    countryCode: "xx",
    region: "Europe",
    latitude: 48,
    longitude: 2,
    occurredAt: Date.now(),
    sources: [
      {
        publisher: "Pub",
        sourceUrl: "https://example.com/a",
        title: "Title",
        verificationStatus: "official" as const,
      },
      {
        publisher: "Bad",
        sourceUrl: "http://insecure.example.com",
        title: "Drop me",
      },
    ],
  };

  it("normalizes valid records and drops non-https sources", () => {
    const n = normalizeProviderRecord(base, "synthetic");
    expect(n).not.toBeNull();
    expect(n!.countryCode).toBe("XX");
    expect(n!.sourceCount).toBe(1);
    expect(n!.sources).toHaveLength(1);
    expect(n!.isSynthetic).toBe(true);
    expect(n!.priorityScore).toBeGreaterThan(0);
  });

  it("rejects invalid category", () => {
    expect(
      normalizeProviderRecord(
        { ...base, category: "not-real" },
        "synthetic",
      ),
    ).toBeNull();
  });

  it("rejects invalid coordinates", () => {
    expect(
      normalizeProviderRecord({ ...base, latitude: 999 }, "synthetic"),
    ).toBeNull();
  });
});
