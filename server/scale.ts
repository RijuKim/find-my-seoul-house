import { ENV } from "./_core/env";

// K-apt 목록 + 기본정보만 사용하는 "단지 규모" 전용 조회.
// 상세정보/건축HUB/장소/추세 호출은 하지 않는다.
export const KAPT_LIST_ENDPOINT = "https://apis.data.go.kr/1613000/AptListService4";
export const KAPT_BASIS_ENDPOINT = "https://apis.data.go.kr/1613000/AptBasisInfoServiceV5";

export const SCALE_MAX_CANDIDATES = 12;
export const SCALE_CONCURRENCY = 3;
export const SCALE_FETCH_TIMEOUT_MS = 5_000;
export const SCALE_BATCH_DEADLINE_MS = 25_000;
export const SCALE_CACHE_MAX_ENTRIES = 1_000;
export const SCALE_CACHE_TTL_MS = 60 * 60 * 1000;
export const SCALE_TRANSIENT_TTL_MS = 60 * 1000;

export type ScaleStatus = "matched" | "not_found" | "ambiguous" | "unavailable" | "error" | "unsupported";

export type ScaleCandidate = {
  id: string;
  apartmentName: string;
  lawdCd: string;
  neighborhood?: string;
  jibun?: string;
  propertyType?: "apartment" | "villa";
};

export type ScaleResult = {
  id: string;
  status: ScaleStatus;
  households?: number;
  buildingCount?: number;
  source: "K-apt" | "none";
  checkedAt: string;
  statusMessage: string;
};

type Outcome = Pick<ScaleResult, "status" | "households" | "buildingCount" | "source" | "statusMessage">;
type CacheEntry = { expiresAt: number; outcome: Outcome };

export class ScaleUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScaleUpstreamError";
  }
}

export class ScaleUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScaleUnavailableError";
  }
}

export const normalizeScaleName = (value: unknown) =>
  String(value ?? "").toLowerCase().replace(/[\s()·.,\-_'"/[\]{}:;+]/g, "");

type KaptItem = Record<string, string | number | null | undefined>;
type KaptResponse = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: KaptItem | KaptItem[] | { item?: KaptItem | KaptItem[] }; item?: KaptItem | KaptItem[] };
  };
};

const asArray = (value: unknown): KaptItem[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value as KaptItem[];
  if (typeof value === "object" && "item" in (value as Record<string, unknown>)) {
    const item = (value as { item?: unknown }).item;
    if (!item) return [];
    return Array.isArray(item) ? (item as KaptItem[]) : [item as KaptItem];
  }
  return [value as KaptItem];
};

const text = (value: unknown) => String(value ?? "").trim();

// 규모 값은 양의 유한 정수만 인정한다. 0/음수/NaN/소수/누락은 정보 없음.
export const positiveInteger = (value: unknown): number | undefined => {
  const parsed = Number(text(value).replace(/,/g, "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const stripLeadingZeros = (value: string) => value.replace(/^0+/, "") || "0";

// 지번/번지 문자열에서 지번 본번 후보를 뽑는다. (예: "12-2" -> "12")
export const parcelBun = (jibun: string | undefined): string | undefined => {
  const first = text(jibun).split(/[-–—]/)[0]?.replace(/[^0-9]/g, "") ?? "";
  return first ? stripLeadingZeros(first) : undefined;
};

// 주소에서 지번 후보 숫자 토큰들을 추출한다. (예: "123-4", "123번지", "123")
export const addressParcelTokens = (address: string): string[] => {
  const tokens: string[] = [];
  let remainder = address;
  const dash = address.match(/(\d{1,5})\s*-\s*(\d{1,5})/g) ?? [];
  for (const match of dash) {
    const [bun] = match.split("-");
    if (bun) tokens.push(stripLeadingZeros(bun.replace(/[^0-9]/g, "")));
    remainder = remainder.replace(match, " ");
  }
  const bunji = remainder.match(/(\d{1,5})\s*번지/g) ?? [];
  for (const match of bunji) {
    tokens.push(stripLeadingZeros(match.replace(/[^0-9]/g, "")));
    remainder = remainder.replace(match, " ");
  }
  const standalone = remainder.match(/\d{1,5}/g) ?? [];
  for (const match of standalone) tokens.push(stripLeadingZeros(match));
  return tokens;
};

// 목록 응답에서 정규화 이름이 정확히 같은 후보만 고른다(부분일치 금지).
export const exactNameMatches = (items: KaptItem[], candidate: ScaleCandidate): KaptItem[] => {
  const target = normalizeScaleName(candidate.apartmentName);
  if (!target) return [];
  return items.filter((item) => normalizeScaleName(item.kaptName) === target);
};

// 같은 lawdCd 안에서 읍/면/동(as3) 또는 리(as4)가 후보 동과 정확히 같은 항목만 통과시킨다.
export const neighborhoodMatched = (items: KaptItem[], candidate: ScaleCandidate): KaptItem[] => {
  const target = normalizeScaleName(candidate.neighborhood);
  if (!target) return [];
  return items.filter((item) => {
    const as3 = normalizeScaleName(item.as3);
    const as4 = normalizeScaleName(item.as4);
    return as3 === target || as4 === target;
  });
};

// 기본정보 주소가 후보 동/지번을 확인해 주는지 검사한다.
// 동 이름은 반드시 포함되어야 하고, 주소에 지번 토큰이 있으면 후보 본번과 일치해야 한다.
export const addressConfirmsIdentity = (address: string, candidate: ScaleCandidate): boolean => {
  const normalizedAddress = normalizeScaleName(address);
  if (!normalizedAddress) return false;
  const neighborhood = normalizeScaleName(candidate.neighborhood);
  if (!neighborhood || !normalizedAddress.includes(neighborhood)) return false;
  const bun = parcelBun(candidate.jibun);
  if (bun) {
    const tokens = addressParcelTokens(address);
    if (!tokens.includes(bun)) return false;
  }
  return true;
};

type FetchLike = (input: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

export type ScaleServiceDeps = {
  fetchImpl?: FetchLike;
  now?: () => number;
  fetchTimeoutMs?: number;
  batchDeadlineMs?: number;
  listServiceKey?: string;
  basisServiceKey?: string;
};

function createSemaphore(limit: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) await new Promise<void>((resolve) => queue.push(resolve));
    active += 1;
    try {
      return await task();
    } finally {
      active -= 1;
      const next = queue.shift();
      if (next) next();
    }
  };
}

// 외부 호출 동시성은 프로세스 전역에서 3으로 제한한다.
const globalSemaphore = createSemaphore(SCALE_CONCURRENCY);

async function requestJson(
  base: string,
  path: string,
  serviceKey: string,
  params: Record<string, string>,
  deps: Required<Pick<ScaleServiceDeps, "now" | "fetchTimeoutMs" | "batchDeadlineMs" | "fetchImpl">>,
  deadline: number,
): Promise<KaptResponse> {
  const now = deps.now();
  if (now >= deadline) throw new ScaleUnavailableError("조회 시간이 초과되었습니다.");
  const remaining = deadline - now;
  const timeoutMs = Math.min(deps.fetchTimeoutMs, remaining);
  const url = new URL(`${base}/${path}`);
  url.searchParams.set("serviceKey", decodeURIComponent(serviceKey));
  url.searchParams.set("_type", "json");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return globalSemaphore(async () => {
    if (deps.now() >= deadline) throw new ScaleUnavailableError("조회 시간이 초과되었습니다.");
    let response;
    try {
      response = await deps.fetchImpl(url.toString(), { signal: AbortSignal.timeout(timeoutMs) });
    } catch {
      // 네트워크/타임아웃/중단은 안전하게 unavailable로 처리하고 원문을 노출하지 않는다.
      throw new ScaleUnavailableError("K-apt 응답 시간이 초과되었거나 연결하지 못했습니다.");
    }
    let raw = "";
    try {
      raw = await response.text();
    } catch {
      throw new ScaleUnavailableError("K-apt 응답을 읽지 못했습니다.");
    }
    if (!response.ok) throw new ScaleUpstreamError("K-apt 요청이 실패했습니다.");
    let payload: KaptResponse;
    try {
      payload = JSON.parse(raw) as KaptResponse;
    } catch {
      throw new ScaleUpstreamError("K-apt 응답 형식이 올바르지 않습니다.");
    }
    const header = payload.response?.header;
    if (header?.resultCode && !["00", "000"].includes(header.resultCode)) {
      throw new ScaleUpstreamError("K-apt API가 오류를 반환했습니다.");
    }
    return payload;
  });
}

export type ScaleService = {
  lookup: (candidate: ScaleCandidate, deadline: number) => Promise<Outcome>;
  fetchScales: (candidates: ScaleCandidate[]) => Promise<ScaleResult[]>;
};

export function createScaleService(deps: ScaleServiceDeps = {}): ScaleService {
  const fetchImpl = deps.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  const now = deps.now ?? (() => Date.now());
  const fetchTimeoutMs = deps.fetchTimeoutMs ?? SCALE_FETCH_TIMEOUT_MS;
  const batchDeadlineMs = deps.batchDeadlineMs ?? SCALE_BATCH_DEADLINE_MS;
  const cache = new Map<string, CacheEntry>();
  const inflight = new Map<string, Promise<Outcome>>();

  const lookupIdentity = (candidate: ScaleCandidate) => [
    candidate.lawdCd,
    normalizeScaleName(candidate.apartmentName),
    normalizeScaleName(candidate.neighborhood),
    parcelBun(candidate.jibun) ?? "",
  ].join("\u0001");

  const evictExpired = () => {
    const current = now();
    for (const [key, entry] of Array.from(cache.entries())) if (entry.expiresAt <= current) cache.delete(key);
  };

  const readCache = (identity: string): Outcome | undefined => {
    const entry = cache.get(identity);
    if (!entry) return undefined;
    if (entry.expiresAt <= now()) {
      cache.delete(identity);
      return undefined;
    }
    return entry.outcome;
  };

  const writeCache = (identity: string, outcome: Outcome) => {
    const transient = outcome.status === "unavailable" || outcome.status === "error";
    const ttl = transient ? SCALE_TRANSIENT_TTL_MS : SCALE_CACHE_TTL_MS;
    cache.set(identity, { expiresAt: now() + ttl, outcome });
    if (cache.size > SCALE_CACHE_MAX_ENTRIES) {
      evictExpired();
      while (cache.size > SCALE_CACHE_MAX_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest === undefined) break;
        cache.delete(oldest);
      }
    }
  };

  const listServiceKey = () => deps.listServiceKey ?? ENV.kaptListServiceKey;
  const basisServiceKey = () => deps.basisServiceKey ?? ENV.kaptBasisServiceKey;

  const unsupported = (message: string): Outcome => ({ status: "unsupported", source: "none", statusMessage: message });
  const unavailable = (message: string): Outcome => ({ status: "unavailable", source: "none", statusMessage: message });
  const ambiguous = (message: string): Outcome => ({ status: "ambiguous", source: "none", statusMessage: message });
  const notFound = (message: string): Outcome => ({ status: "not_found", source: "none", statusMessage: message });

  const resolve = async (candidate: ScaleCandidate, deadline: number): Promise<Outcome> => {
    if (candidate.propertyType === "villa") {
      return unsupported("K-apt 등록 단지 데이터는 아파트 유형에만 적용됩니다.");
    }
    const listKey = listServiceKey();
    const basisKey = basisServiceKey();
    if (!listKey || !basisKey) {
      return unavailable("K-apt 인증키가 설정되지 않았습니다.");
    }
    const requestDeps = { now, fetchTimeoutMs, batchDeadlineMs, fetchImpl };
    let listResponse: KaptResponse;
    try {
      listResponse = await requestJson(KAPT_LIST_ENDPOINT, "getSigunguAptList4", listKey, {
        sigunguCode: candidate.lawdCd,
        pageNo: "1",
        numOfRows: "1000",
      }, requestDeps, deadline);
    } catch {
      // 목록 조회 실패(타임아웃/네트워크/업스트림 오류)는 모두 안전한 unavailable로 처리한다.
      return unavailable("K-apt 단지 목록을 조회하지 못했습니다.");
    }

    const items = asArray(
      listResponse.response?.body?.items ?? listResponse.response?.body?.item,
    );
    const byName = exactNameMatches(items, candidate);
    if (byName.length === 0) {
      return notFound("실거래 단지명과 정확히 일치하는 K-apt 단지를 찾지 못했습니다.");
    }
    const inNeighborhood = neighborhoodMatched(byName, candidate);
    if (inNeighborhood.length === 0) {
      return ambiguous("같은 이름의 단지가 다른 동·지번에 있어 동일 단지로 확정하지 못했습니다.");
    }
    if (inNeighborhood.length > 1) {
      return ambiguous("같은 이름의 단지가 같은 동에 여러 개 있어 하나로 확정하지 못했습니다.");
    }

    const matched = inNeighborhood[0];
    const kaptCode = text(matched.kaptCode);
    if (!kaptCode) {
      return ambiguous("K-apt 단지코드를 확인하지 못했습니다.");
    }

    let basisResponse: KaptResponse;
    try {
      basisResponse = await requestJson(KAPT_BASIS_ENDPOINT, "getAphusBassInfoV5", basisKey, {
        kaptCode,
      }, requestDeps, deadline);
    } catch (error) {
      if (error instanceof ScaleUnavailableError) return unavailable("K-apt 기본정보를 조회하지 못했습니다.");
      return { status: "error", source: "none", statusMessage: "K-apt 기본정보를 확인하지 못했습니다." };
    }

    const basic = (asArray(basisResponse.response?.body?.item ?? basisResponse.response?.body?.items)[0] ?? {}) as KaptItem;
    const address = text(basic.kaptAddr ?? basic.doroJuso);
    if (!addressConfirmsIdentity(address, candidate)) {
      return ambiguous("단지 주소가 실거래 동·지번과 일치하는지 확인하지 못했습니다.");
    }

    return {
      status: "matched",
      households: positiveInteger(basic.kaptdaCnt),
      buildingCount: positiveInteger(basic.kaptDongCnt),
      source: "K-apt",
      statusMessage: "K-apt 등록 단지의 공식 세대·동수 정보입니다.",
    };
  };

  const lookup = async (candidate: ScaleCandidate, deadline: number): Promise<Outcome> => {
    const identity = lookupIdentity(candidate);
    const cached = readCache(identity);
    if (cached) return cached;
    let pending = inflight.get(identity);
    if (!pending) {
      pending = resolve(candidate, deadline);
      inflight.set(identity, pending);
      pending.finally(() => inflight.delete(identity)).catch(() => undefined);
    }
    const outcome = await pending;
    // 성공/확정 결과와 일시적 실패만 캐시한다. 호출자 id는 캐시하지 않는다.
    writeCache(identity, outcome);
    return outcome;
  };

  const fetchScales = async (candidates: ScaleCandidate[]): Promise<ScaleResult[]> => {
    const checkedAt = new Date(now()).toISOString();
    const deadline = now() + batchDeadlineMs;
    const results = await Promise.all(
      candidates.map(async (candidate): Promise<ScaleResult> => {
        try {
          const outcome = await lookup(candidate, deadline);
          return { id: candidate.id, checkedAt, ...outcome };
        } catch {
          return { id: candidate.id, checkedAt, status: "unavailable", source: "none", statusMessage: "K-apt 조회 중 오류가 발생했습니다." };
        }
      }),
    );
    return results;
  };

  return { lookup, fetchScales };
}

const defaultService = createScaleService();

export const fetchComplexScales = (candidates: ScaleCandidate[]): Promise<ScaleResult[]> =>
  defaultService.fetchScales(candidates);
