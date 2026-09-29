# Data sources

- MOLIT apartment sales API: https://www.data.go.kr/data/15126469/openapi.do
  - Official description: reports are queried by 5-digit legal-dong code and 6-digit contract month.
  - API base/service path used by the app: `https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade`
- MOLIT multi-family / villa sales API: https://www.data.go.kr/data/15126467/openapi.do
  - Official search result documents GET `getRTMSDataSvcRHTrade`.
  - API path used by the app: `https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade`
- Official transaction system categories include apartment, multi-family/villa, detached/multi-household, officetel, etc.: https://rt.molit.go.kr/

## 지도·입지

- Naver Maps JS API v3 (NCP): `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId={클라이언트ID}`
  - 발급: NAVER Cloud Platform > Maps. 브라우저에 노출되는 클라이언트 ID만 사용하며 Web 서비스 URL을 등록한다.
  - 지도 초기화·마커·경계 맞춤은 `client/src/components/Map.tsx`, `client/src/pages/Home.tsx`의 `MapPanel`.
- 카카오 로컬 API(카테고리로 장소 검색): `https://dapi.kakao.com/v2/local/search/category.json`
  - 서버에서 `Authorization: KakaoAK {REST_API_KEY}` 헤더로 호출한다(`server/places.ts`).
  - 지도 좌표(`x`,`y`) + `radius`(1.2km) + `category_group_code`(대형마트 MT1·학교 SC4·지하철역 SW8)로 **거리순** 집계한다. `meta.total_count`가 반경 내 전체 개수.
  - 발급: developers.kakao.com > 앱 > REST API 키. 서버 전용이며 클라이언트에 노출하지 않는다.
  - 참고: 네이버 지역 검색(`openapi.naver.com/v1/search/local.json`)은 `display` 최대 5·페이징 불가·반경 파라미터 없음이라 개수/거리 집계에 부적합해 사용하지 않는다.

The app uses the user-provided MOLIT service key server-side and does not expose it in the client.
