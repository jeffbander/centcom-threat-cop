import { describe, expect, it } from "vitest";
import { composeSituationBrief, type BriefEvent } from "../convex/lib/briefing";

function ev(partial: Partial<BriefEvent> & Pick<BriefEvent, "_id" | "headline">): BriefEvent {
  return {
    category: "geopolitical",
    severity: "high",
    region: "Europe",
    priorityScore: 80,
    occurredAt: Date.parse("2026-08-25T00:00:00Z"),
    isSynthetic: false,
    ingestionSource: "usgs",
    ...partial,
  };
}

describe("composeSituationBrief", () => {
  const now = Date.parse("2026-08-25T12:00:00Z");

  it("ranks theaters, flags source gaps, and lists priority lines", () => {
    const brief = composeSituationBrief({
      now,
      expectedProviders: ["usgs", "cisa_kev"],
      events: [
        ev({
          _id: "1",
          headline: "M7 quake",
          category: "weather",
          severity: "critical",
          region: "Asia",
          priorityScore: 140,
          ingestionSource: "usgs",
        }),
        ev({
          _id: "2",
          headline: "CVE",
          category: "cybersecurity",
          severity: "high",
          region: "North America",
          priorityScore: 90,
          ingestionSource: "cisa_kev",
        }),
        ev({
          _id: "3",
          headline: "Older Asia",
          region: "Asia",
          priorityScore: 40,
        }),
      ],
      runs: [
        {
          provider: "usgs",
          status: "succeeded",
          completedAt: now - 60_000,
          recordsReceived: 12,
        },
        {
          provider: "cisa_kev",
          status: "failed",
          completedAt: now - 60_000,
          recordsReceived: 0,
          errorSummary: "HTTP 503",
        },
      ],
    });

    expect(brief.eventCount).toBe(3);
    expect(brief.criticalCount).toBe(1);
    expect(brief.theaters[0].region).toBe("Asia");
    expect(brief.theaters[0].critical).toBe(1);
    expect(brief.topEvents[0]._id).toBe("1");
    expect(brief.sourceGaps).toContain("CISA KEV");
    expect(brief.sourceHealth.find((s) => s.provider === "usgs")?.ok).toBe(true);
    expect(brief.disclosure).toMatch(/not verified intelligence/i);
  });

  it("treats missing or stale runs as gaps", () => {
    const brief = composeSituationBrief({
      now,
      expectedProviders: ["nga_navwarn"],
      events: [],
      runs: [
        {
          provider: "nga_navwarn",
          status: "succeeded",
          completedAt: now - 3 * 24 * 60 * 60 * 1000,
          recordsReceived: 4,
        },
      ],
    });
    expect(brief.sourceGaps.length).toBe(1);
    expect(brief.sourceHealth[0].ok).toBe(false);
  });
});
