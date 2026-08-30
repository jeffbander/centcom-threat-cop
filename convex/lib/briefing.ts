/** Pure situation-brief composition from COP events + ingestion runs. */

import {
  LIVE_INGEST_PROVIDERS,
  PROVIDER_LABELS,
  type Category,
  type Severity,
} from "./constants";

export type BriefEvent = {
  _id: string;
  headline: string;
  category: Category;
  severity: Severity;
  region: string;
  priorityScore: number;
  occurredAt: number;
  isSynthetic: boolean;
  ingestionSource: string;
};

export type BriefRun = {
  provider: string;
  status: string;
  completedAt?: number;
  errorSummary?: string;
  recordsReceived: number;
};

export type SourceHealth = {
  provider: string;
  label: string;
  ok: boolean;
  lastAt: number | null;
  status: string;
  recordsReceived: number;
  errorSummary?: string;
};

export type TheaterLine = {
  region: string;
  count: number;
  critical: number;
  high: number;
  topHeadline: string;
  topEventId: string;
};

export type SituationBriefModel = {
  generatedAt: number;
  lastRefreshAt: number | null;
  eventCount: number;
  criticalCount: number;
  highCount: number;
  demoDataActive: boolean;
  sourceHealth: SourceHealth[];
  sourceGaps: string[];
  theaters: TheaterLine[];
  topEvents: BriefEvent[];
  categoryCounts: Array<{ category: Category; count: number }>;
  disclosure: string;
};

const FRESH_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function composeSituationBrief(input: {
  now: number;
  events: BriefEvent[];
  runs: BriefRun[];
  expectedProviders?: readonly string[];
}): SituationBriefModel {
  const now = input.now;
  const expected = input.expectedProviders ?? LIVE_INGEST_PROVIDERS;
  const recent = input.events
    .filter((e) => e.occurredAt >= now - WINDOW_MS)
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const latestByProvider = new Map<string, BriefRun>();
  for (const run of input.runs) {
    if (!run.completedAt) continue;
    const prev = latestByProvider.get(run.provider);
    if (!prev || (prev.completedAt ?? 0) < run.completedAt) {
      latestByProvider.set(run.provider, run);
    }
  }

  const sourceHealth: SourceHealth[] = expected.map((provider) => {
    const run = latestByProvider.get(provider);
    const lastAt = run?.completedAt ?? null;
    const fresh = lastAt != null && now - lastAt <= FRESH_MS;
    const ok =
      !!run &&
      fresh &&
      (run.status === "succeeded" || run.status === "partial");
    const label =
      provider in PROVIDER_LABELS
        ? PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS]
        : provider;
    return {
      provider,
      label,
      ok,
      lastAt,
      status: run?.status ?? "missing",
      recordsReceived: run?.recordsReceived ?? 0,
      errorSummary: run?.errorSummary,
    };
  });

  const theatersMap = new Map<string, TheaterLine>();
  for (const e of recent) {
    const row = theatersMap.get(e.region) ?? {
      region: e.region,
      count: 0,
      critical: 0,
      high: 0,
      topHeadline: e.headline,
      topEventId: e._id,
    };
    row.count += 1;
    if (e.severity === "critical") row.critical += 1;
    if (e.severity === "high") row.high += 1;
    theatersMap.set(e.region, row);
  }

  const catMap = new Map<Category, number>();
  for (const e of recent) {
    catMap.set(e.category, (catMap.get(e.category) ?? 0) + 1);
  }

  let lastRefreshAt: number | null = null;
  for (const run of input.runs) {
    if (
      run.completedAt &&
      (run.status === "succeeded" || run.status === "partial")
    ) {
      lastRefreshAt = Math.max(lastRefreshAt ?? 0, run.completedAt);
    }
  }
  if (lastRefreshAt === 0) lastRefreshAt = null;

  return {
    generatedAt: now,
    lastRefreshAt,
    eventCount: recent.length,
    criticalCount: recent.filter((e) => e.severity === "critical").length,
    highCount: recent.filter((e) => e.severity === "high").length,
    demoDataActive: recent.some((e) => e.isSynthetic),
    sourceHealth,
    sourceGaps: sourceHealth.filter((s) => !s.ok).map((s) => s.label),
    theaters: [...theatersMap.values()]
      .sort((a, b) => b.critical - a.critical || b.count - a.count)
      .slice(0, 6),
    topEvents: recent.slice(0, 8),
    categoryCounts: [...catMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    disclosure:
      "Sitrep assembled from stored events and ingestion runs. Source gaps: feed failed, stale (>24h), or not yet run.",
  };
}
