import { ENV } from "./_core/env";

export const MOLIT_APT_TRADE_ENDPOINT =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";
export const MOLIT_VILLA_TRADE_ENDPOINT =
  "https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade";

type DistrictMeta = { lawdCd: string; district: string; cluster: string; lat: number; lng: number };
type DistrictRow = [string, string, string, number, number];
const toDistricts = (rows: DistrictRow[]): DistrictMeta[] => rows.map(([lawdCd, district, cluster, lat, lng]) => ({ lawdCd, district, cluster, lat, lng }));

const SEOUL_DISTRICT_ROWS: DistrictRow[] = [
  ["11110", "종로구", "도심권", 37.5735, 126.9788], ["11140", "중구", "도심권", 37.5636, 126.9976], ["11170", "용산구", "도심권", 37.5326, 126.9901],
  ["11200", "성동구", "동북권", 37.5633, 127.0367], ["11215", "광진구", "한강권", 37.5385, 127.0823], ["11230", "동대문구", "동북권", 37.5744, 127.0396],
  ["11260", "중랑구", "북부권", 37.6063, 127.0927], ["11290", "성북구", "동북권", 37.5894, 127.0167], ["11305", "강북구", "북부권", 37.6396, 127.0257],
  ["11320", "도봉구", "북부권", 37.6688, 127.0471], ["11350", "노원구", "북부권", 37.6543, 127.0568], ["11380", "은평구", "서북권", 37.6027, 126.9291],
  ["11410", "서대문구", "서북권", 37.5791, 126.9368], ["11440", "마포구", "서북권", 37.5663, 126.9014], ["11470", "양천구", "서남권", 37.5170, 126.8664],
  ["11500", "강서구", "서남권", 37.5510, 126.8495], ["11530", "구로구", "서남권", 37.4954, 126.8874], ["11545", "금천구", "서남권", 37.4569, 126.8955],
  ["11560", "영등포구", "서남권", 37.5264, 126.8963], ["11590", "동작구", "서남권", 37.5124, 126.9393], ["11620", "관악구", "서남권", 37.4784, 126.9516],
  ["11650", "서초구", "강남권", 37.4836, 127.0327], ["11680", "강남구", "강남권", 37.5172, 127.0473], ["11710", "송파구", "동남권", 37.5145, 127.1059], ["11740", "강동구", "동남권", 37.5301, 127.1238],
];
export const SEOUL_DISTRICTS = toDistricts(SEOUL_DISTRICT_ROWS);

const GYEONGGI_DISTRICT_ROWS: DistrictRow[] = [
  ["41111", "수원시 장안구", "경기남부", 37.3038, 127.0106], ["41113", "수원시 권선구", "경기남부", 37.2578, 126.9717], ["41115", "수원시 팔달구", "경기남부", 37.2820, 127.0190], ["41117", "수원시 영통구", "경기남부", 37.2596, 127.0465],
  ["41131", "성남시 수정구", "경기남부", 37.4506, 127.1458], ["41133", "성남시 중원구", "경기남부", 37.4320, 127.1378], ["41135", "성남시 분당구", "경기남부", 37.3826, 127.1189],
  ["41150", "의정부시", "경기북부", 37.7381, 127.0337], ["41170", "안양시 만안구", "경기남부", 37.3867, 126.9320], ["41173", "안양시 동안구", "경기남부", 37.3926, 126.9515],
  ["41190", "부천시 원미구", "경기남부", 37.5034, 126.7660], ["41192", "부천시 소사구", "경기남부", 37.4828, 126.7950], ["41194", "부천시 오정구", "경기남부", 37.5270, 126.7660],
  ["41210", "광명시", "경기남부", 37.4786, 126.8646], ["41220", "평택시", "경기남부", 36.9921, 127.1129], ["41250", "동두천시", "경기북부", 37.9034, 127.0606],
  ["41271", "안산시 상록구", "경기남부", 37.3035, 126.8468], ["41273", "안산시 단원구", "경기남부", 37.3167, 126.8309], ["41281", "고양시 덕양구", "경기북부", 37.6370, 126.8328],
  ["41285", "고양시 일산동구", "경기북부", 37.6585, 126.7755], ["41287", "고양시 일산서구", "경기북부", 37.6840, 126.7500], ["41290", "과천시", "경기남부", 37.4292, 126.9876],
  ["41310", "구리시", "경기북부", 37.5943, 127.1295], ["41360", "남양주시", "경기북부", 37.6360, 127.2165], ["41370", "오산시", "경기남부", 37.1498, 127.0772],
  ["41390", "시흥시", "경기남부", 37.3800, 126.8029], ["41410", "군포시", "경기남부", 37.3616, 126.9352], ["41430", "의왕시", "경기남부", 37.3449, 126.9683],
  ["41450", "하남시", "경기남부", 37.5393, 127.2148], ["41461", "용인시 처인구", "경기남부", 37.2342, 127.2014], ["41463", "용인시 기흥구", "경기남부", 37.2804, 127.1150],
  ["41465", "용인시 수지구", "경기남부", 37.3220, 127.0974], ["41480", "파주시", "경기북부", 37.7602, 126.7798], ["41500", "이천시", "경기남부", 37.2720, 127.4350],
  ["41550", "안성시", "경기남부", 37.0079, 127.2797], ["41570", "김포시", "경기북부", 37.6153, 126.7156], ["41590", "화성시", "경기남부", 37.1995, 126.8312],
  ["41610", "광주시", "경기남부", 37.4294, 127.2551], ["41630", "양주시", "경기북부", 37.7853, 127.0458], ["41650", "포천시", "경기북부", 37.8949, 127.2003],
  ["41670", "여주시", "경기남부", 37.2983, 127.6374], ["41800", "연천군", "경기북부", 38.0964, 127.0748], ["41820", "가평군", "경기북부", 37.8315, 127.5095], ["41830", "양평군", "경기남부", 37.4917, 127.4875],
];
export const GYEONGGI_DISTRICTS = toDistricts(GYEONGGI_DISTRICT_ROWS);

export const REGION_DISTRICTS = { seoul: SEOUL_DISTRICTS, gyeonggi: GYEONGGI_DISTRICTS } as const;
export type RegionKey = keyof typeof REGION_DISTRICTS;

export type MolitAptTrade = {
  id: string; apartmentName: string; district: string; neighborhood: string; priceMan: number; area: number;
  floor: string; year: number; dealDate: string; jibun: string; roadName: string; lawdCd: string;
  lat: number; lng: number; cluster: string; propertyType: "apartment" | "villa"; trendPct?: number; trendPcts?: Partial<Record<1 | 3 | 5 | 10, number>>;
};

type MolitItem = Record<string, string | number | undefined>;
type MolitPayload = { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: { item?: MolitItem | MolitItem[] }; totalCount?: number } } };
const asArray = (item: MolitItem | MolitItem[] | undefined) => !item ? [] : Array.isArray(item) ? item : [item];
const text = (value: string | number | undefined) => String(value ?? "").trim();
const number = (value: string | number | undefined) => Number(text(value).replace(/,/g, "")) || 0;
export const isLikelyNonApartmentName = (name: string) => /(빌라|아이빌|아스하임|큐브|오피스텔|도시형)/i.test(name);
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function settleInBatches<T>(tasks: Array<() => Promise<T>>, batchSize = 12) {
  const settled: PromiseSettledResult<T>[] = [];
  for (let index = 0; index < tasks.length; index += batchSize) {
    const batch = await Promise.allSettled(tasks.slice(index, index + batchSize).map((task) => task()));
    settled.push(...batch);
    if (index + batchSize < tasks.length) await pause(250);
  }
  return settled;
}

async function fetchWithBackoff(url: URL) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (response.status !== 429 || attempt === 3) return response;
    await pause(800 * (attempt + 1));
  }
  return fetch(url);
}

export function getSeoulTradeMonth(date = new Date(), monthsAgo = 0) {
  const target = new Date(date.getFullYear(), date.getMonth() - monthsAgo, 1);
  return `${target.getFullYear()}${String(target.getMonth() + 1).padStart(2, "0")}`;
}

export async function fetchMolitAptTrades({ lawdCd, dealYmd, numOfRows = 100, districts = [...SEOUL_DISTRICTS, ...GYEONGGI_DISTRICTS], propertyType = "apartment" }: { lawdCd: string; dealYmd: string; numOfRows?: number; districts?: DistrictMeta[]; propertyType?: "apartment" | "villa" }): Promise<MolitAptTrade[]> {
  if (!ENV.molitServiceKey) throw new Error("MOLIT_SERVICE_KEY is not configured");
  const districtMeta = districts.find((district) => district.lawdCd === lawdCd) ?? [...SEOUL_DISTRICTS, ...GYEONGGI_DISTRICTS].find((district) => district.lawdCd === lawdCd);
  if (!districtMeta) throw new Error(`Unsupported district code: ${lawdCd}`);
  const url = new URL(propertyType === "villa" ? MOLIT_VILLA_TRADE_ENDPOINT : MOLIT_APT_TRADE_ENDPOINT);
  url.searchParams.set("serviceKey", ENV.molitServiceKey); url.searchParams.set("LAWD_CD", lawdCd); url.searchParams.set("DEAL_YMD", dealYmd);
  url.searchParams.set("pageNo", "1"); url.searchParams.set("numOfRows", String(numOfRows)); url.searchParams.set("_type", "json");
  const response = await fetchWithBackoff(url); const raw = await response.text();
  if (!response.ok) throw new Error(`MOLIT API request failed: ${response.status}`);
  let payload: MolitPayload; try { payload = JSON.parse(raw) as MolitPayload; } catch { throw new Error("MOLIT API returned a non-JSON response"); }
  const header = payload.response?.header;
  if (header?.resultCode && !["00", "000"].includes(header.resultCode)) throw new Error(`MOLIT API error ${header.resultCode}: ${header.resultMsg ?? "unknown"}`);
  return asArray(payload.response?.body?.items?.item).filter((item) => propertyType !== "apartment" || !isLikelyNonApartmentName(text(item.aptNm ?? item.mhouseNm))).map((item, index) => {
    const apartmentName = text(item.aptNm ?? item.mhouseNm ?? item.aptNm); const neighborhood = text(item.umdNm); const dealYear = text(item.dealYear); const dealMonth = text(item.dealMonth).padStart(2, "0"); const dealDay = text(item.dealDay).padStart(2, "0");
    return { id: `${propertyType}-${lawdCd}-${dealYear}${dealMonth}${dealDay}-${index}-${apartmentName}-${text(item.jibun)}`, apartmentName, district: districtMeta.district, neighborhood, priceMan: number(item.dealAmount), area: number(item.excluUseAr), floor: text(item.floor), year: number(item.buildYear), dealDate: `${dealYear}-${dealMonth}-${dealDay}`, jibun: text(item.jibun), roadName: text(item.roadNm), lawdCd, lat: districtMeta.lat, lng: districtMeta.lng, cluster: districtMeta.cluster, propertyType };
  });
}

export type PropertyTypeFilter = "all" | "apartment" | "villa";
const regionCache = new Map<string, { expiresAt: number; data: MolitAptTrade[]; month: string; region: RegionKey; propertyType: PropertyTypeFilter; periodYears: number; sourceWarning?: string }>();
export async function fetchRecentAptTrades({ region = "seoul", months = 1, perDistrict = 20, limit = 240, propertyType = "all", periodYears = 1, includeTrend = false }: { region?: RegionKey; months?: number; perDistrict?: number; limit?: number; propertyType?: PropertyTypeFilter; periodYears?: 1 | 3 | 5 | 10; includeTrend?: boolean } = {}) {
  const cacheKey = `v3:${region}:${propertyType}:${periodYears}:${includeTrend}`; const cached = regionCache.get(cacheKey); if (cached && cached.expiresAt > Date.now()) return cached;
  const districts = REGION_DISTRICTS[region]; const types = propertyType === "all" ? ["apartment", "villa"] as const : [propertyType]; let data: MolitAptTrade[] = []; let latestMonth = getSeoulTradeMonth(new Date(), 1); let requestFailures = 0;
  for (let monthsAgo = 1; monthsAgo <= months && data.length < limit; monthsAgo += 1) {
    const dealYmd = getSeoulTradeMonth(new Date(), monthsAgo);
    const settled = await settleInBatches(districts.flatMap((district) => types.map((type) => () => fetchMolitAptTrades({ lawdCd: district.lawdCd, dealYmd, numOfRows: perDistrict, districts, propertyType: type }))));
    requestFailures += settled.filter((result) => result.status === "rejected").length;
    const monthData = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    if (monthData.length > 0) { latestMonth = dealYmd; data = [...data, ...monthData]; }
  }
  data = data.filter((trade) => trade.apartmentName && trade.priceMan > 0 && trade.area > 0);
  const currentPsm = data.length ? data.reduce((sum, trade) => sum + trade.priceMan / trade.area, 0) / data.length : 0;
  data = data.sort((a, b) => b.dealDate.localeCompare(a.dealDate) || a.priceMan - b.priceMan).slice(0, limit);
  const averagePsm = (rows: MolitAptTrade[]) => rows.length ? rows.reduce((sum, trade) => sum + trade.priceMan / trade.area, 0) / rows.length : 0;
  let trendPct: number | undefined;
  if (includeTrend) {
    const baselineMonth = getSeoulTradeMonth(new Date(), periodYears * 12 + 1);
    const baselineSettled = await settleInBatches(districts.flatMap((district) => types.map((type) => () => fetchMolitAptTrades({ lawdCd: district.lawdCd, dealYmd: baselineMonth, numOfRows: 10, districts, propertyType: type }))));
    requestFailures += baselineSettled.filter((result) => result.status === "rejected").length;
    const baseline = baselineSettled.flatMap((result) => result.status === "fulfilled" ? result.value : []).filter((trade) => trade.priceMan > 0 && trade.area > 0);
    const baselinePsm = averagePsm(baseline); trendPct = baselinePsm > 0 ? Math.round(((currentPsm - baselinePsm) / baselinePsm) * 1000) / 10 : undefined;
  }
  data = data.map((trade) => ({ ...trade, trendPct, trendPcts: { [periodYears]: trendPct } }));
  const sourceWarning = propertyType === "villa" && requestFailures > 0 ? "연립·다세대 API 활용신청 또는 서비스키 권한을 확인해 주세요." : undefined;
  const result = { expiresAt: Date.now() + 10 * 60 * 1000, data, month: latestMonth, region, propertyType, periodYears, sourceWarning }; regionCache.set(cacheKey, result); return result;
}

export async function fetchTrendSeries({ region = "seoul", propertyType = "apartment" }: { region?: RegionKey; propertyType?: Exclude<PropertyTypeFilter, "all"> } = {}) {
  const series: Partial<Record<1 | 3 | 5 | 10, number>> = {};
  for (const years of [1, 3, 5, 10] as const) {
    const result = await fetchRecentAptTrades({ region, propertyType, periodYears: years, months: 1, perDistrict: 8, limit: 80, includeTrend: true });
    const trend = result.data[0]?.trendPct;
    if (trend !== undefined) series[years] = trend;
  }
  return series;
}

export const fetchRecentSeoulAptTrades = (options?: Omit<Parameters<typeof fetchRecentAptTrades>[0], "region">) => fetchRecentAptTrades({ ...options, region: "seoul" });
