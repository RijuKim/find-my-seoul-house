import { describe, expect, it } from "vitest";
import { fetchMolitAptTrades, GYEONGGI_DISTRICTS, isLikelyNonApartmentName, MOLIT_VILLA_TRADE_ENDPOINT } from "./realEstate";

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
