import { describe, expect, it } from "vitest";
import { parseAcledPayload } from "../convex/lib/acled";

const fixture = {
  data: [
    {
      event_id_cnty: "UKR123",
      event_date: "2026-08-28",
      event_type: "Explosions/Remote violence",
      sub_event_type: "Shelling/artillery/missile attack",
      actor1: "Military Forces of Russia (2000-)",
      actor2: "Civilians (Ukraine)",
      location: "Kharkiv",
      admin1: "Kharkiv",
      fatalities: 4,
      notes: "Shelling reported in the city.",
      latitude: "49.9935",
      longitude: "36.2304",
    },
    {
      event_id_cnty: "bad",
      event_date: "2026-08-28",
      latitude: 200,
      longitude: 0,
    },
  ],
};

describe("parseAcledPayload", () => {
  it("keeps in-range coded events with identity and fatalities", () => {
    const rows = parseAcledPayload(fixture);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("acled:UKR123");
    expect(rows[0].location).toBe("Kharkiv");
    expect(rows[0].fatalities).toBe(4);
    expect(rows[0].latitude).toBeCloseTo(49.9935, 3);
  });

  it("returns empty for malformed payloads", () => {
    expect(parseAcledPayload(null)).toEqual([]);
    expect(parseAcledPayload({ data: "nope" })).toEqual([]);
  });
});
