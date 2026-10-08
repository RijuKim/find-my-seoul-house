---
delivery_mode: autonomous
---
# Housing type and apartment scale filters

## Purpose
Make existing type selection discoverable and let users distinguish confirmed small/single-building apartments from unknown-size apartments, using factual public data without slowing default transaction search.

## Tech Stack and verified baseline
Existing package.json: React 19.2.1, Vite 7.1.7, TypeScript 5.9.3, Express 4.21.2, tRPC 11.6, React Query 5, Vitest 2, pnpm 10.4.1. No additions. `client/src/pages/Home.tsx` owns type selection, client budget filtering, result cards/map and comparison. `server/realEstate.ts` returns past transactions; unchanged default critical path. `server/kapt.ts` currently enriches three comparison candidates using fuzzy names and unnecessary-for-scale detail/BuildingHub calls. New scale path must not trust its fuzzy matching. `server/routers.ts` exposes public tRPC. `client/src/main.tsx` uses httpBatchLink. `api-src/trpc.ts` shares router; `vercel.json` maxDuration 60.

## API Endpoints
| Method | Path | Auth | Contract |
|---|---|---|---|
| GET | /api/trpc/realEstate.recentTrades | public | Existing; no scale enrichment or dependency |
| GET | /api/trpc/realEstate.complexScales | public | New bounded batch of <=12 identity-only candidates; return id, status, households?, buildingCount?, source, checkedAt, statusMessage |
| GET | /api/trpc/realEstate.complexInfo | public | Existing comparison behavior preserved |

Candidate: id nonempty max200, apartmentName nonempty max120, lawdCd exactly five digits, neighborhood max80, jibun max40, propertyType apartment or villa. Require at least one, max12, validate all string sizes. No budget/asset/income params. statuses: matched, not_found, ambiguous, unavailable, error, unsupported. Counts positive finite integers only. Missing keys/upstream errors yield safe status and no raw URL/key/error body.

## Data and matching
No database schema change. Response cache: in-process bounded TTL cache (1h successful public data, short <=60s transient failures if cached); map cap <=1000 entries; expired entries evicted; same lookup in-flight deduplicated and cleared on settle. Cache internal identity, never caller id. Remap results to caller ids. Serverless memory reuse only; do not claim cross-instance persistence.
New scale lookup uses K-apt list + basic info only; no detailed/BuildingHub/places/trend calls. Normalize case, spaces and punctuation; exact name equality only. Require unique candidate in same lawdCd plus neighborhood (list as3/as4 where present) and validate basic address against candidate neighborhood/parcel before publishing counts. Missing identity evidence -> unknown (not_found/ambiguous), not best guess. Same names in other neighborhoods/parcels rejected, no substring fallback. If data contract makes parcel confirmation unreliable, conservative unknown is required; do not reduce standard merely to increase coverage.
Bound external fetch concurrency to 3 process-wide, timeout 5s each, no automatic retries; request batch deadline 25s (unresolved -> unavailable, cancel queued tasks and abort active work or allow only existing bounded shared requests to finish). Avoid timer leaks. Client batches sequentially <=12. Duplicate transaction identities share lookup. New generation/region/type ignores stale responses, effect cleanup avoids state contamination.

## Filter semantics
Type options: 전체 / 아파트 / 빌라·다세대 (grouped 연립·다세대 explanatory text). Can keep multi-select semantics if equally clear; at least one type selected. Default apartment unchanged. No attempt to separate colloquial villa from multifamily.
Apartment criterion: households (100세대 미만), buildings (1개 동), either (100세대 미만 또는 1개 동). Mode: all (전체), only (조건에 맞는 단지만), exclude (조건에 맞는 단지 제외), unknown (규모 정보 없음). Default all, criterion either. No new preference confirmation required; user authorized scope/resumption and host allows routine decisions.
Predicate returns true/false/unknown. OR true if either known true; false only if both known false; otherwise unknown. 99 qualifies, 100 not; building=1 qualifies even with 250 households. null/undefined/0/negative/NaN/noninteger invalid. Only true included for only, only false for exclude, unknown for unknown mode. Villas bypass apartment predicate and carry no misleading scale label; UI states 아파트에만 적용. Villa-only hides/disables scale controls and resets mode to all; switching back starts all. Counts/card/map use same filtered array.

## Loading/error state contract
Default all: zero new scale API calls, no blocking of cards/map or recentTrades. Active mode starts lazy scale-only requests after trades. Show `단지 규모 확인 중 (N/M)` and confirmed partial results with incomplete notice; pending never counted as final unknown. Progress denominators are unique apartment identities among current base budget/region/area/price-filtered results, not all Seoul apartments. Reuse known responses across price/budget changes without transmitting financial values. Bound batch sizes; no retry storm or polling.
Show separate counts for confirmed full, partial, no-match/ambiguous, and failed/unavailable where useful, with clear transaction vs complex denominators. Unknown filter may show terminal missing/error records but badge distinguishes failed lookup from genuinely absent. Retry failed lookup with visible button; resetting all immediately restores base results. Clear no-match empty state vs searching vs lookup failure. K-apt coverage limitation copy and source/check time shown near scale controls/details. Initial implementation is explicitly incomplete; no coverage minimum/fabrication.

## Design Direction
Use `.tenet/project/design.md` honesty/mobile guidelines, current `client/src/index.css` palette as actual source. Adopt wrapping chips layout `visuals/2026-10-08-01-mockup-chips.html` and `visuals/2026-10-08-04-prototype-filters.html`; alternatives 02/03 retained as review artifacts. `visuals/2026-10-08-00-architecture.html` shows separate data flow. Existing-app routine design choice authorized by user; no separate redesign needed. Minimum44px controls, visible keyboard focus, semantic labels/selection; 360px no page overflow, 1280px existing grid. Do not edit generated shadcn components. No unrelated comparison redesign.

## Auth Flow
1. Anonymous browser calls validated public router with property identity only.
2. Server reads existing KAPT_LIST_SERVICE_KEY and KAPT_BASIS_SERVICE_KEY environment variables.
3. Server requests fixed official endpoints and returns counts/provenance or safe unknown statuses.
4. Financial inputs remain browser-memory only.

## Success Criteria
1. Type control exposes apartment and grouped villa/multifamily clearly at mobile and desktop; existing budget/filter/sort/map/comparison remain working.
2. All boundary and tri-state examples in interview pass deterministic tests; missing cannot pass exclude.
3. Mock upstream matching tests prove exact unique geographic identity, reject ambiguous/fuzzy/wrong parcel, sanitize errors, correct caches/dedup and bounded calls.
4. Default search makes no scale requests; scale failure never breaks base search. New batches fit Vercel limit with 25s app deadline. No numeric external network SLA asserted.
5. Read-only live strict-matcher audit with existing env keys, max12 unique complexes from a reproducible sample of current trades; record denominator/date/matching status/count availability and lookup times in docs. If credentials unavailable, report actual failure, no invented result; deterministic feature tests still required.
6. pnpm check, pnpm test, pnpm build, node scripts/build-api.mjs pass; interactive browser verification at360/1280 with fixtures for rare boundaries and live basic smoke separately. Type/state changes update result count, cards, map input consistently.
7. docs/HANDOFF.md and docs/kapt-integration.md updated with honest coverage, limitations, controls, caching and tests.

## Out of Scope
Production deploy/push, ranking, persistent KV or new infrastructure, separate villa/dasedae legal classification, new BuildingHUB fallback, wholesale matching/comparison rewrites, unrelated mobile comparison changes. No new dependencies or secrets committed.
