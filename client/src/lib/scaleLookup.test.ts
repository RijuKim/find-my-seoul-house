import { describe, expect, it, vi } from "vitest";
import {
  buildScaleTargets,
  classifyListingScale,
  fetchScaleTargets,
  includeByScale,
  isScaleFilterActive,
  type ScaleResult,
} from "./scaleLookup";

const apartment = (overrides: Partial<Parameters<typeof buildScaleTargets>[0][number]> = {}) => ({
  id: "trade-1",
  name: "테스트아파트",
  lawdCd: "11680",
  neighborhood: "삼성동",
  jibun: "123",
  propertyType: "apartment" as const,
  ...overrides,
});

const matched = (id: string, households?: number, buildingCount?: number): ScaleResult => ({
  id,
  status: "matched",
  households,
  buildingCount,
  source: "K-apt",
  checkedAt: "2026-10-08T00:00:00.000Z",
  statusMessage: "ok",
});

describe("buildScaleTargets", () => {
  it("deduplicates identical complexes across trades and skips villas", () => {
    const targets = buildScaleTargets([
      apartment({ id: "trade-1" }),
      apartment({ id: "trade-2" }),
      apartment({ id: "trade-villa", propertyType: "villa" }),
      apartment({ id: "trade-3", name: "다른아파트" }),
      apartment({ id: "trade-4", lawdCd: undefined }),
    ]);
    expect(targets).toHaveLength(2);
    expect(targets.map((target) => target.candidate.apartmentName).sort()).toEqual(["다른아파트", "테스트아파트"]);
    expect(targets.every((target) => target.candidate.lawdCd)).toBe(true);
  });

  it("shares a lookup for the same complex written with different spacing", () => {
    const targets = buildScaleTargets([
      apartment({ id: "a", name: "래미안 원베일리" }),
      apartment({ id: "b", name: "래미안원베일리" }),
    ]);
    expect(targets).toHaveLength(1);
  });
});

describe("classifyListingScale / includeByScale tri-state behavior", () => {
  it("treats missing counts as unknown, never as large", () => {
    expect(classifyListingScale(apartment(), matched("x"), "either")).toEqual({ state: "matched", match: null });
    expect(includeByScale({ state: "matched", match: null }, "apartment", "exclude")).toBe(false);
    expect(includeByScale({ state: "matched", match: null }, "apartment", "unknown")).toBe(true);
  });

  it("applies the criterion independently for households and buildings", () => {
    const listing = apartment();
    expect(classifyListingScale(listing, matched("x", 250, 1), "households")).toEqual({ state: "matched", match: false });
    expect(classifyListingScale(listing, matched("x", 250, 1), "buildings")).toEqual({ state: "matched", match: true });
    expect(classifyListingScale(listing, matched("x", 250, 1), "either")).toEqual({ state: "matched", match: true });
  });

  it("keeps pending out of final unknown and marks failures distinctly", () => {
    expect(includeByScale({ state: "pending" }, "apartment", "unknown")).toBe(false);
    expect(includeByScale({ state: "failed", status: "unavailable" }, "apartment", "unknown")).toBe(true);
    expect(includeByScale({ state: "failed", status: "not_found" }, "apartment", "unknown")).toBe(true);
    expect(includeByScale({ state: "failed", status: "unavailable" }, "apartment", "exclude")).toBe(false);
    expect(includeByScale({ state: "failed", status: "unavailable" }, "apartment", "only")).toBe(false);
  });

  it("always includes villas regardless of mode", () => {
    for (const mode of ["all", "only", "exclude", "unknown"] as const) {
      expect(includeByScale(null, "villa", mode)).toBe(true);
    }
  });

  it("only activates scale filtering for an active mode on apartment results", () => {
    expect(isScaleFilterActive("all", "apartment")).toBe(false);
    expect(isScaleFilterActive("only", "apartment")).toBe(true);
    expect(isScaleFilterActive("only", "villa")).toBe(false);
    expect(isScaleFilterActive("exclude", "all")).toBe(true);
  });
});

describe("fetchScaleTargets orchestration", () => {
  it("batches sequentially in groups of at most 12 and reports by identity", async () => {
    const targets = buildScaleTargets(Array.from({ length: 30 }, (_, index) => apartment({ id: `t-${index}`, name: `단지${index}` })));
    const batchSizes: number[] = [];
    const seen: string[] = [];
    await fetchScaleTargets({
      targets,
      known: new Map(),
      fetchBatch: async (candidates) => {
        batchSizes.push(candidates.length);
        return candidates.map((candidate) => matched(candidate.id));
      },
      isStale: () => false,
      onResult: (identity) => seen.push(identity),
    });
    expect(batchSizes).toEqual([12, 12, 6]);
    expect(seen).toEqual(targets.map((target) => target.identity));
  });

  it("stops immediately when the generation goes stale", async () => {
    const targets = buildScaleTargets(Array.from({ length: 30 }, (_, index) => apartment({ id: `t-${index}`, name: `단지${index}` })));
    let calls = 0;
    let stale = false;
    const received: string[] = [];
    await fetchScaleTargets({
      targets,
      known: new Map(),
      fetchBatch: async (candidates) => {
        calls += 1;
        stale = true;
        return candidates.map((candidate) => matched(candidate.id));
      },
      isStale: () => stale,
      onResult: (identity) => received.push(identity),
    });
    expect(calls).toBe(1);
    expect(received).toHaveLength(0);
  });

  it("records a safe unavailable result when the batch fetch throws", async () => {
    const targets = buildScaleTargets([apartment()]);
    const received: ScaleResult[] = [];
    await fetchScaleTargets({
      targets,
      known: new Map(),
      fetchBatch: async () => { throw new Error("network down with secret"); },
      isStale: () => false,
      onResult: (_identity, result) => received.push(result),
    });
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ status: "unavailable", source: "none" });
    expect(received[0]?.statusMessage).not.toContain("secret");
  });

  it("skips identities that already have a result", async () => {
    const targets = buildScaleTargets([apartment({ id: "a", name: "A" }), apartment({ id: "b", name: "B" })]);
    const known = new Map([[targets[0]!.identity, matched(targets[0]!.identity)]]);
    const fetchBatch = vi.fn(async (candidates: Array<{ id: string }>) => candidates.map((candidate) => matched(candidate.id)));
    await fetchScaleTargets({ targets, known, fetchBatch, isStale: () => false, onResult: () => undefined });
    expect(fetchBatch).toHaveBeenCalledTimes(1);
    expect(fetchBatch.mock.calls[0]?.[0]).toHaveLength(1);
  });
});
