import { describe, expect, it } from "vitest";
import { buildNearbyRoster } from "@/lib/nearby";
import type { SelectedContact } from "@/components/dashboard/DashboardContext";

function c(
  partial: Pick<SelectedContact, "id" | "kind" | "latitude" | "longitude" | "title">,
): SelectedContact {
  return {
    subtitle: "",
    details: [],
    provenance: "test",
    ...partial,
  };
}

describe("buildNearbyRoster", () => {
  it("keeps contacts within 250 km and drops the origin itself", () => {
    const origin = { latitude: 26.5, longitude: 56.0 };
    const items = buildNearbyRoster(origin, [
      c({
        id: "ais:1",
        kind: "ais",
        latitude: 26.6,
        longitude: 56.1,
        title: "near ship",
      }),
      c({
        id: "quake:far",
        kind: "quake",
        latitude: 0,
        longitude: 0,
        title: "far",
      }),
    ]);
    expect(items.map((i) => i.contact.id)).toEqual(["ais:1"]);
    expect(items[0].distanceKm).toBeLessThan(250);
  });
});
