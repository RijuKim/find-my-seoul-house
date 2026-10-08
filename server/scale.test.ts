import { describe, expect, it, vi } from "vitest";
import {
  addressConfirmsIdentity,
  createScaleService,
  exactNameMatches,
  normalizeScaleName,
  parcelBun,
  positiveInteger,
  type ScaleCandidate,
  type ScaleServiceDeps,
} from "./scale";
import { appRouter } from "./routers";

type Item = Record<string, string | number>;
const listPayload = (items: Item[]) => ({ response: { header: { resultCode: "00" }, body: { items: { item: items } } } });
const basisPayload = (item: Item) => ({ response: { header: { resultCode: "00" }, body: { items: { item: item } } } });

function makeDeps(overrides: Partial<ScaleServiceDeps> = {}) {
  const calls: string[] = [];
  let active = 0;
  let maxActive = 0;
  const fetchImpl = vi.fn(async (input: string) => {
    calls.push(input);
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 1));
    active -= 1;
    const url = new URL(input);
    if (url.pathname.includes("AptListService4")) {
      const sigungu = url.searchParams.get("sigunguCode");
      const name = url.searchParams.get("__name") ?? "";
      const items = name ? [{ kaptCode: "A1001", kaptName: name, as3: "삼성동", as4: "" }] : fixtures.list[sigungu ?? ""] ?? [];
      return { ok: true, status: 200, text: async () => JSON.stringify(listPayload(items)) };
    }
    return { ok: true, status: 200, text: async () => JSON.stringify(basisPayload(fixtures.basis)) };
  });
  const deps: ScaleServiceDeps = {
    fetchImpl: fetchImpl as unknown as ScaleServiceDeps["fetchImpl"],
    listServiceKey: "list-key",
    basisServiceKey: "basis-key",
    fetchTimeoutMs: 5_000,
    batchDeadlineMs: 25_000,
    now: () => Date.now(),
    ...overrides,
  };
  return { deps, calls, stats: () => ({ maxActive }) };
}

const fixtures = {
  basis: { kaptdaCnt: "85", kaptDongCnt: "2", kaptName: "테스트아파트", kaptAddr: "서울특별시 강남구 삼성동 123" },
  list: {
    "11680": [
      { kaptCode: "A1", kaptName: "테스트아파트", as3: "삼성동", as4: "" },
      { kaptCode: "A2", kaptName: "다른아파트", as3: "삼성동", as4: "" },
    ],
  } as Record<string, Item[]>,
};

const candidate: ScaleCandidate = {
  id: "row-1",
  apartmentName: "테스트아파트",
  lawdCd: "11680",
  neighborhood: "삼성동",
  jibun: "123",
  propertyType: "apartment",
};

describe("scale pure helpers", () => {
  it("normalizes case, spaces and punctuation", () => {
    expect(normalizeScaleName("래미안 원베일리")).toBe(normalizeScaleName("래미안원베일리"));
    expect(normalizeScaleName("신설동역 자이르네")).toBe(normalizeScaleName("신설동역자이르네"));
  });

  it("accepts only positive integers and rejects 0/negative/NaN/fractions", () => {
    expect(positiveInteger("85")).toBe(85);
    expect(positiveInteger(85)).toBe(85);
    expect(positiveInteger("1,080")).toBe(1080);
    expect(positiveInteger("0")).toBeUndefined();
    expect(positiveInteger("-3")).toBeUndefined();
    expect(positiveInteger("1.5")).toBeUndefined();
    expect(positiveInteger(Number.NaN)).toBeUndefined();
    expect(positiveInteger(undefined)).toBeUndefined();
  });

  it("matches names exactly without substring fallback", () => {
    const items = [{ kaptName: "래미안원베일리" }, { kaptName: "래미안" }];
    expect(exactNameMatches(items, { ...candidate, apartmentName: "래미안" })).toHaveLength(1);
    expect(exactNameMatches(items, { ...candidate, apartmentName: "래미" })).toHaveLength(0);
  });

  it("confirms identity only when neighborhood and parcel agree", () => {
    expect(addressConfirmsIdentity("서울특별시 강남구 삼성동 123", candidate)).toBe(true);
    expect(addressConfirmsIdentity("서울특별시 강남구 역삼동 123", candidate)).toBe(false);
    expect(addressConfirmsIdentity("서울특별시 강남구 삼성동 456", candidate)).toBe(false);
    expect(addressConfirmsIdentity("", candidate)).toBe(false);
  });

  it("extracts parcel bun for comparison", () => {
    expect(parcelBun("123-4")).toBe("123");
    expect(parcelBun("0123")).toBe("123");
    expect(parcelBun(undefined)).toBeUndefined();
  });
});

describe("createScaleService conservative matching", () => {
  it("publishes official counts for a unique exact geographic identity", async () => {
    const { deps } = makeDeps();
    const service = createScaleService(deps);
    const [result] = await service.fetchScales([candidate]);
    expect(result).toMatchObject({ id: "row-1", status: "matched", households: 85, buildingCount: 2, source: "K-apt" });
    expect(result.checkedAt).toMatch(/T/);
  });

  it("returns ambiguous (no counts) when the same name exists twice in the same neighborhood", async () => {
    const { deps } = makeDeps();
    const service = createScaleService({
      ...deps,
      fetchImpl: vi.fn(async (input: string) => {
        const url = new URL(input as string);
        if (url.pathname.includes("AptListService4")) {
          return { ok: true, status: 200, text: async () => JSON.stringify(listPayload([
            { kaptCode: "A1", kaptName: "테스트아파트", as3: "삼성동" },
            { kaptCode: "A2", kaptName: "테스트아파트", as3: "삼성동" },
          ])) };
        }
        return { ok: true, status: 200, text: async () => JSON.stringify(basisPayload(fixtures.basis)) };
      }) as unknown as ScaleServiceDeps["fetchImpl"],
    });
    const [result] = await service.fetchScales([candidate]);
    expect(result.status).toBe("ambiguous");
    expect(result.households).toBeUndefined();
  });

  it("returns ambiguous, not a guess, when only a substring name matches", async () => {
    const { deps } = makeDeps();
    const service = createScaleService({
      ...deps,
      fetchImpl: vi.fn(async (input: string) => {
        const url = new URL(input as string);
        if (url.pathname.includes("AptListService4")) {
          return { ok: true, status: 200, text: async () => JSON.stringify(listPayload([
            { kaptCode: "A1", kaptName: "테스트아파트1단지", as3: "삼성동" },
          ])) };
        }
        return { ok: true, status: 200, text: async () => JSON.stringify(basisPayload(fixtures.basis)) };
      }) as unknown as ScaleServiceDeps["fetchImpl"],
    });
    const [result] = await service.fetchScales([candidate]);
    expect(result.status).toBe("not_found");
    expect(result.households).toBeUndefined();
  });

  it("rejects a neighborhood mismatch and a parcel mismatch without counts", async () => {
    const { deps } = makeDeps();
    const neighborhoodMismatch = createScaleService({
      ...deps,
      fetchImpl: vi.fn(async (input: string) => {
        const url = new URL(input as string);
        if (url.pathname.includes("AptListService4")) {
          return { ok: true, status: 200, text: async () => JSON.stringify(listPayload([
            { kaptCode: "A1", kaptName: "테스트아파트", as3: "역삼동" },
          ])) };
        }
        return { ok: true, status: 200, text: async () => JSON.stringify(basisPayload(fixtures.basis)) };
      }) as unknown as ScaleServiceDeps["fetchImpl"],
    });
    const [noNeighborhood] = await neighborhoodMismatch.fetchScales([candidate]);
    expect(noNeighborhood.status).toBe("ambiguous");
    expect(noNeighborhood.households).toBeUndefined();

    const parcelMismatch = createScaleService({
      ...deps,
      fetchImpl: vi.fn(async (input: string) => {
        const url = new URL(input as string);
        if (url.pathname.includes("AptListService4")) {
          return { ok: true, status: 200, text: async () => JSON.stringify(listPayload([
            { kaptCode: "A1", kaptName: "테스트아파트", as3: "삼성동" },
          ])) };
        }
        return { ok: true, status: 200, text: async () => JSON.stringify(basisPayload({ ...fixtures.basis, kaptAddr: "서울특별시 강남구 삼성동 999" })) };
      }) as unknown as ScaleServiceDeps["fetchImpl"],
    });
    const [noParcel] = await parcelMismatch.fetchScales([candidate]);
    expect(noParcel.status).toBe("ambiguous");
    expect(noParcel.households).toBeUndefined();
  });

  it("marks villas unsupported without publishing counts", async () => {
    const { deps } = makeDeps();
    const service = createScaleService(deps);
    const [result] = await service.fetchScales([{ ...candidate, propertyType: "villa" }]);
    expect(result.status).toBe("unsupported");
    expect(result.households).toBeUndefined();
  });

  it("sanitizes upstream failures to unavailable without leaking bodies", async () => {
    const service = createScaleService({
      ...makeDeps().deps,
      fetchImpl: vi.fn(async () => ({ ok: false, status: 500, text: async () => "SECRET serviceKey=abc internal error" })) as unknown as ScaleServiceDeps["fetchImpl"],
    });
    const [result] = await service.fetchScales([candidate]);
    expect(result.status).toBe("unavailable");
    expect(result.statusMessage).not.toContain("SECRET");
    expect(result.statusMessage).not.toContain("serviceKey");
  });

  it("enforces the batch deadline deterministically", async () => {
    const service = createScaleService({ ...makeDeps().deps, batchDeadlineMs: 0 });
    const [result] = await service.fetchScales([candidate]);
    expect(result.status).toBe("unavailable");
    expect(result.households).toBeUndefined();
  });

  it("deduplicates the same identity and remaps to distinct caller ids", async () => {
    const { deps, calls } = makeDeps();
    const service = createScaleService(deps);
    const [first] = await service.fetchScales([{ ...candidate, id: "caller-a" }]);
    const [second] = await service.fetchScales([{ ...candidate, id: "caller-b" }]);
    expect(first).toMatchObject({ id: "caller-a", status: "matched" });
    expect(second).toMatchObject({ id: "caller-b", status: "matched" });
    expect(calls.filter((url) => url.includes("AptListService4"))).toHaveLength(1);
  });

  it("bounds external concurrency to three across a full batch", async () => {
    let active = 0;
    let maxActive = 0;
    const fetchImpl = vi.fn(async (input: string) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      const url = new URL(input as string);
      if (url.pathname.includes("AptListService4")) {
        const items = Array.from({ length: 12 }, (_, index) => ({ kaptCode: `A${index}`, kaptName: `단지${index}`, as3: "삼성동" }));
        return { ok: true, status: 200, text: async () => JSON.stringify(listPayload(items)) };
      }
      return { ok: true, status: 200, text: async () => JSON.stringify(basisPayload(fixtures.basis)) };
    });
    const service = createScaleService({ ...makeDeps().deps, fetchImpl: fetchImpl as unknown as ScaleServiceDeps["fetchImpl"] });
    const batch = Array.from({ length: 12 }, (_, index) => ({ ...candidate, id: `row-${index}`, apartmentName: `단지${index}` }));
    const results = await service.fetchScales(batch);
    expect(results).toHaveLength(12);
    expect(results.every((result) => result.status === "matched")).toBe(true);
    expect(maxActive).toBeLessThanOrEqual(3);
  });
});

describe("realEstate.complexScales router validation", () => {
  it("rejects malformed and oversize candidate batches", async () => {
    const caller = appRouter.createCaller({});
    await expect(caller.realEstate.complexScales({ candidates: [] })).rejects.toThrow();
    await expect(
      caller.realEstate.complexScales({
        candidates: Array.from({ length: 13 }, (_, index) => ({ ...candidate, id: `row-${index}` })),
      }),
    ).rejects.toThrow();
    await expect(
      caller.realEstate.complexScales({ candidates: [{ ...candidate, lawdCd: "123" }] }),
    ).rejects.toThrow();
    await expect(
      caller.realEstate.complexScales({ candidates: [{ ...candidate, apartmentName: "x".repeat(121) }] }),
    ).rejects.toThrow();
  });

  it("accepts a valid candidate list through the public router", async () => {
    const caller = appRouter.createCaller({});
    const results = await caller.realEstate.complexScales({ candidates: [candidate] });
    expect(Array.isArray(results)).toBe(true);
    expect(results[0]?.id).toBe("row-1");
    expect(["matched", "not_found", "ambiguous", "unavailable", "error", "unsupported"]).toContain(results[0]?.status);
  }, 30_000);
});
