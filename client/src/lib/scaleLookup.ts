import {
  getScaleMatch,
  normalizeScaleName,
  scaleIdentity,
  type PropertyType,
  type ScaleCriterion,
  type ScaleMode,
} from "./housingFilters";

export type ScaleStatus = "matched" | "not_found" | "ambiguous" | "unavailable" | "error" | "unsupported";

export type ScaleResult = {
  id: string;
  status: ScaleStatus;
  households?: number;
  buildingCount?: number;
  source: "K-apt" | "none";
  checkedAt: string;
  statusMessage: string;
};

export type ScaleSourceListing = {
  id: string;
  name: string;
  lawdCd?: string;
  neighborhood?: string;
  jibun?: string;
  propertyType?: PropertyType;
};

export type ScaleCandidatePayload = {
  id: string;
  apartmentName: string;
  lawdCd: string;
  neighborhood?: string;
  jibun?: string;
  propertyType?: PropertyType;
};

export type ScaleTarget = {
  identity: string;
  candidate: ScaleCandidatePayload;
};

export type ScaleBatchFetcher = (candidates: ScaleCandidatePayload[]) => Promise<ScaleResult[]>;

export const SCALE_BATCH_SIZE = 12;

// 같은 단지를 여러 거래가 공유하도록 지리적 정체성으로 묶는다. 빌라는 대상이 아니다.
// 서버와 동일한 정규화 규칙을 써서 클라이언트/서버 정체성 키가 일치한다.
export function buildScaleTargets(listings: ScaleSourceListing[]): ScaleTarget[] {
  const byIdentity = new Map<string, ScaleTarget>();
  for (const listing of listings) {
    if (listing.propertyType === "villa") continue;
    if (!listing.lawdCd) continue;
    const identity = scaleIdentity({
      apartmentName: listing.name,
      lawdCd: listing.lawdCd,
      neighborhood: listing.neighborhood,
      jibun: listing.jibun,
    });
    if (!identity || byIdentity.has(identity)) continue;
    byIdentity.set(identity, {
      identity,
      candidate: {
        id: identity,
        apartmentName: listing.name,
        lawdCd: listing.lawdCd,
        neighborhood: listing.neighborhood,
        jibun: listing.jibun,
        propertyType: listing.propertyType ?? "apartment",
      },
    });
  }
  return Array.from(byIdentity.values());
}

export function isFailedStatus(status: ScaleStatus | undefined): boolean {
  return status === "unavailable" || status === "error" || status === "unsupported";
}

export function isTerminalStatus(status: ScaleStatus | undefined): status is ScaleStatus {
  return status !== undefined;
}

/**
 * 미확보(missing) 정체성만 12개 이하 배치로 순차 조회한다.
 * - 배치는 항상 순차 실행되어 동시에 나가지 않는다.
 * - isStale()이 true가 되면(지역/유형/언마운트 등 세대 변경) 즉시 중단한다.
 * - 결과는 요청 id(=정체성)로 onResult에 전달돼 stale 응답이 섞이지 않는다.
 */
export async function fetchScaleTargets({
  targets,
  known,
  fetchBatch,
  isStale,
  onResult,
  batchSize = SCALE_BATCH_SIZE,
}: {
  targets: ScaleTarget[];
  known: Map<string, ScaleResult>;
  fetchBatch: ScaleBatchFetcher;
  isStale: () => boolean;
  onResult: (identity: string, result: ScaleResult) => void;
  batchSize?: number;
}): Promise<void> {
  const pending = targets.filter((target) => !known.has(target.identity));
  for (let index = 0; index < pending.length; index += batchSize) {
    if (isStale()) return;
    const batch = pending.slice(index, index + batchSize);
    let results: ScaleResult[];
    try {
      results = await fetchBatch(batch.map((target) => target.candidate));
    } catch {
      // 서버/네트워크 실패는 안전하게 unavailable로 기록한다. 기본 검색은 영향을 받지 않는다.
      results = batch.map((target) => ({
        id: target.identity,
        status: "unavailable",
        source: "none",
        checkedAt: new Date().toISOString(),
        statusMessage: "단지 규모 정보를 불러오지 못했습니다.",
      }));
    }
    if (isStale()) return;
    const byId = new Map(results.map((result) => [result.id, result]));
    for (const target of batch) {
      const result = byId.get(target.candidate.id);
      if (result) onResult(target.identity, result);
    }
  }
}

export type ListingScaleState =
  | { state: "pending" }
  | { state: "matched"; match: boolean | null }
  | { state: "failed"; status: Exclude<ScaleStatus, "matched"> };

// 거래(단지) 하나에 대한 규모 분류. 빌라는 null.
export function classifyListingScale(
  listing: ScaleSourceListing,
  result: ScaleResult | undefined,
  criterion: ScaleCriterion,
): ListingScaleState | null {
  if (listing.propertyType === "villa") return null;
  if (!result) return { state: "pending" };
  if (result.status === "matched") {
    return { state: "matched", match: getScaleMatch({ households: result.households, buildingCount: result.buildingCount }, criterion) };
  }
  return { state: "failed", status: result.status };
}

// 규모 모드가 실제로 결과를 거르는지 여부. all이거나 빌라 전용이면 비활성.
export function isScaleFilterActive(mode: ScaleMode, typeChoice: "all" | "apartment" | "villa"): boolean {
  return mode !== "all" && typeChoice !== "villa";
}

// 분류 결과를 필터링에 적용한다. pending/실패는 only/exclude/unknown 어디에서도 확정값이 아니다.
export function includeByScale(
  classification: ListingScaleState | null,
  propertyType: PropertyType | undefined,
  mode: ScaleMode,
): boolean {
  if (classification === null || propertyType === "villa") return true;
  if (mode === "all") return true;
  if (mode === "only") return classification.state === "matched" && classification.match === true;
  if (mode === "exclude") return classification.state === "matched" && classification.match === false;
  // unknown: 확정된 true/false가 아닌 모든 종결 상태를 보여준다.
  // pending(조회 중)은 최종 unknown으로 세지 않는다. failed는 배지로 구분한다.
  if (classification.state === "pending") return false;
  if (classification.state === "matched") return classification.match === null;
  return true;
}

export const normalizeForLookup = normalizeScaleName;
