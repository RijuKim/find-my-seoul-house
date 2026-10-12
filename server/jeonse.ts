import { ENV } from "./_core/env";
import {
  asArray,
  fetchWithBackoff,
  GYEONGGI_DISTRICTS,
  isLikelyNonApartmentName,
  number,
  SEOUL_DISTRICTS,
  text,
  type DistrictMeta,
  type MolitAptTrade,
  type MolitItem,
  type MolitPayload,
} from "./realEstate";

export const MOLIT_APT_RENT_ENDPOINT =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent";
export const MOLIT_VILLA_RENT_ENDPOINT =
  "https://apis.data.go.kr/1613000/RTMSDataSvcRHRent/getRTMSDataSvcRHRent";

export type JeonseTradeContext = {
  lawdCd: string;
  district: string;
  cluster: string;
  lat: number;
  lng: number;
};

export type JeonsePropertyType = "apartment" | "villa";

const DEPOSIT_KEYS = ["deposit", "보증금액", "보증금"] as const;
const MONTHLY_RENT_KEYS = ["monthlyRent", "월세금액", "월세"] as const;
const RENEWAL_RIGHT_KEYS = ["useRRRight", "갱신요구권사용"] as const;
const PRE_DEPOSIT_KEYS = ["preDeposit", "종전보증금액"] as const;
const PRE_MONTHLY_RENT_KEYS = ["preMonthlyRent", "종전월세금액"] as const;
const CONTRACT_TYPE_KEYS = ["contractType", "계약구분"] as const;

const APARTMENT_NAME_KEYS = ["aptNm", "mhouseNm", "단지명"] as const;
const NEIGHBORHOOD_KEYS = ["umdNm", "법정동", "동"] as const;
const JIBUN_KEYS = ["jibun", "지번"] as const;
const ROAD_NAME_KEYS = ["roadNm", "도로명"] as const;
const AREA_KEYS = ["excluUseAr", "전용면적"] as const;
const YEAR_KEYS = ["buildYear", "건축년도"] as const;

const firstDefined = (item: MolitItem, keys: readonly string[]) => {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

/**
 * 갱신/종전계약 신호 필드가 "설정됨"을 판정한다.
 * 국토부 전월세 응답은 미사용 시 빈 문자열 또는 "0"/"N"으로 오므로 이들을 미설정으로 본다.
 * 필드가 아예 없으면 보수적으로 미적용(false) — 갱신 제외 규칙을 임의 확대하지 않는다.
 */
const isFlagSet = (value: string | number | undefined) => {
  const raw = text(value).toUpperCase();
  return raw !== "" && raw !== "N" && raw !== "0" && raw !== "FALSE";
};

const isRenewalOrPriorContract = (item: MolitItem) => {
  if (isFlagSet(firstDefined(item, RENEWAL_RIGHT_KEYS))) return true;
  if (number(firstDefined(item, PRE_DEPOSIT_KEYS)) > 0) return true;
  if (number(firstDefined(item, PRE_MONTHLY_RENT_KEYS)) > 0) return true;
  return text(firstDefined(item, CONTRACT_TYPE_KEYS)).includes("갱신");
};

/**
 * 전세 판정: 월세 0 AND 보증금 > 0 AND 갱신/종전계약 아님.
 * 월세>0(월세/반전세), 보증금 0/누락, 갱신은 모두 전세가 아니다. 추정/샘플 대체 없음.
 */
export function isJeonseRow(item: Record<string, string | number | undefined>): boolean {
  const deposit = number(firstDefined(item, DEPOSIT_KEYS));
  const monthlyRent = number(firstDefined(item, MONTHLY_RENT_KEYS));
  if (deposit <= 0 || monthlyRent !== 0) return false;
  return !isRenewalOrPriorContract(item);
}

/**
 * 전월세 레코드를 전세 거래로 매핑한다. 전세가 아니면 null.
 * 가격은 보증금(priceMan = deposit). 월세는 가격으로 쓰지 않는다.
 */
export function parseJeonseTrade(
  item: Record<string, string | number | undefined>,
  ctx: JeonseTradeContext,
  index: number,
  propertyType: JeonsePropertyType,
): MolitAptTrade | null {
  if (!isJeonseRow(item)) return null;
  const deposit = number(firstDefined(item, DEPOSIT_KEYS));
  const apartmentName = text(firstDefined(item, APARTMENT_NAME_KEYS));
  const neighborhood = text(firstDefined(item, NEIGHBORHOOD_KEYS));
  const dealYear = text(item.dealYear);
  const dealMonth = text(item.dealMonth).padStart(2, "0");
  const dealDay = text(item.dealDay).padStart(2, "0");
  const jibun = text(firstDefined(item, JIBUN_KEYS));
  const ymd = `${dealYear}${dealMonth}${dealDay}`;
  return {
    id: `jeonse-${ctx.lawdCd}-${ymd}-${index}-${apartmentName}-${jibun}`,
    apartmentName,
    district: ctx.district,
    neighborhood,
    priceMan: deposit,
    area: number(firstDefined(item, AREA_KEYS)),
    floor: text(item.floor),
    year: number(firstDefined(item, YEAR_KEYS)),
    dealDate: `${dealYear}-${dealMonth}-${dealDay}`,
    jibun,
    roadName: text(firstDefined(item, ROAD_NAME_KEYS)),
    lawdCd: ctx.lawdCd,
    lat: ctx.lat,
    lng: ctx.lng,
    cluster: ctx.cluster,
    propertyType,
  };
}

/**
 * 국토부 전월세 실거래 API 호출. 매매 경로(fetchMolitAptTrades)와 동일한 배치/타임아웃/백오프
 * 규약을 재사용한다. 전세(월세 0, 보증금>0, 비갱신) 레코드만 반환한다.
 */
export async function fetchMolitRentTrades({
  lawdCd,
  dealYmd,
  numOfRows = 100,
  districts = [...SEOUL_DISTRICTS, ...GYEONGGI_DISTRICTS],
  propertyType = "apartment",
}: {
  lawdCd: string;
  dealYmd: string;
  numOfRows?: number;
  districts?: DistrictMeta[];
  propertyType?: JeonsePropertyType;
}): Promise<MolitAptTrade[]> {
  if (!ENV.molitServiceKey) throw new Error("MOLIT_SERVICE_KEY is not configured");
  const districtMeta =
    districts.find((district) => district.lawdCd === lawdCd) ??
    [...SEOUL_DISTRICTS, ...GYEONGGI_DISTRICTS].find((district) => district.lawdCd === lawdCd);
  if (!districtMeta) throw new Error(`Unsupported district code: ${lawdCd}`);
  const url = new URL(propertyType === "villa" ? MOLIT_VILLA_RENT_ENDPOINT : MOLIT_APT_RENT_ENDPOINT);
  url.searchParams.set("serviceKey", ENV.molitServiceKey);
  url.searchParams.set("LAWD_CD", lawdCd);
  url.searchParams.set("DEAL_YMD", dealYmd);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", String(numOfRows));
  url.searchParams.set("_type", "json");
  const response = await fetchWithBackoff(url);
  const raw = await response.text();
  if (!response.ok) throw new Error(`MOLIT API request failed: ${response.status}`);
  let payload: MolitPayload;
  try {
    payload = JSON.parse(raw) as MolitPayload;
  } catch {
    throw new Error("MOLIT API returned a non-JSON response");
  }
  const header = payload.response?.header;
  if (header?.resultCode && !["00", "000"].includes(header.resultCode)) {
    throw new Error(`MOLIT API error ${header.resultCode}: ${header.resultMsg ?? "unknown"}`);
  }
  const ctx: JeonseTradeContext = {
    lawdCd,
    district: districtMeta.district,
    cluster: districtMeta.cluster,
    lat: districtMeta.lat,
    lng: districtMeta.lng,
  };
  return asArray(payload.response?.body?.items?.item)
    .filter((item) => propertyType !== "apartment" || !isLikelyNonApartmentName(text(firstDefined(item, APARTMENT_NAME_KEYS))))
    .map((item, index) => parseJeonseTrade(item, ctx, index, propertyType))
    .filter((trade): trade is MolitAptTrade => trade !== null);
}
