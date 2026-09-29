export type PlaceSignal = {
  category: "상권" | "학군" | "교통";
  count: number;
  topPlaces: string[];
  radiusMeters: number;
};

const KAKAO_CATEGORY_ENDPOINT =
  "https://dapi.kakao.com/v2/local/search/category.json";

// Kakao Local 카테고리 그룹 코드. 반경 내 해당 시설을 거리순으로 집계한다.
const CATEGORY_CODES: Array<{
  category: PlaceSignal["category"];
  code: string;
}> = [
  { category: "상권", code: "MT1" }, // 대형마트
  { category: "학군", code: "SC4" }, // 학교
  { category: "교통", code: "SW8" }, // 지하철역
];

const RADIUS_METERS = 1_200;
const TOP_PLACES = 3;

type KakaoCategoryDocument = {
  place_name: string;
  distance?: string;
};

type KakaoCategoryResponse = {
  meta?: { total_count?: number; is_end?: boolean };
  documents?: KakaoCategoryDocument[];
};

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function searchCategory(
  code: string,
  lat: number,
  lng: number,
  restApiKey: string,
): Promise<KakaoCategoryResponse> {
  const url = new URL(KAKAO_CATEGORY_ENDPOINT);
  url.searchParams.set("category_group_code", code);
  url.searchParams.set("x", String(lng));
  url.searchParams.set("y", String(lat));
  url.searchParams.set("radius", String(RADIUS_METERS));
  url.searchParams.set("sort", "distance");
  url.searchParams.set("size", String(TOP_PLACES));
  url.searchParams.set("page", "1");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${restApiKey}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status !== 429 || attempt === 2) {
      if (!response.ok)
        throw new Error(`Kakao Local API failed: ${response.status}`);
      return (await response.json()) as KakaoCategoryResponse;
    }
    await pause(600 * (attempt + 1));
  }
  return {};
}

export async function fetchPlaceSignals(
  lat: number,
  lng: number,
): Promise<PlaceSignal[]> {
  const restApiKey = process.env.KAKAO_REST_API_KEY;
  if (!restApiKey || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];

  const settled = await Promise.allSettled(
    CATEGORY_CODES.map(async ({ category, code }) => {
      const payload = await searchCategory(code, lat, lng, restApiKey);
      const documents = payload.documents ?? [];
      return {
        category,
        count: payload.meta?.total_count ?? documents.length,
        topPlaces: documents
          .slice(0, TOP_PLACES)
          .map((place) => place.place_name)
          .filter(Boolean),
        radiusMeters: RADIUS_METERS,
      } satisfies PlaceSignal;
    }),
  );

  return settled
    .filter(
      (result): result is PromiseFulfilledResult<PlaceSignal> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);
}
