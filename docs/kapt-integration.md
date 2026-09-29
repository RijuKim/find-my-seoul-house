# K-apt integration sources

## Official sources

- Apartment complex list: https://www.data.go.kr/data/15057332/openapi.do
  - Base URL: `https://apis.data.go.kr/1613000/AptListService4`
  - Operations used: `getSigunguAptList4`, `getSidoAptList4`, `getTotalAptList4`
  - Fields: `kaptCode`, `kaptName`, `bjdCode`, `as1`, `as2`, `as3`, `as4`
- K-apt basic and detailed information: https://www.data.go.kr/data/15058453/openapi.do
  - Base URL: `https://apis.data.go.kr/1613000/AptBasisInfoServiceV5`
  - Basic operation: `getAphusBassInfoV5`
  - Detailed operation: `getAphusDtlInfoV5`
  - Basic fields: `kaptdaCnt` (households), `kaptDongCnt` (building count), `kaptUsedate` (approval date), `kaptAddr`, `doroJuso`
  - Detailed fields: `kaptdPcnt` (ground parking), `kaptdPcntu` (underground parking), `subwayStation`, `subwayLine`, `kaptdWtimesub`, `kaptdWtimebus`, `convenientFacility`, `educationFacility`
- Building register / FAR candidate: https://www.data.go.kr/data/15134735/openapi.do
  - BuildingHUB building register service. The `vlRat` (FAR) field is not part of the K-apt basic/detailed response and requires address/parcel-level building-register matching.

## Matching policy

1. Match a live MOLIT apartment trade to K-apt by five-digit `lawdCd` and normalized apartment name.
2. Query K-apt basic and detailed records with the matched `kaptCode`.
3. Display official household count and ground/underground/total parking values.
4. If no match exists, show a status message instead of inventing values.
5. Villas are marked unsupported because this K-apt complex dataset is for registered apartment complexes.
