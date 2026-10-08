# Initial coverage research

[scanned-not-verified] Current `server/kapt.ts` matches exact normalized names, then accepts the first substring match. This cannot be trusted for scale classification without conservative identity confirmation. Detailed-info and BuildingHub calls are unnecessary for household/building counts, which are in K-apt basic info. `server/routers.ts` complexInfo is capped at three candidates and intended for comparison.

[implemented-and-tested: read-only live observation] On 2026-10-07, used previously fetched live Seoul apartment recentTrades response: 240 transaction records, 221 unique lawdCd/name/parcel tuples. Sampled nine evenly spaced unique complexes (indices floor(i*221/9), original order). Queried production complexInfo in three groups of three. HTTP 200; durations 2.57s, 3.22s, 3.22s. Existing matcher returned five with both counts, one with building count only, three not found. This is a small nonrandom diagnostic sample, not population coverage, and legacy fuzzy matches are not validated identities.

| Trade name | K-apt name | Households | Buildings |
|---|---|---:|---:|
| 신동아아파트1 | no match | unknown | unknown |
| 브라운스톤동선 | 브라운스톤동선 | 194 | 4 |
| 신도브래뉴 | 독산신도브래뉴 | 341 | 3 |
| 서강오벨리스크스위트 | no match | unknown | unknown |
| 북한산힐스테이트7차 | 북한산힐스테이트7차 | 882 | 15 |
| 당산대우 | no match | unknown | unknown |
| 사당우성2 | 사당우성2단지 | 1080 | 8 |
| 상계1차중앙하이츠 | 상계1차중앙하이츠 | 437 | 2 |
| 신설동역자이르네 | 신설동역 자이르네 | unknown | 2 |

Official sources accessed 2026-10-07:
- https://www.data.go.kr/data/15058453/openapi.do : registered K-apt complexes, household and building counts among basic fields. Coverage is not all apartment buildings.
- https://www.data.go.kr/data/15057332/openapi.do : K-apt complex list.

Implementation direction: new lightweight scale-only endpoint, conservative normalized exact unique match with neighborhood confirmation; ambiguous or unavailable -> unknown. Existing fuzzy comparison enrichment need not be expanded for filters. Cache basic/list lookups and in-flight requests, bound candidate count/concurrency, user-triggered scale load after initial trades, no promise of persistent cache on Vercel. BuildingHUB fallback deferred pending reliable parcel identity; never guess counts.
