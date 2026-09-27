import { ENV } from "./_core/env";

export const MOLIT_APT_TRADE_ENDPOINT =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";

export type MolitAptTrade = {
  id: string;
  apartmentName: string;
  district: string;
  neighborhood: string;
  priceMan: number;
  area: number;
  floor: string;
  year: number;
  dealDate: string;
  jibun: string;
  roadName: string;
  lawdCd: string;
};

type MolitItem = Record<string, string | number | undefined>;

type MolitPayload = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: { item?: MolitItem | MolitItem[] }; totalCount?: number };
  };
};

const asArray = (item: MolitItem | MolitItem[] | undefined) => {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
};

const text = (value: string | number | undefined) => String(value ?? "").trim();

const number = (value: string | number | undefined) => {
  const normalized = text(value).replace(/,/g, "");
  return Number(normalized) || 0;
};

export function getSeoulTradeMonth(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}${month}`;
}

export async function fetchMolitAptTrades({
  lawdCd,
  dealYmd,
  numOfRows = 100,
}: {
  lawdCd: string;
  dealYmd: string;
  numOfRows?: number;
}): Promise<MolitAptTrade[]> {
  if (!ENV.molitServiceKey) {
    throw new Error("MOLIT_SERVICE_KEY is not configured");
  }

  const url = new URL(MOLIT_APT_TRADE_ENDPOINT);
  url.searchParams.set("serviceKey", ENV.molitServiceKey);
  url.searchParams.set("LAWD_CD", lawdCd);
  url.searchParams.set("DEAL_YMD", dealYmd);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", String(numOfRows));
  url.searchParams.set("_type", "json");

  const response = await fetch(url);
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`MOLIT API request failed: ${response.status}`);
  }

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

  return asArray(payload.response?.body?.items?.item).map((item, index) => {
    const apartmentName = text(item.aptNm);
    const neighborhood = text(item.umdNm);
    const dealYear = text(item.dealYear);
    const dealMonth = text(item.dealMonth).padStart(2, "0");
    const dealDay = text(item.dealDay).padStart(2, "0");
    return {
      id: `${lawdCd}-${dealYear}${dealMonth}${dealDay}-${index}-${apartmentName}`,
      apartmentName,
      district: neighborhood,
      neighborhood,
      priceMan: number(item.dealAmount),
      area: number(item.excluUseAr),
      floor: text(item.floor),
      year: number(item.buildYear),
      dealDate: `${dealYear}-${dealMonth}-${dealDay}`,
      jibun: text(item.jibun),
      roadName: text(item.roadNm),
      lawdCd,
    };
  });
}
