# housing-filters implementation summary

type: journal
job_name: housing-filters-implementation
created: 2026-10-08

## Delivered

- `client/src/lib/housingFilters.ts` — pure tri-state scale predicate (`getScaleMatch`, `matchesScaleFilter`), identity normalization, labels.
- `client/src/lib/scaleLookup.ts` — bounded sequential batched lazy lookup, identity-keyed dedup, stale-generation protection, per-listing classification.
- `server/scale.ts` — new `complexScales` scale-only service. K-apt list + basic info only; conservative exact-name + unique 동/지번 + address-parcel confirmation; safe statuses; cache (1h success / ≤60s transient, cap 1000), in-flight dedup by identity, concurrency 3, 5s timeout, 25s batch deadline.
- `server/routers.ts` — `realEstate.complexScales` with max-12 and field-length validation; no financial params.
- `client/src/pages/Home.tsx` + `client/src/index.css` — grouped type chips (전체/아파트/빌라·다세대), separate scale control block (criterion + mode), progress/partial/no-match/failure counts, retry, reset, source/limit copy, per-card scale badges, map count consistency.
- Tests: `housingFilters.acceptance.test.ts` (14), `scaleLookup.test.ts` (11), `scale.test.ts` (16).
- `tests/acceptance/housing-filters.cjs` — Playwright MCP browser script, 20 assertions at 1280/360.
- `scripts/audit-scale-coverage.ts` — read-only live strict audit; evidence in `research/strict-audit.md`.

## Verification

- `pnpm check` pass; `pnpm test` 70 passed / 8 skipped; `pnpm build` pass; `node scripts/build-api.mjs` pass.
- Browser acceptance 20/20 at 1280 and 360, 0 console errors; default load makes zero scale calls.
- Live strict audit (2026-10-08, Seoul, 240 trades → 221 identities → 12 sampled): 3 matched, 8 not_found, 1 ambiguous, 0 unavailable/error, 1294 ms.

## Limitations

- K-apt registered-complex coverage is incomplete; many small/unregistered apartments return not_found/ambiguous → shown as 규모 정보 없음, never as large.
- In-memory cache is serverless instance-reuse only; no cross-instance persistence claimed.
- Villas intentionally bypass the apartment scale predicate.
