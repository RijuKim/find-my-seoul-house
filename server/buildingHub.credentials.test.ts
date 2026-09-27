import { describe, expect, it } from "vitest";

const ENDPOINT = "https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo";

describe("BuildingHUB credentials", () => {
  it("can call the official recap title API for one Seoul legal-dong", async () => {
    const serviceKey = process.env.BUILDING_HUB_SERVICE_KEY;
    expect(serviceKey, "BUILDING_HUB_SERVICE_KEY must be registered").toBeTruthy();

    const url = new URL(ENDPOINT);
    url.searchParams.set("serviceKey", decodeURIComponent(serviceKey!));
    url.searchParams.set("sigunguCd", "11110");
    url.searchParams.set("bjdongCd", "1111011800");
    url.searchParams.set("platGbCd", "0");
    url.searchParams.set("numOfRows", "1");
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("_type", "json");

    const response = await fetch(url);
    const body = await response.text();
    if ([429, 500, 502, 503, 504].includes(response.status)) return;
    expect(response.ok, `BuildingHUB request failed: ${response.status} ${body.slice(0, 300)}`).toBe(true);
    const parsed = JSON.parse(body) as { response?: { header?: { resultCode?: string; resultMsg?: string } } };
    expect(parsed.response?.header?.resultCode, parsed.response?.header?.resultMsg).toBe("00");
  }, 30_000);
});
