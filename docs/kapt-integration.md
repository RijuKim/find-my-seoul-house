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

## Scale-only path (`realEstate.complexScales`)

The housing-type/scale filter uses a separate, conservative path (`server/scale.ts`) that
talks only to **K-apt list + basic info**. It does not call detailed info, BuildingHUB,
places, or trend services.

- Request: `{ candidates: [{ id, apartmentName, lawdCd, neighborhood?, jibun?, propertyType? }] }`,
  at least one and at most 12 candidates. `id` ≤ 200 chars, `apartmentName` ≤ 120,
  `lawdCd` exactly five digits, `neighborhood` ≤ 80, `jibun` ≤ 40.
  No budget/asset/income fields are accepted.
- Response per id: `{ id, status, households?, buildingCount?, source, checkedAt, statusMessage }`.
  `status` ∈ `matched | not_found | ambiguous | unavailable | error | unsupported`.
  Counts are positive finite integers only; failures/missing keys never leak raw URLs, keys, or bodies.

Matching rules (deliberately stricter than the comparison matcher):

1. Normalize case, spaces, and punctuation; require **exact name equality**. No substring fallback.
2. Require the candidate to be unique within the same `lawdCd` **and** 읍/면/동 (`as3`) or 리 (`as4`).
3. Validate the basic-info address against the candidate neighborhood and parcel (번/지). If the
   parcel cannot be confirmed, return `ambiguous` — never publish a best guess.
4. Same names in another neighborhood/parcel are rejected; ambiguous candidates get no counts.
5. Villas return `unsupported`. Missing keys return `unavailable`.

Bounds and caching:

- External fetch concurrency is capped at **3 process-wide**, each request times out at **5s**,
  and each batch has a **25s** deadline (unresolved → `unavailable`).
- Successful public-data results cached ~1h; transient failures cached ≤60s. Cache is capped at
  1000 entries, evicts expired entries, and shares in-flight lookups by **complex identity**, never
  by caller id. Results are remapped to the caller's ids.
- This is serverless in-memory reuse only; **no cross-instance persistence** is claimed.

## Live strict audit

`scripts/audit-scale-coverage.ts` performs a read-only audit against the real K-apt APIs using
the existing environment keys. It samples up to 12 unique apartment identities from a reproducible
evenly-spaced slice of current Seoul trades, and records the denominator, date, per-status counts
and lookup time in `research/strict-audit.md` / `.json`. It never prints keys or upstream bodies.
Latest run (2026-10-08, 서울 아파트 최근 1개월, 240 records → 221 identities → 12 sampled):
3 matched (both counts), 8 not_found, 1 ambiguous, 0 unavailable/error, 1294 ms. This is a small
diagnostic sample, not population coverage; the feature is explicitly shipped incomplete.

## Coverage limitation

This dataset covers registered apartment complexes only. Many small or unregistered buildings
return `not_found`/`ambiguous` and are shown as "규모 정보 없음", never as large complexes. The
scale filter is honest about this and does not promise exhaustive identification.

