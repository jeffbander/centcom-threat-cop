import { describe, expect, it } from "vitest";
import {
  mapCisaVulnerability,
  mapHealthRssItem,
  mapNewsRssItem,
  mapNgaWarning,
  parseNgaCoords,
} from "../convex/providers/worldIntel";

describe("worldIntel mappers", () => {
  const now = Date.parse("2026-08-25T12:00:00Z");

  it("parses NGA degree-minute coordinates", () => {
    const c = parseNgaCoords("MINE DANGER 22-16.65N 097-44.48W UNTIL FURTHER NOTICE");
    expect(c).not.toBeNull();
    expect(c!.latitude).toBeCloseTo(22 + 16.65 / 60, 3);
    expect(c!.longitude).toBeCloseTo(-(97 + 44.48 / 60), 3);
  });

  it("maps CISA KEV ransomware as critical and drops stale entries", () => {
    const recent = mapCisaVulnerability(
      {
        cveID: "CVE-2026-12345",
        vendorProject: "Example",
        product: "Widget",
        vulnerabilityName: "RCE",
        dateAdded: "2026-08-20",
        shortDescription: "Remote code execution.",
        knownRansomwareCampaignUse: "Known",
      },
      now,
      now - 45 * 24 * 60 * 60 * 1000,
    );
    expect(recent).not.toBeNull();
    expect(recent!.category).toBe("cybersecurity");
    expect(recent!.severity).toBe("critical");
    expect(recent!.sources[0].sourceUrl.startsWith("https:")).toBe(true);

    const stale = mapCisaVulnerability(
      {
        cveID: "CVE-2020-1",
        dateAdded: "2020-01-01",
      },
      now,
      now - 45 * 24 * 60 * 60 * 1000,
    );
    expect(stale).toBeNull();
  });

  it("maps health RSS only when WHO or a high-concern pathogen is present", () => {
    const skip = mapHealthRssItem(
      {
        title: "Local clinic hours change",
        link: "https://example.com/a",
        description: "Hours updated",
      },
      "Outbreak News Today",
      now,
    );
    expect(skip).toBeNull();

    const keep = mapHealthRssItem(
      {
        title: "Cholera outbreak in Sudan",
        link: "https://example.com/b",
        description: "Cases rising in Khartoum",
      },
      "Outbreak News Today",
      now,
    );
    expect(keep).not.toBeNull();
    expect(keep!.category).toBe("public_health");
    expect(keep!.region).toBe("Africa");
  });

  it("drops news without a geocodable place", () => {
    const dropped = mapNewsRssItem(
      {
        title: "Markets mixed as traders await data",
        link: "https://example.com/c",
        description: "Stocks and bonds",
      },
      "BBC World",
      now,
    );
    expect(dropped).toBeNull();

    const kept = mapNewsRssItem(
      {
        title: "Ukraine reports overnight strikes on Kharkiv",
        link: "https://example.com/d",
        description: "Air defense active",
      },
      "BBC World",
      now,
    );
    expect(kept).not.toBeNull();
    expect(kept!.category).toBe("geopolitical");
    expect(kept!.countryCode).toBe("UA");
  });

  it("skips cancelled NGA warnings and uses NAVAREA centroid without coords", () => {
    expect(
      mapNgaWarning(
        {
          msgYear: 2026,
          msgNumber: 1,
          navArea: "IX",
          cancelDate: "2026-08-01",
          text: "CANCELLED",
        },
        now,
      ),
    ).toBeNull();

    const mapped = mapNgaWarning(
      {
        msgYear: 2026,
        msgNumber: 12,
        navArea: "IX",
        issueDate: "2026-08-24T00:00:00Z",
        text: "GUNFIRE EXERCISE IN THE PERSIAN GULF",
      },
      now,
    );
    expect(mapped).not.toBeNull();
    expect(mapped!.category).toBe("transportation");
    expect(mapped!.region).toBe("Middle East");
  });
});
