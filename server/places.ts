import { makeRequest, type PlacesSearchResult } from "./_core/map";

export type PlaceSignal = {
  category: "상권" | "학군" | "교통";
  count: number;
  topPlaces: string[];
  averageRating?: number;
};

type NearbyQuery = { type: string; category: PlaceSignal["category"] };
const QUERIES: NearbyQuery[] = [
  { type: "supermarket", category: "상권" },
  { type: "shopping_mall", category: "상권" },
  { type: "restaurant", category: "상권" },
  { type: "school", category: "학군" },
  { type: "transit_station", category: "교통" },
  { type: "subway_station", category: "교통" },
];

export async function fetchPlaceSignals(lat: number, lng: number): Promise<PlaceSignal[]> {
  const settled = await Promise.allSettled(QUERIES.map(async ({ type, category }) => {
    const response = await makeRequest<PlacesSearchResult>("/maps/api/place/nearbysearch/json", {
      location: `${lat},${lng}`,
      radius: 1200,
      type,
      language: "ko",
    });
    const results = response.results ?? [];
    return {
      category,
      count: results.length,
      topPlaces: results.slice(0, 3).map((place) => place.name).filter(Boolean),
      averageRating: results.length ? Math.round((results.reduce((sum, place) => sum + (place.rating ?? 0), 0) / results.length) * 10) / 10 : undefined,
    } satisfies PlaceSignal;
  }));

  const grouped = new Map<PlaceSignal["category"], PlaceSignal>();
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    const current = grouped.get(result.value.category);
    if (!current) grouped.set(result.value.category, result.value);
    else grouped.set(result.value.category, {
      category: current.category,
      count: current.count + result.value.count,
      topPlaces: [...current.topPlaces, ...result.value.topPlaces].slice(0, 3),
      averageRating: result.value.averageRating === undefined ? current.averageRating : current.averageRating === undefined ? result.value.averageRating : Math.round(((current.averageRating + result.value.averageRating) / 2) * 10) / 10,
    });
  }
  return ["상권", "학군", "교통"].map((category) => grouped.get(category as PlaceSignal["category"])).filter((signal): signal is PlaceSignal => Boolean(signal));
}
