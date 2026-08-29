import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  geodeticFromOmm,
  geodeticFromSatRecord,
  geodeticFromTle,
  type OmmRecord,
} from "@/lib/sgp4";

const omm = JSON.parse(
  readFileSync(path.join(__dirname, "fixtures/iss-omm.json"), "utf8"),
) as OmmRecord;

const T0 = Date.parse("2024-03-01T12:00:00Z");
const T1 = Date.parse("2024-03-01T12:20:00Z");

describe("geodeticFromOmm (SGP4)", () => {
  it("propagates ISS OMM to in-range geodetic coords", () => {
    const pos = geodeticFromOmm(omm, T0);
    expect(pos).not.toBeNull();
    expect(pos!.latitude).toBeGreaterThanOrEqual(-90);
    expect(pos!.latitude).toBeLessThanOrEqual(90);
    expect(pos!.longitude).toBeGreaterThanOrEqual(-180);
    expect(pos!.longitude).toBeLessThanOrEqual(180);
  });

  it("produces different positions at two epochs (time-propagated, not decorative)", () => {
    const a = geodeticFromOmm(omm, T0);
    const b = geodeticFromOmm(omm, T1);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    const moved =
      Math.abs(a!.latitude - b!.latitude) > 0.5 ||
      Math.abs(a!.longitude - b!.longitude) > 0.5;
    expect(moved).toBe(true);
  });
});

describe("geodeticFromTle (SGP4)", () => {
  const line1 =
    "1 25544U 98067A   24061.50000000  .00016717  00000-0  10270-3 0  9991";
  const line2 =
    "2 25544  51.6416  21.7867 0005853  85.1234 274.8766 15.49800000400000";

  it("propagates a classic TLE to in-range coords that move with time", () => {
    const a = geodeticFromTle(line1, line2, T0);
    const b = geodeticFromTle(line1, line2, T1);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.latitude).toBeGreaterThanOrEqual(-90);
    expect(a!.latitude).toBeLessThanOrEqual(90);
    expect(a!.longitude).toBeGreaterThanOrEqual(-180);
    expect(a!.longitude).toBeLessThanOrEqual(180);
    expect(
      Math.abs(a!.latitude - b!.latitude) + Math.abs(a!.longitude - b!.longitude),
    ).toBeGreaterThan(0.5);
  });

  it("propagates a TLE-bearing sat record (live TLE path)", () => {
    const rec: OmmRecord = {
      OBJECT_NAME: "ISS (ZARYA)",
      NORAD_CAT_ID: 25544,
      TLE_LINE1: line1,
      TLE_LINE2: line2,
    };
    const a = geodeticFromSatRecord(rec, T0);
    const b = geodeticFromSatRecord(rec, T1);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.latitude).toBeGreaterThanOrEqual(-90);
    expect(a!.latitude).toBeLessThanOrEqual(90);
    expect(
      Math.abs(a!.latitude - b!.latitude) + Math.abs(a!.longitude - b!.longitude),
    ).toBeGreaterThan(0.5);
  });
});
