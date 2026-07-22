/** Convex-side allowlists (mirror of lib/constants for backend isolation). */

export const CATEGORIES = [
  "geopolitical",
  "infrastructure",
  "weather",
  "public_health",
  "cybersecurity",
  "transportation",
  "energy",
  "economic",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const SEVERITIES = [
  "critical",
  "high",
  "moderate",
  "informational",
] as const;

export type Severity = (typeof SEVERITIES)[number];

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const TIME_WINDOWS = ["6h", "24h", "7d"] as const;
export type TimeWindow = (typeof TIME_WINDOWS)[number];

export const TIME_WINDOW_MS: Record<TimeWindow, number> = {
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

export const PREFERRED_VIEWS = ["map", "list", "split"] as const;
export type PreferredView = (typeof PREFERRED_VIEWS)[number];

/** Open-source + optional synthetic demo providers. */
export const PROVIDERS = [
  "synthetic",
  "usgs",
  "gdacs",
  "eonet",
  "un_peace",
  "strategic_theaters",
  "open_sources",
  "x_osint",
] as const;
export type ProviderId = (typeof PROVIDERS)[number];

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function isSeverity(value: string): value is Severity {
  return (SEVERITIES as readonly string[]).includes(value);
}

export function isTimeWindow(value: string): value is TimeWindow {
  return (TIME_WINDOWS as readonly string[]).includes(value);
}

export function isPreferredView(value: string): value is PreferredView {
  return (PREFERRED_VIEWS as readonly string[]).includes(value);
}

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDERS as readonly string[]).includes(value);
}

export function isConfidence(value: string): value is Confidence {
  return (CONFIDENCE_LEVELS as readonly string[]).includes(value);
}
