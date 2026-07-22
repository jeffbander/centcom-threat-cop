import { describe, expect, it } from "vitest";
import { computePriorityScore, explainPriority } from "@/lib/priority";

describe("computePriorityScore", () => {
  const now = 1_700_000_000_000;

  it("ranks critical above informational with same recency", () => {
    const critical = computePriorityScore({
      severity: "critical",
      confidence: "medium",
      sourceCount: 1,
      occurredAt: now - 60_000,
      now,
    });
    const info = computePriorityScore({
      severity: "informational",
      confidence: "medium",
      sourceCount: 1,
      occurredAt: now - 60_000,
      now,
    });
    expect(critical).toBeGreaterThan(info);
  });

  it("increases with more independent sources", () => {
    const one = computePriorityScore({
      severity: "high",
      confidence: "high",
      sourceCount: 1,
      occurredAt: now,
      now,
    });
    const three = computePriorityScore({
      severity: "high",
      confidence: "high",
      sourceCount: 3,
      occurredAt: now,
      now,
    });
    expect(three).toBeGreaterThan(one);
  });

  it("decays with age", () => {
    const recent = computePriorityScore({
      severity: "high",
      confidence: "high",
      sourceCount: 2,
      occurredAt: now,
      now,
    });
    const old = computePriorityScore({
      severity: "high",
      confidence: "high",
      sourceCount: 2,
      occurredAt: now - 7 * 24 * 60 * 60 * 1000,
      now,
    });
    expect(recent).toBeGreaterThan(old);
  });

  it("is deterministic", () => {
    const input = {
      severity: "moderate" as const,
      confidence: "low" as const,
      sourceCount: 2,
      occurredAt: now - 3600_000,
      now,
      regionalActivity: 4,
    };
    expect(computePriorityScore(input)).toBe(computePriorityScore(input));
  });
});

describe("explainPriority", () => {
  it("mentions severity and sources without claiming prediction", () => {
    const text = explainPriority({
      severity: "high",
      confidence: "high",
      sourceCount: 3,
      occurredAt: Date.now(),
    });
    expect(text).toMatch(/high-severity/i);
    expect(text).toMatch(/3 sources/);
    expect(text).toMatch(/does not predict/i);
  });
});
