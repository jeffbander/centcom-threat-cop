import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const category = v.union(
  v.literal("geopolitical"),
  v.literal("infrastructure"),
  v.literal("weather"),
  v.literal("public_health"),
  v.literal("cybersecurity"),
  v.literal("transportation"),
  v.literal("energy"),
  v.literal("economic"),
);

const severity = v.union(
  v.literal("critical"),
  v.literal("high"),
  v.literal("moderate"),
  v.literal("informational"),
);

const confidence = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
);

const eventStatus = v.union(
  v.literal("active"),
  v.literal("resolved"),
  v.literal("archived"),
);

const verificationStatus = v.union(
  v.literal("unverified"),
  v.literal("corroborated"),
  v.literal("official"),
);

const timeWindow = v.union(
  v.literal("6h"),
  v.literal("24h"),
  v.literal("7d"),
);

const preferredView = v.union(
  v.literal("map"),
  v.literal("list"),
  v.literal("split"),
);

const ingestionStatus = v.union(
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("partial"),
);

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    displayName: v.string(),
    email: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerkUserId", ["clerkUserId"]),

  events: defineTable({
    externalId: v.string(),
    headline: v.string(),
    summary: v.string(),
    category,
    severity,
    confidence,
    countryCode: v.string(),
    region: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    occurredAt: v.number(),
    firstObservedAt: v.number(),
    updatedAt: v.number(),
    sourceCount: v.number(),
    status: eventStatus,
    priorityScore: v.number(),
    generatedContentDisclosure: v.string(),
    ingestionSource: v.string(),
    isSynthetic: v.boolean(),
    whyItMatters: v.optional(v.string()),
  })
    .index("by_externalId", ["externalId"])
    .index("by_occurredAt", ["occurredAt"])
    .index("by_severity_occurredAt", ["severity", "occurredAt"])
    .index("by_category_occurredAt", ["category", "occurredAt"])
    .index("by_region_occurredAt", ["region", "occurredAt"])
    .index("by_priorityScore", ["priorityScore"])
    .index("by_ingestionSource", ["ingestionSource"])
    .index("by_status_priorityScore", ["status", "priorityScore"]),

  eventSources: defineTable({
    eventId: v.id("events"),
    publisher: v.string(),
    sourceUrl: v.string(),
    publishedAt: v.optional(v.number()),
    title: v.string(),
    verificationStatus,
  }).index("by_eventId", ["eventId"]),

  userPreferences: defineTable({
    userId: v.id("users"),
    selectedCategories: v.array(v.string()),
    selectedRegions: v.array(v.string()),
    timeWindow,
    preferredView,
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  bookmarks: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_eventId", ["userId", "eventId"]),

  ingestionRuns: defineTable({
    provider: v.string(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    status: ingestionStatus,
    recordsReceived: v.number(),
    recordsCreated: v.number(),
    recordsUpdated: v.number(),
    errorSummary: v.optional(v.string()),
  })
    .index("by_provider_startedAt", ["provider", "startedAt"])
    .index("by_status_startedAt", ["status", "startedAt"]),

  productEvents: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    meta: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_name_createdAt", ["name", "createdAt"]),

  /** X/Twitter OSINT accounts to poll (handles without @). */
  xTrackedAccounts: defineTable({
    handle: v.string(),
    displayName: v.optional(v.string()),
    xUserId: v.optional(v.string()),
    tags: v.array(v.string()),
    enabled: v.boolean(),
    /** Per-account feed channel label e.g. "ukraine", "iran", "global" */
    feedChannel: v.string(),
    lastPolledAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdByUserId: v.optional(v.id("users")),
  })
    .index("by_handle", ["handle"])
    .index("by_enabled", ["enabled"])
    .index("by_feedChannel", ["feedChannel"]),

  /** Ingested posts from tracked X accounts. */
  xPosts: defineTable({
    externalId: v.string(),
    handle: v.string(),
    authorName: v.optional(v.string()),
    text: v.string(),
    url: v.string(),
    postedAt: v.number(),
    feedChannel: v.string(),
    tags: v.array(v.string()),
    likeCount: v.optional(v.number()),
    repostCount: v.optional(v.number()),
    replyCount: v.optional(v.number()),
    /** Heuristic: military / conflict signal score 0–100 */
    signalScore: v.number(),
    inferredRegion: v.optional(v.string()),
    inferredLat: v.optional(v.number()),
    inferredLon: v.optional(v.number()),
    promotedToEventId: v.optional(v.id("events")),
    createdAt: v.number(),
  })
    .index("by_externalId", ["externalId"])
    .index("by_postedAt", ["postedAt"])
    .index("by_handle_postedAt", ["handle", "postedAt"])
    .index("by_feedChannel_postedAt", ["feedChannel", "postedAt"])
    .index("by_signalScore", ["signalScore"]),
});
