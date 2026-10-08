// 주택 유형·단지 규모 필터의 순수(tri-state) 로직.
// UI/네트워크와 분리해 결정적으로 테스트한다.

export type ScaleCriterion = "households" | "buildings" | "either";
export type ScaleMode = "all" | "only" | "exclude" | "unknown";
export type PropertyType = "apartment" | "villa";

export type ScaleCounts = {
  households?: number | null;
  buildingCount?: number | null;
};

// 유효한 규모 값은 양의 유한 정수만 인정한다.
// 0/음수/NaN/소수/누락은 "정보 없음"이지 "큰 단지"가 아니다.
export const isValidScaleCount = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const householdsMatch = (value: number | null | undefined): boolean | null =>
  isValidScaleCount(value) ? value < 100 : null;

const buildingsMatch = (value: number | null | undefined): boolean | null =>
  isValidScaleCount(value) ? value === 1 : null;

/**
 * 규모 조건 일치 여부를 삼상값으로 계산한다.
 * - true: 조건에 부합함이 확인됨
 * - false: 조건에 부합하지 않음이 확인됨
 * - null: 판단에 필요한 정보가 없음(미확인)
 *
 * either(OR)는 한쪽이라도 true면 true, 양쪽 모두 false일 때만 false, 그 외 null.
 */
export function getScaleMatch(
  counts: ScaleCounts | null | undefined,
  criterion: ScaleCriterion,
): boolean | null {
  const households = householdsMatch(counts?.households);
  const buildings = buildingsMatch(counts?.buildingCount);

  if (criterion === "households") return households;
  if (criterion === "buildings") return buildings;

  if (households === true || buildings === true) return true;
  if (households === false && buildings === false) return false;
  return null;
}

/**
 * 삼상 일치값과 사용자 모드로 레코드 포함 여부를 결정한다.
 * - all: 모든 레코드 표시
 * - 빌라는 아파트 규모 필터를 우회한다(적용 대상 아님).
 * - only: true만, exclude: false만, unknown: null만 남긴다.
 * - 미확인(null)은 exclude에서 절대 통과하지 못한다.
 */
export function matchesScaleFilter(
  propertyType: PropertyType | string | undefined,
  match: boolean | null,
  mode: ScaleMode,
): boolean {
  if (propertyType === "villa") return true;
  if (mode === "all") return true;
  if (mode === "only") return match === true;
  if (mode === "exclude") return match === false;
  return match === null;
}

// 서버 매칭과 동일한 정규화 규칙(대소문자·공백·구두점 제거)을 클라이언트에서도 사용해
// 동일 단지를 하나의 조회로 묶는다.
export const normalizeScaleName = (value: unknown) =>
  String(value ?? "").toLowerCase().replace(/[\s()·.,\-_'"/[\]{}:;+]/g, "");

export type ScaleIdentityInput = {
  apartmentName: string;
  lawdCd?: string;
  neighborhood?: string;
  jibun?: string;
};

const parcelBun = (jibun: string | undefined): string => {
  const first = String(jibun ?? "").split(/[-–—]/)[0]?.replace(/[^0-9]/g, "") ?? "";
  return first.replace(/^0+/, "") || "";
};

/**
 * 호출자 id가 아니라 단지의 지리적 정체성으로 조회/캐시를 공유하기 위한 키.
 * 같은 단지의 여러 거래는 같은 키를 가진다.
 */
export function scaleIdentity(input: ScaleIdentityInput): string {
  return [
    input.lawdCd ?? "",
    normalizeScaleName(input.apartmentName),
    normalizeScaleName(input.neighborhood),
    parcelBun(input.jibun),
  ].join("|");
}

export const SCALE_CRITERION_LABEL: Record<ScaleCriterion, string> = {
  households: "100세대 미만",
  buildings: "1개 동",
  either: "100세대 미만 또는 1개 동",
};

export const SCALE_MODE_LABEL: Record<ScaleMode, string> = {
  all: "전체",
  only: "조건에 맞는 단지만",
  exclude: "조건에 맞는 단지 제외",
  unknown: "규모 정보 없음",
};
