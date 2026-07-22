/**
 * Privacy-conscious product analytics.
 * Records action names only — never search text or event content.
 */

export type AnalyticsEventName =
  | "dashboard_viewed"
  | "filter_changed"
  | "event_opened"
  | "source_link_followed"
  | "event_bookmarked"
  | "refresh_requested";

export type AnalyticsPayload = {
  name: AnalyticsEventName;
  /** Opaque ids only — never free text from users or events. */
  meta?: Record<string, string | number | boolean>;
};

export function trackProductEvent(payload: AnalyticsPayload): void {
  if (typeof window === "undefined") return;
  // Structured console signal for v1; Convex mutation is the durable sink.
  console.info("[gsm-analytics]", payload.name, payload.meta ?? {});
}
