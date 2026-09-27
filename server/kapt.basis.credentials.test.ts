import { describe, expect, it } from "vitest";

const LIST_ENDPOINT = "https://apis.data.go.kr/1613000/AptListService4/getSidoAptList4";
const BASIS_ENDPOINT = "https://apis.data.go.kr/1613000/AptBasisInfoServiceV5/getAphusBassInfoV5";

type ListResponse = { response?: { body?: { items?: { item?: { kaptCode?: string } | Array<{ kaptCode?: string }> } | Array<{ kaptCode?: string }> } } };

describe("K-apt AptBasisInfoServiceV5 credentials", () => {
  it("can read basic information for one official Seoul complex", async () => {
    const listKey = process.env.KAPT_LIST_SERVICE_KEY;
    const basisKey = process.env.KAPT_BASIS_SERVICE_KEY;
    expect(listKey, "KAPT_LIST_SERVICE_KEY must be registered").toBeTruthy();
    expect(basisKey, "KAPT_BASIS_SERVICE_KEY must be registered").toBeTruthy();

    const listUrl = new URL(LIST_ENDPOINT);
    listUrl.searchParams.set("serviceKey", decodeURIComponent(listKey!));
    listUrl.searchParams.set("sidoCode", "11");
    listUrl.searchParams.set("pageNo", "1");
    listUrl.searchParams.set("numOfRows", "1");
    listUrl.searchParams.set("_type", "json");
    const listResponse = await fetch(listUrl);
    const listBody = await listResponse.json() as ListResponse;
    const items = listBody.response?.body?.items;
    const item = Array.isArray(items) ? items : items?.item;
    const kaptCode = Array.isArray(item) ? item[0]?.kaptCode : item?.kaptCode;
    expect(kaptCode, "AptListService4 did not return a kaptCode").toBeTruthy();

    const basisUrl = new URL(BASIS_ENDPOINT);
    basisUrl.searchParams.set("serviceKey", decodeURIComponent(basisKey!));
    basisUrl.searchParams.set("kaptCode", kaptCode!);
    basisUrl.searchParams.set("_type", "json");
    const response = await fetch(basisUrl);
    const body = await response.text();
    expect(response.ok, `K-apt basic info request failed: ${response.status} ${body.slice(0, 300)}`).toBe(true);
    const parsed = JSON.parse(body) as { response?: { header?: { resultCode?: string }; body?: { item?: { kaptCode?: string } } } };
    expect(parsed.response?.header?.resultCode).toBe("00");
    expect(parsed.response?.body?.item?.kaptCode).toBe(kaptCode);
  }, 30_000);
});
