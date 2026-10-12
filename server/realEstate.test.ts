import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchMolitAptTrades,
  GYEONGGI_DISTRICTS,
  isLikelyNonApartmentName,
  MOLIT_VILLA_TRADE_ENDPOINT,
} from "./realEstate";
import { ENV } from "./_core/env";
import { fetchMolitRentTrades, MOLIT_APT_RENT_ENDPOINT } from "./jeonse";

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
