import { ENV } from "./_core/env";
import { fetchBuildingHubRecap } from "./buildingHub";

export const KAPT_LIST_ENDPOINT = "https://apis.data.go.kr/1613000/AptListService4";
export const KAPT_BASIS_ENDPOINT = "https://apis.data.go.kr/1613000/AptBasisInfoServiceV5";

type KaptItem = Record<string, string | number | null | undefined>;
type KaptResponse = { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: KaptItem | KaptItem[] | { item?: KaptItem | KaptItem[] }; item?: KaptItem | KaptItem[] } } };

type KaptCandidate = {
  id: string;
  apartmentName: string;
  lawdCd: string;
  neighborhood?: string;
  jibun?: string;
  propertyType?: "apartment" | "villa";
};

export type KaptComplexInfo = {
  id: string;
  kaptCode?: string;
  kaptName?: string;
  bjdCode?: string;
  status: "matched" | "not_found" | "unsupported" | "unavailable" | "error";
  statusMessage: string;
  households?: number;
  buildingCount?: number;
  parkingGround?: number;
  parkingUnderground?: number;
  parkingTotal?: number;
  parkingPerHousehold?: number;
  approvalDate?: string;
  address?: string;
  roadAddress?: string;
  subwayStation?: string;
  subwayLine?: string;
  subwayDistance?: string;
  busDistance?: string;
  convenienceFacilities?: string;
  educationFacilities?: string;
  floorAreaRatio?: number;
  landArea?: number;
  grossArea?: number;
  buildingDataStatusMessage?: string;
  source: "K-apt" | "none";
};

const asArray = (value: KaptItem | KaptItem[] | { item?: KaptItem | KaptItem[] } | undefined) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if ("item" in value) {
    const item = value.item;
    return !item ? [] : Array.isArray(item) ? item : [item];
  }
  return [value];
};

const text = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => {
  const parsed = Number(text(value).replace(/,/g, "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};
const normalize = (value: string) => value.toLowerCase().replace(/[\s()·.,\-_'"/]/g, "");

async function requestKapt<T extends KaptResponse>(base: string, path: string, serviceKey: string, params: Record<string, string>) {
  const url = new URL(`${base}/${path}`);
  url.searchParams.set("serviceKey", decodeURIComponent(serviceKey));
  url.searchParams.set("_type", "json");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url);
  const raw = await response.text();
  if (!response.ok) throw new Error(`K-apt request failed: ${response.status}`);
  let payload: T;
  try { payload = JSON.parse(raw) as T; } catch { throw new Error("K-apt returned a non-JSON response"); }
  const header = payload.response?.header;
  if (header?.resultCode && !["00", "000"].includes(header.resultCode)) throw new Error(`K-apt API ${header.resultCode}: ${header.resultMsg ?? "unknown"}`);
  return payload;
}

async function findComplex(candidate: KaptCandidate) {
  if (!ENV.kaptListServiceKey) throw new Error("KAPT_LIST_SERVICE_KEY is not configured");
  const response = await requestKapt<KaptResponse>(KAPT_LIST_ENDPOINT, "getSigunguAptList4", ENV.kaptListServiceKey, {
    sigunguCode: candidate.lawdCd,
    pageNo: "1",
    numOfRows: "1000",
  });
  const body = response.response?.body;
  const rawItems = body?.items ?? body?.item;
  const items = asArray(rawItems) as KaptItem[];
  const target = normalize(candidate.apartmentName);
  const exact = items.filter((item) => normalize(text(item.kaptName)) === target);
  const candidates = exact.length ? exact : items.filter((item) => {
    const name = normalize(text(item.kaptName));
    return name.includes(target) || target.includes(name);
  });
  return candidates[0];
}

export async function fetchKaptComplexInfo(candidates: KaptCandidate[]): Promise<KaptComplexInfo[]> {
  return Promise.all(candidates.map(async (candidate): Promise<KaptComplexInfo> => {
    if (candidate.propertyType === "villa") return { id: candidate.id, status: "unsupported", statusMessage: "K-apt 공동주택 단지 데이터는 아파트 유형만 지원합니다.", source: "none" };
    if (!ENV.kaptListServiceKey || !ENV.kaptBasisServiceKey) return { id: candidate.id, status: "unavailable", statusMessage: "K-apt 인증키가 설정되지 않았습니다.", source: "none" };
    try {
      const matched = await findComplex(candidate);
      const kaptCode = text(matched?.kaptCode);
      if (!kaptCode) return { id: candidate.id, status: "not_found", statusMessage: "실거래 단지명과 일치하는 K-apt 단지를 찾지 못했습니다.", source: "none" };
      const [basicResponse, detailResponse] = await Promise.all([
        requestKapt<KaptResponse>(KAPT_BASIS_ENDPOINT, "getAphusBassInfoV5", ENV.kaptBasisServiceKey, { kaptCode }),
        requestKapt<KaptResponse>(KAPT_BASIS_ENDPOINT, "getAphusDtlInfoV5", ENV.kaptBasisServiceKey, { kaptCode }),
      ]);
      const basic = (asArray(basicResponse.response?.body?.item ?? basicResponse.response?.body?.items)[0] ?? {}) as KaptItem;
      const detail = (asArray(detailResponse.response?.body?.item ?? detailResponse.response?.body?.items)[0] ?? {}) as KaptItem;
      const bjdCode = text(matched.bjdCode);
      const [candidateBun, candidateJi = "0000"] = text(candidate.jibun).split(/[-–—]/).map((part) => part.trim());
      const buildingRecap = await fetchBuildingHubRecap({
        sigunguCd: candidate.lawdCd,
        bjdongCd: bjdCode.length >= 10 ? bjdCode.slice(5) : "",
        bun: candidateBun ?? "",
        ji: candidateJi || "0000",
      });
      const households = number(basic.kaptdaCnt);
      const parkingGround = number(detail.kaptdPcnt);
      const parkingUnderground = number(detail.kaptdPcntu);
      const parkingTotal = parkingGround !== undefined || parkingUnderground !== undefined ? (parkingGround ?? 0) + (parkingUnderground ?? 0) : undefined;
      return {
        id: candidate.id,
        kaptCode,
        kaptName: text(basic.kaptName ?? matched.kaptName),
        bjdCode: bjdCode || undefined,
        status: "matched",
        statusMessage: "K-apt 단지코드와 매칭된 공식 정보입니다.",
        households,
        buildingCount: number(basic.kaptDongCnt),
        parkingGround,
        parkingUnderground,
        parkingTotal,
        parkingPerHousehold: households && parkingTotal ? Math.round((parkingTotal / households) * 100) / 100 : undefined,
        approvalDate: text(basic.kaptUsedate) || undefined,
        address: text(basic.kaptAddr) || undefined,
        roadAddress: text(basic.doroJuso) || undefined,
        subwayStation: text(detail.subwayStation) || undefined,
        subwayLine: text(detail.subwayLine) || undefined,
        subwayDistance: text(detail.kaptdWtimesub) || undefined,
        busDistance: text(detail.kaptdWtimebus) || undefined,
        convenienceFacilities: text(detail.convenientFacility) || undefined,
        educationFacilities: text(detail.educationFacility) || undefined,
        floorAreaRatio: buildingRecap.floorAreaRatio,
        landArea: buildingRecap.landArea,
        grossArea: buildingRecap.grossArea,
        buildingDataStatusMessage: buildingRecap.statusMessage,
        source: "K-apt",
      };
    } catch (error) {
      return { id: candidate.id, status: "error", statusMessage: error instanceof Error ? error.message : "K-apt 조회 중 오류가 발생했습니다.", source: "none" };
    }
  }));
}
