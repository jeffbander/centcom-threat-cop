import { describe, expect, it } from "vitest";
import { CLEARANCE_ATTESTATION } from "../lib/clearanceNotice";

describe("CLEARANCE_ATTESTATION", () => {
  it("requires a background check, GS-8, and prior DoD/NSA forms", () => {
    const blob = [
      CLEARANCE_ATTESTATION.lead,
      ...CLEARANCE_ATTESTATION.items,
      CLEARANCE_ATTESTATION.checkbox,
    ].join(" ");
    expect(blob).toMatch(/background check/i);
    expect(blob).toMatch(/GS-8/);
    expect(blob).toMatch(/Department of Defense/);
    expect(blob).toMatch(/Signals Division of the National Security Agency/);
    expect(blob).toMatch(/approves/i);
  });
});
