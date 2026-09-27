import { describe, expect, it } from "vitest";
import { fetchMolitAptTrades } from "./realEstate";

describe("MOLIT apartment trade API", () => {
  it("accepts the configured service key and returns a normalized list", async () => {
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
});
