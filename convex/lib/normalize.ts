import {
  isCategory,
  isConfidence,
  isSeverity,
  type Category,
  type Confidence,
  type Severity,
} from "./constants";
import {
  isSafeHttpsUrl,
  isValidLatitude,
  isValidLongitude,
  isValidTimestamp,
  sanitizePlainText,
} from "./validation";
import { computePriorityScore } from "./priority";

export type NormalizedSource = {
  publisher: string;
  sourceUrl: string;
  publishedAt?: number;
  title: string;
  verificationStatus: "unverified" | "corroborated" | "official";
};

export type NormalizedEvent = {
  externalId: string;
  headline: string;
  summary: string;
  category: Category;
  severity: Severity;
  confidence: Confidence;
  countryCode: string;
  region: string;
  latitude: number;
  longitude: number;
  occurredAt: number;
  firstObservedAt: number;
  sourceCount: number;
  status: "active" | "resolved" | "archived";
  priorityScore: number;
  generatedContentDisclosure: string;
  ingestionSource: string;
  isSynthetic: boolean;
  whyItMatters?: string;
  sources: NormalizedSource[];
};

export type ProviderRecord = {
  externalId: string;
  headline: string;
  summary: string;
  category: string;
  severity: string;
  confidence: string;
  countryCode: string;
  region: string;
  latitude: number;
  longitude: number;
  occurredAt: number;
  firstObservedAt?: number;
  status?: "active" | "resolved" | "archived";
  generatedContentDisclosure?: string;
  isSynthetic?: boolean;
  whyItMatters?: string;
  sources: Array<{
    publisher: string;
    sourceUrl: string;
    publishedAt?: number;
    title: string;
    verificationStatus?: "unverified" | "corroborated" | "official";
  }>;
};

export function normalizeProviderRecord(
  raw: ProviderRecord,
  ingestionSource: string,
  now = Date.now(),
  regionalActivity = 0,
): NormalizedEvent | null {
  if (!raw.externalId || !raw.headline || !raw.summary) return null;
  if (!isCategory(raw.category)) return null;
  if (!isSeverity(raw.severity)) return null;
  if (!isConfidence(raw.confidence)) return null;
  if (!isValidLatitude(raw.latitude) || !isValidLongitude(raw.longitude))
    return null;
  if (!isValidTimestamp(raw.occurredAt)) return null;

  const sources: NormalizedSource[] = [];
  for (const s of raw.sources ?? []) {
    if (!isSafeHttpsUrl(s.sourceUrl)) continue;
    sources.push({
      publisher: sanitizePlainText(s.publisher, 200),
      sourceUrl: s.sourceUrl,
      publishedAt: s.publishedAt,
      title: sanitizePlainText(s.title, 500),
      verificationStatus: s.verificationStatus ?? "unverified",
    });
  }

  const sourceCount = sources.length;
  const priorityScore = computePriorityScore({
    severity: raw.severity,
    confidence: raw.confidence,
    sourceCount,
    occurredAt: raw.occurredAt,
    now,
    regionalActivity,
  });

  return {
    externalId: sanitizePlainText(raw.externalId, 200),
    headline: sanitizePlainText(raw.headline, 500),
    summary: sanitizePlainText(raw.summary, 2000),
    category: raw.category,
    severity: raw.severity,
    confidence: raw.confidence,
    countryCode: sanitizePlainText(raw.countryCode, 8).toUpperCase(),
    region: sanitizePlainText(raw.region, 80),
    latitude: raw.latitude,
    longitude: raw.longitude,
    occurredAt: raw.occurredAt,
    firstObservedAt: raw.firstObservedAt ?? raw.occurredAt,
    sourceCount,
    status: raw.status ?? "active",
    priorityScore,
    generatedContentDisclosure:
      raw.generatedContentDisclosure ??
      "System-generated summary for situational awareness. Not a verified primary-source fact.",
    ingestionSource,
    isSynthetic: raw.isSynthetic ?? ingestionSource === "synthetic",
    whyItMatters: raw.whyItMatters
      ? sanitizePlainText(raw.whyItMatters, 1000)
      : undefined,
    sources,
  };
}
