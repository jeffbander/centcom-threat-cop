/**
 * Deterministic, explainable priority scoring for situational events.
 * Does not predict future events — ranks current attention only.
 */

import type { Confidence, Severity } from "./constants";

export type PriorityInputs = {
  severity: Severity;
  confidence: Confidence;
  sourceCount: number;
  occurredAt: number;
  now?: number;
  /** Count of other active events in the same region (capped influence). */
  regionalActivity?: number;
};

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 100,
  high: 70,
  moderate: 40,
  informational: 15,
};

const CONFIDENCE_WEIGHT: Record<Confidence, number> = {
  high: 20,
  medium: 12,
  low: 5,
};

/** Half-life in ms for recency decay (~18 hours). */
const RECENCY_HALF_LIFE_MS = 18 * 60 * 60 * 1000;

export function computePriorityScore(input: PriorityInputs): number {
  const now = input.now ?? Date.now();
  const ageMs = Math.max(0, now - input.occurredAt);
  const recency =
    40 * Math.pow(0.5, ageMs / RECENCY_HALF_LIFE_MS);

  const sources = Math.min(25, Math.max(0, input.sourceCount) * 5);
  const regional = Math.min(
    15,
    Math.max(0, input.regionalActivity ?? 0) * 3,
  );

  const raw =
    SEVERITY_WEIGHT[input.severity] +
    CONFIDENCE_WEIGHT[input.confidence] +
    recency +
    sources +
    regional;

  return Math.round(raw * 100) / 100;
}

export function explainPriority(input: PriorityInputs): string {
  const parts: string[] = [];
  const severityPhrase: Record<Severity, string> = {
    critical: "critical-severity",
    high: "high-severity",
    moderate: "moderate-severity",
    informational: "informational",
  };

  parts.push(`this is a recent, ${severityPhrase[input.severity]} event`);

  if (input.sourceCount >= 3) {
    parts.push(`reported by ${input.sourceCount} sources`);
  } else if (input.sourceCount === 2) {
    parts.push("reported by two sources");
  } else if (input.sourceCount === 1) {
    parts.push("based on a single reported source");
  }

  if (input.confidence === "high") {
    parts.push("with high confidence");
  } else if (input.confidence === "low") {
    parts.push("with lower confidence");
  }

  if ((input.regionalActivity ?? 0) >= 3) {
    parts.push("in a region with elevated activity");
  }

  const body = parts.join(", ");
  return `Ranked highly because ${body}. This score does not predict future events.`;
}
