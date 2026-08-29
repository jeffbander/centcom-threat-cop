/** Allowlisted domain enums for CENTCOM · Threat COP. */

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

export const CATEGORY_LABELS: Record<Category, string> = {
  geopolitical: "Geopolitical",
  infrastructure: "Infrastructure",
  weather: "Weather",
  public_health: "Public health",
  cybersecurity: "Cybersecurity",
  transportation: "Transportation",
  energy: "Energy",
  economic: "Economic",
};

export const SEVERITIES = [
  "critical",
  "high",
  "moderate",
  "informational",
] as const;

export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  moderate: "Moderate",
  informational: "Informational",
};

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const TIME_WINDOWS = ["6h", "24h", "7d"] as const;
export type TimeWindow = (typeof TIME_WINDOWS)[number];

export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  "6h": "Last 6 hours",
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
};

export const TIME_WINDOW_MS: Record<TimeWindow, number> = {
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

export const PREFERRED_VIEWS = ["map", "list", "split"] as const;
export type PreferredView = (typeof PREFERRED_VIEWS)[number];

export const EVENT_STATUSES = ["active", "resolved", "archived"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const VERIFICATION_STATUSES = [
  "unverified",
  "corroborated",
  "official",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const INGESTION_STATUSES = [
  "running",
  "succeeded",
  "failed",
  "partial",
] as const;
export type IngestionStatus = (typeof INGESTION_STATUSES)[number];

export const PROVIDERS = [
  "synthetic",
  "usgs",
  "gdacs",
  "eonet",
  "un_peace",
  "strategic_theaters",
  "open_sources",
  "x_osint",
  "cisa_kev",
  "health_outbreaks",
  "osint_news",
  "nga_navwarn",
] as const;
export type ProviderId = (typeof PROVIDERS)[number];

/** Providers expected on a live open-source refresh (excludes synthetic / X). */
export const LIVE_INGEST_PROVIDERS = [
  "usgs",
  "gdacs",
  "eonet",
  "un_peace",
  "strategic_theaters",
  "cisa_kev",
  "health_outbreaks",
  "osint_news",
  "nga_navwarn",
] as const;

export const PROVIDER_LABELS: Record<(typeof LIVE_INGEST_PROVIDERS)[number], string> =
  {
    usgs: "USGS seismic",
    gdacs: "GDACS hazards",
    eonet: "NASA EONET",
    un_peace: "UN peace/security",
    strategic_theaters: "Theater baselines",
    cisa_kev: "CISA KEV",
    health_outbreaks: "Health outbreaks",
    osint_news: "OSINT news",
    nga_navwarn: "NGA nav warnings",
  };

export const SEVERITY_THREAT_LABELS: Record<Severity, string> = {
  critical: "THREAT CRITICAL",
  high: "THREAT HIGH",
  moderate: "ELEVATED",
  informational: "WATCH",
};

export const REGIONS = [
  "North America",
  "South America",
  "Europe",
  "Middle East",
  "Africa",
  "Asia",
  "Oceania",
  "Global",
] as const;

export type Region = (typeof REGIONS)[number];

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
