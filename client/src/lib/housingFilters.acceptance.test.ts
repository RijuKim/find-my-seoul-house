import { describe, expect, it } from "vitest";
import { getScaleMatch, matchesScaleFilter } from "./housingFilters";

describe("apartment scale filtering acceptance", () => {
  it.each([
    [99, 2, true], [100, 2, false], [250, 1, true],
    [undefined, 1, true], [150, undefined, null],
    [undefined, undefined, null], [0, 2, null], [-1, 2, null],
    [Number.NaN, 2, null], [1.5, 2, null], [150, 0, null],
  ])("OR predicate for %s households and %s buildings is %s", (households, buildingCount, expected) => {
    expect(getScaleMatch({ households, buildingCount }, "either")).toBe(expected);
  });

  it("each fact is independently selectable", () => {
    const counts = { households: 250, buildingCount: 1 };
    expect(getScaleMatch(counts, "households")).toBe(false);
    expect(getScaleMatch(counts, "buildings")).toBe(true);
    expect(getScaleMatch({ households: 99 }, "households")).toBe(true);
    expect(getScaleMatch({ households: 100 }, "households")).toBe(false);
  });

  it("only confirmed negatives pass exclude; missing never means large", () => {
    expect(matchesScaleFilter("apartment", null, "exclude")).toBe(false);
    expect(matchesScaleFilter("apartment", false, "exclude")).toBe(true);
    expect(matchesScaleFilter("apartment", true, "exclude")).toBe(false);
    expect(matchesScaleFilter("apartment", null, "unknown")).toBe(true);
    expect(matchesScaleFilter("apartment", false, "unknown")).toBe(false);
    expect(matchesScaleFilter("apartment", true, "only")).toBe(true);
    expect(matchesScaleFilter("apartment", null, "only")).toBe(false);
  });

  it("villas bypass apartment scale and all restores every record", () => {
    for (const mode of ["all", "only", "exclude", "unknown"] as const) {
      expect(matchesScaleFilter("villa", null, mode)).toBe(true);
    }
    for (const value of [true, false, null]) {
      expect(matchesScaleFilter("apartment", value, "all")).toBe(true);
    }
  });
});
