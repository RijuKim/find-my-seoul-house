import { ENV } from "./_core/env";

export const BUILDING_HUB_RECAP_ENDPOINT = "https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo";

type BuildingItem = Record<string, string | number | null | undefined>;
type BuildingResponse = { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: BuildingItem | BuildingItem[] | { item?: BuildingItem | BuildingItem[] }; item?: BuildingItem | BuildingItem[] } } };

export type BuildingHubRecap = {
  floorAreaRatio?: number;
  landArea?: number;
  grossArea?: number;
  estimatedFloorArea?: number;
  mainPurpose?: string;
  registerPk?: string;
  address?: string;
  status: "matched" | "not_found" | "unavailable" | "error";
  statusMessage: string;
};

const asArray = (value: BuildingItem | BuildingItem[] | { item?: BuildingItem | BuildingItem[] } | undefined) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if ("item" in value) {
    const item = value.item;
    return !item ? [] : Array.isArray(item) ? item : [item];
  }
  return [value];
};
const text = (value: unknown) => String(value ?? "").trim();
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const number = (value: unknown) => {
  const parsed = Number(text(value).replace(/,/g, "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

export async function fetchBuildingHubRecap({ sigunguCd, bjdongCd, bun, ji = "0000" }: { sigunguCd: string; bjdongCd: string; bun: string; ji?: string }): Promise<BuildingHubRecap> {
  if (!ENV.buildingHubServiceKey) return { status: "unavailable", statusMessage: "건축HUB 인증키가 설정되지 않았습니다." };
  if (!sigunguCd || !bjdongCd || !bun) return { status: "not_found", statusMessage: "건축물대장 조회에 필요한 법정동·지번 정보가 없습니다." };
  try {
    const url = new URL(BUILDING_HUB_RECAP_ENDPOINT);
    url.searchParams.set("serviceKey", decodeURIComponent(ENV.buildingHubServiceKey));
    url.searchParams.set("sigunguCd", sigunguCd);
    url.searchParams.set("bjdongCd", bjdongCd);
    url.searchParams.set("platGbCd", "0");
    url.searchParams.set("bun", bun.replace(/[^0-9]/g, "").padStart(4, "0"));
    url.searchParams.set("ji", ji.replace(/[^0-9]/g, "").padStart(4, "0"));
    url.searchParams.set("numOfRows", "100");
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("_type", "json");
    let response: Response | undefined;
    let raw = "";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      raw = await response.text();
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) break;
      await pause(700 * (attempt + 1));
    }
    if (!response) throw new Error("건축HUB 응답이 없습니다.");
    if (!response.ok) throw new Error(`건축HUB request failed: ${response.status}`);
    const payload = JSON.parse(raw) as BuildingResponse;
    const header = payload.response?.header;
    if (header?.resultCode && !["00", "000"].includes(header.resultCode)) throw new Error(`건축HUB API ${header.resultCode}: ${header.resultMsg ?? "unknown"}`);
    const body = payload.response?.body;
    const items = asArray(body?.items ?? body?.item) as BuildingItem[];
    if (!items.length) return { status: "not_found", statusMessage: "해당 지번의 총괄표제부를 찾지 못했습니다." };
    const item = items.find((row) => number(row.vlRat) !== undefined) ?? items[0];
    return {
      floorAreaRatio: number(item.vlRat),
      landArea: number(item.platArea),
      grossArea: number(item.totArea),
      estimatedFloorArea: number(item.vlRatEstmTotArea),
      mainPurpose: text(item.mainPurpsCd) || undefined,
      registerPk: text(item.mgmBldrgstPk) || undefined,
      address: text(item.newPlatPlc || item.platPlc) || undefined,
      status: number(item.vlRat) !== undefined ? "matched" : "not_found",
      statusMessage: number(item.vlRat) !== undefined ? "건축HUB 총괄표제부의 공식 용적률입니다." : "총괄표제부는 찾았지만 용적률 값이 없습니다.",
    };
  } catch (error) {
    return { status: "error", statusMessage: error instanceof Error ? error.message : "건축HUB 조회 중 오류가 발생했습니다." };
  }
}
