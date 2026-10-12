import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchMolitAptTrades,
  fetchRecentAptTrades,
  GYEONGGI_DISTRICTS,
  isLikelyNonApartmentName,
  MOLIT_APT_TRADE_ENDPOINT,
  MOLIT_VILLA_TRADE_ENDPOINT,
} from "./realEstate";
import { ENV } from "./_core/env";
import { fetchMolitRentTrades, MOLIT_APT_RENT_ENDPOINT } from "./jeonse";
import { appRouter } from "./routers";

const hasMolitKey = Boolean(process.env.MOLIT_SERVICE_KEY);

describe("MOLIT apartment trade API", () => {
  it("flags villa-like names that can be mixed into the apartment feed", () => {
    expect(isLikelyNonApartmentName("용산큐브" )).toBe(true);
    expect(isLikelyNonApartmentName("아스하임" )).toBe(true);
    expect(isLikelyNonApartmentName("서초대우아이빌" )).toBe(true);
    expect(isLikelyNonApartmentName("래미안 원베일리" )).toBe(false);
  });

  it.skipIf(!hasMolitKey)("accepts the configured service key and returns a normalized list", async () => {
    const trades = await fetchMolitAptTrades({
      lawdCd: "11110",
      dealYmd: "202501",
      numOfRows: 1,
    });

    expect(Array.isArray(trades)).toBe(true);
    if (trades.length > 0) {
      expect(trades[0]).toMatchObject({ lawdCd: "11110" });
      expect(typeof trades[0]?.priceMan).toBe("number");
    }
  }, 20_000);

  it.skipIf(!hasMolitKey)("supports Gyeonggi district codes through the same endpoint", async () => {
    const trades = await fetchMolitAptTrades({
      lawdCd: "41135",
      dealYmd: "202501",
      numOfRows: 1,
      districts: GYEONGGI_DISTRICTS,
    });

    expect(Array.isArray(trades)).toBe(true);
    if (trades.length > 0) {
      expect(trades[0]).toMatchObject({ lawdCd: "41135", district: "성남시 분당구" });
    }
  }, 20_000);

  it("uses the official villa endpoint separately from the apartment endpoint", () => {
    expect(MOLIT_VILLA_TRADE_ENDPOINT).toContain("RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade");
  });
});

const rentPayload = (item: Array<Record<string, string | number>>) => ({
  response: { header: { resultCode: "00" }, body: { items: { item } } },
});

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

describe("MOLIT apartment rent API (jeonse fetch)", () => {
  let originalKey: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalKey = ENV.molitServiceKey;
    ENV.molitServiceKey = "test-key";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    ENV.molitServiceKey = originalKey;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("includes only jeonse rows and maps deposit to priceMan", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        rentPayload([
          { aptNm: "래미안", umdNm: "삼성동", jibun: "1", dealYear: "2026", dealMonth: "9", dealDay: "30", excluUseAr: "84.9", deposit: "50,000", monthlyRent: "0" },
          { aptNm: "월세집", umdNm: "삼성동", jibun: "2", deposit: "1000", monthlyRent: "50" },
          { aptNm: "보증금없음", umdNm: "삼성동", jibun: "3", deposit: "0", monthlyRent: "0" },
          { aptNm: "갱신집", umdNm: "삼성동", jibun: "4", deposit: "40000", monthlyRent: "0", useRRRight: "Y" },
        ]),
      ),
    );

    const trades = await fetchMolitRentTrades({ lawdCd: "11680", dealYmd: "202609", numOfRows: 10 });

    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({
      apartmentName: "래미안",
      neighborhood: "삼성동",
      priceMan: 50000,
      area: 84.9,
      dealDate: "2026-09-30",
      lawdCd: "11680",
      district: "강남구",
      propertyType: "apartment",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(MOLIT_APT_RENT_ENDPOINT);
  });

  it("retries a 429 once via the shared backoff before succeeding", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => "rate limited" })
      .mockResolvedValueOnce(jsonResponse(rentPayload([{ aptNm: "래미안", deposit: "30000", monthlyRent: "0" }])));

    const trades = await fetchMolitRentTrades({ lawdCd: "11680", dealYmd: "202609", numOfRows: 5 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(trades).toHaveLength(1);
    expect(trades[0]?.priceMan).toBe(30000);
  }, 10_000);

  it("rejects without a service key", async () => {
    ENV.molitServiceKey = "";
    await expect(fetchMolitRentTrades({ lawdCd: "11680", dealYmd: "202609" })).rejects.toThrow(
      "MOLIT_SERVICE_KEY is not configured",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

const salePayload = (item: Array<Record<string, string | number>>) => ({
  response: { header: { resultCode: "00" }, body: { items: { item } } },
});

describe("fetchRecentAptTrades tradeType wiring", () => {
  let originalKey: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalKey = ENV.molitServiceKey;
    ENV.molitServiceKey = "test-key";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    ENV.molitServiceKey = originalKey;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sale(기본)은 매매 엔드포인트만 호출하고 전월세 API를 호출하지 않는다 (회귀 없음)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        salePayload([
          { aptNm: "매매아파트", umdNm: "삼성동", jibun: "1", dealYear: "2026", dealMonth: "9", dealDay: "30", excluUseAr: "84.9", dealAmount: "150,000" },
        ]),
      ),
    );

    const result = await fetchRecentAptTrades({
      region: "seoul",
      months: 1,
      propertyType: "apartment",
      perDistrict: 3,
      limit: 3,
    });

    expect(result.tradeType).toBe("sale");
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.includes("getRTMSDataSvcAptTrade"))).toBe(true);
    expect(urls.some((url) => /Rent/i.test(url))).toBe(false);
    expect(MOLIT_APT_TRADE_ENDPOINT).toContain("getRTMSDataSvcAptTrade");
    expect(result.data[0]).toMatchObject({ apartmentName: "매매아파트", priceMan: 150000, area: 84.9, lawdCd: "11110" });
  });

  it("jeonse는 전월세 엔드포인트만 호출하고 보증금을 priceMan으로 반환한다", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        rentPayload([
          { aptNm: "전세아파트", umdNm: "삼성동", jibun: "5", dealYear: "2026", dealMonth: "9", dealDay: "15", excluUseAr: "59.9", deposit: "42,000", monthlyRent: "0" },
          { aptNm: "월세아파트", umdNm: "삼성동", jibun: "6", dealYear: "2026", dealMonth: "9", dealDay: "16", excluUseAr: "59.9", deposit: "1,000", monthlyRent: "60" },
        ]),
      ),
    );

    const result = await fetchRecentAptTrades({
      region: "seoul",
      months: 1,
      propertyType: "apartment",
      perDistrict: 3,
      limit: 3,
      tradeType: "jeonse",
    });

    expect(result.tradeType).toBe("jeonse");
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.includes(MOLIT_APT_RENT_ENDPOINT))).toBe(true);
    expect(urls.some((url) => url.includes("getRTMSDataSvcAptTrade"))).toBe(false);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.every((trade) => trade.apartmentName === "전세아파트" && trade.priceMan === 42000)).toBe(true);
    expect(result.data.some((trade) => trade.apartmentName === "월세아파트")).toBe(false);
    expect(result.data[0]).toMatchObject({ apartmentName: "전세아파트", priceMan: 42000, area: 59.9, lawdCd: "11110" });
  });

  it("캐시 키에 tradeType이 포함되어 sale/jeonse가 서로의 캐시를 재사용하지 않는다", async () => {
    fetchMock.mockResolvedValue(jsonResponse(salePayload([{ aptNm: "매매아파트", dealYear: "2026", dealMonth: "9", dealDay: "1", excluUseAr: "60", dealAmount: "100000" }])));
    const sale = await fetchRecentAptTrades({ region: "gyeonggi", months: 1, propertyType: "apartment", perDistrict: 3, limit: 3, tradeType: "sale" });
    const callsAfterSale = fetchMock.mock.calls.length;
    expect(sale.tradeType).toBe("sale");

    fetchMock.mockClear();
    fetchMock.mockResolvedValue(jsonResponse(rentPayload([{ aptNm: "전세아파트", dealYear: "2026", dealMonth: "9", dealDay: "1", excluUseAr: "60", deposit: "30000", monthlyRent: "0" }])));
    const jeonse = await fetchRecentAptTrades({ region: "gyeonggi", months: 1, propertyType: "apartment", perDistrict: 3, limit: 3, tradeType: "jeonse" });
    expect(jeonse.tradeType).toBe("jeonse");
    expect(jeonse.data[0]?.priceMan).toBe(30000);
    expect(callsAfterSale).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
  });
});

describe("realEstate.recentTrades router tradeType validation", () => {
  let originalKey: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalKey = ENV.molitServiceKey;
    ENV.molitServiceKey = "test-key";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    ENV.molitServiceKey = originalKey;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects an invalid tradeType at the router schema before any upstream call", async () => {
    const caller = appRouter.createCaller({});
    await expect(
      caller.realEstate.recentTrades({ tradeType: "monthly" as "sale" }),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("omitting tradeType defaults to sale and calls only the sale endpoint", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        salePayload([
          { aptNm: "매매아파트", umdNm: "삼성동", jibun: "1", dealYear: "2026", dealMonth: "9", dealDay: "30", excluUseAr: "84.9", dealAmount: "150,000" },
        ]),
      ),
    );

    const caller = appRouter.createCaller({});
    const result = await caller.realEstate.recentTrades({ region: "seoul", months: 1, propertyType: "apartment" });

    expect(result.tradeType).toBe("sale");
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.includes("getRTMSDataSvcAptTrade"))).toBe(true);
    expect(urls.some((url) => /Rent/i.test(url))).toBe(false);
    expect(result.data[0]).toMatchObject({ apartmentName: "매매아파트", priceMan: 150000 });
  });

  it("passes tradeType:'jeonse' through to the rent path and maps deposit to priceMan", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        rentPayload([
          { aptNm: "전세아파트", umdNm: "삼성동", jibun: "5", dealYear: "2026", dealMonth: "9", dealDay: "15", excluUseAr: "59.9", deposit: "42,000", monthlyRent: "0" },
          { aptNm: "월세아파트", umdNm: "삼성동", jibun: "6", dealYear: "2026", dealMonth: "9", dealDay: "16", excluUseAr: "59.9", deposit: "1,000", monthlyRent: "60" },
        ]),
      ),
    );

    const caller = appRouter.createCaller({});
    const result = await caller.realEstate.recentTrades({ region: "seoul", months: 1, propertyType: "apartment", tradeType: "jeonse" });

    expect(result.tradeType).toBe("jeonse");
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.includes(MOLIT_APT_RENT_ENDPOINT))).toBe(true);
    expect(urls.some((url) => url.includes("getRTMSDataSvcAptTrade"))).toBe(false);
    expect(result.data.some((trade) => trade.apartmentName === "전세아파트" && trade.priceMan === 42000)).toBe(true);
    expect(result.data.some((trade) => trade.apartmentName === "월세아파트")).toBe(false);
  });
});
