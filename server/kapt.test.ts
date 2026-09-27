import { describe, expect, it } from "vitest";
import { fetchKaptComplexInfo } from "./kapt";

describe("K-apt complex info", () => {
  it("matches a Seoul apartment and returns official household and parking fields", async () => {
    const [info] = await fetchKaptComplexInfo([{
      id: "kapt-test",
      apartmentName: "경희궁의아침4단지",
      lawdCd: "11110",
      neighborhood: "내수동",
      propertyType: "apartment",
    }]);
    expect(info?.status).toBe("matched");
    expect(info?.kaptCode).toBeTruthy();
    expect(info?.households).toBeGreaterThan(0);
    expect(info?.parkingTotal).toBeGreaterThan(0);
    expect(info?.source).toBe("K-apt");
  }, 45_000);
});
