import { describe, expect, it } from "vitest";
import {
  LOADED_DATA_COVERAGE_NOTE,
  createAnalystEngine,
  runAnalystQuery,
  type AnalystRecord,
} from "@/lib/analystQuery";

const records: AnalystRecord[] = [
  {
    layerKey: "events",
    id: "e1",
    latitude: 34.05,
    longitude: -118.24,
    headline: "Quake",
  },
  {
    layerKey: "firms",
    id: "f-hot",
    latitude: 34.06,
    longitude: -118.25,
    frp: 48.6,
  },
  {
    layerKey: "firms",
    id: "f-cool",
    latitude: 34.07,
    longitude: -118.26,
    frp: 5.1,
  },
  {
    layerKey: "satellites",
    id: "sat:25544",
    latitude: 10,
    longitude: 20,
    name: "ISS (ZARYA)",
    norad: "25544",
  },
  {
    layerKey: "adsb",
    id: "adsb:ae54c2",
    latitude: 33.43,
    longitude: 44.4,
    name: "RCH123",
    callsign: "RCH123",
    military: true,
    altitudeFt: 24000,
  },
];

describe("runAnalystQuery", () => {
  it("filters FIRMS by FRP threshold and includes loaded-data-only coverage", () => {
    const result = runAnalystQuery(records, {
      layers: ["firms"],
      filters: [{ field: "frp", op: "gt", value: 20 }],
    });
    expect(result.ok).toBe(true);
    expect(result.count).toBe(1);
    expect(result.items[0].id).toBe("f-hot");
    expect(result.coverageNote).toBe(LOADED_DATA_COVERAGE_NOTE);
    expect(result.coverage.note).toMatch(/loaded-data-only/i);
  });

  it("answers a satellites-layer count over loaded records only", () => {
    const result = runAnalystQuery(records, { layers: ["satellites"] });
    expect(result.ok).toBe(true);
    expect(result.count).toBe(1);
    expect(result.items[0].id).toBe("sat:25544");
    expect(result.coverageNote).toContain("loaded-data-only");
  });

  it("filters military ADS-B from loaded tracks", () => {
    const result = runAnalystQuery(records, {
      layers: ["adsb"],
      filters: [{ field: "military", op: "eq", value: true }],
    });
    expect(result.ok).toBe(true);
    expect(result.count).toBe(1);
    expect(result.items[0].id).toBe("adsb:ae54c2");
  });
});

describe("createAnalystEngine follow-up", () => {
  it("re-filters the prior result set", () => {
    const engine = createAnalystEngine(() => records);
    const first = engine.query({ layers: ["firms"] });
    expect(first.count).toBe(2);
    expect(engine.hasMemory()).toBe(true);

    const follow = engine.query({
      followUp: true,
      layers: ["firms"],
      filters: [{ field: "frp", op: "gt", value: 20 }],
    });
    expect(follow.coverage.followUp).toBe(true);
    expect(follow.count).toBe(1);
    expect(follow.items[0].id).toBe("f-hot");
    expect(follow.coverageNote).toMatch(/loaded-data-only/i);
  });
});
