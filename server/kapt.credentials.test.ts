import { describe, expect, it } from "vitest";

const LIST_ENDPOINT = "https://apis.data.go.kr/1613000/AptListService4/getSidoAptList4";

describe("K-apt AptListService4 credentials", () => {
  it("can read one Seoul complex from the official list API", async () => {
    const serviceKey = process.env.KAPT_LIST_SERVICE_KEY;
    expect(serviceKey, "KAPT_LIST_SERVICE_KEY must be registered").toBeTruthy();

    const url = new URL(LIST_ENDPOINT);
    url.searchParams.set("serviceKey", decodeURIComponent(serviceKey!));
    url.searchParams.set("sidoCode", "11");
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("numOfRows", "1");
    url.searchParams.set("_type", "json");

    const response = await fetch(url);
    const body = await response.text();
    expect(response.ok, `K-apt list request failed: ${response.status} ${body.slice(0, 300)}`).toBe(true);
    const parsed = JSON.parse(body) as { response?: { header?: { resultCode?: string }; body?: { items?: unknown } } };
    expect(parsed.response?.header?.resultCode).toBe("00");
    expect(parsed.response?.body?.items).toBeDefined();
  }, 30_000);
});
