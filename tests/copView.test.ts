import { describe, expect, it } from "vitest";
import { parseCopView, serializeCopView } from "@/lib/copView";

describe("copView", () => {
  it("round-trips theater + overlay keys", () => {
    const q = serializeCopView({
      ao: "aoi-gulf",
      layers: ["ais", "quakes", "firms"],
    });
    expect(q).toContain("ao=aoi-gulf");
    const parsed = parseCopView(`?${q}`);
    expect(parsed.ao).toBe("aoi-gulf");
    expect(parsed.layers).toEqual(["ais", "quakes", "firms"]);
  });

  it("drops unknown layer keys", () => {
    const parsed = parseCopView("l=ais,nope,quakes");
    expect(parsed.layers).toEqual(["ais", "quakes"]);
  });
});
