# Jeonse feature DAG

Mode: Standard, autonomous. delivery_mode: autonomous. model_tier: local (finer-grained, explicit per-job acceptance).
Executor: OpenCode / ollama deepseek-v4.1-flash. Branch: tenet/2026-10-12-jeonse. No push/deploy.

```
job-1 jeonse-server-module (dev)
   │
   ├───────────────┬──────────────────────────┐
   │               │                          │
job-2             job-3
jeonse-server-    jeonse-interpretation (dev)
tradetype (dev)   │
   │               │
   └───────┬───────┘
           │
      job-4 jeonse-ui-toggle (dev)
           │
      job-5 jeonse-browser-acceptance (dev)
           │
      e2e-1 jeonse-final-verify (integration_test, report_only)
```

## Interface contracts
- **server/jeonse.ts (new, pure module)** exports:
  - `MOLIT_APT_RENT_ENDPOINT = ".../RTMSDataSvcAptRent/getRTMSDataSvcAptRent"`, `MOLIT_VILLA_RENT_ENDPOINT = ".../RTMSDataSvcRHRent/getRTMSDataSvcRHRent"`.
  - `isJeonseRow(item: Record<string, string|number|undefined>): boolean` — true only when monthly rent is 0 AND deposit > 0 AND not a renewal/prior-contract row (`useRRRight` truthy, or `preDeposit`/`preMonthlyRent` present). Defensive key parsing: `deposit`/`보증금액`, `monthlyRent`/`월세금액`, stripping commas.
  - `parseJeonseTrade(item, ctx: {lawdCd; district; cluster; lat; lng}, index, propertyType: "apartment"|"villa"): MolitAptTrade | null` — returns null unless `isJeonseRow`; maps `priceMan = deposit`, `priceWon = deposit*10000` downstream, `aptNm`/`mhouseNm`, `umdNm`, `jibun`, `roadNm`, `excluUseAr`→area, `buildYear`→year, `dealYear/Month/Day`→dealDate, id `jeonse-{lawdCd}-{ymd}-{index}-{name}-{jibun}`.
  - `fetchMolitRentTrades({ lawdCd, dealYmd, numOfRows, districts, propertyType }): Promise<MolitAptTrade[]>` — mirrors `fetchMolitAptTrades`; reuses `settleInBatches`/`fetchWithBackoff` patterns; filters via `parseJeonseTrade`.
  - The pre-written `server/jeonse.acceptance.test.ts` is the binding contract; worker may refine signatures only if all its assertions still hold.
- **`fetchRecentAptTrades`** gains `tradeType?: "sale" | "jeonse"` (default "sale"). Sale path unchanged and makes **zero** rent-API calls. Cache key includes `tradeType`.
- **Router** `realEstate.recentTrades` input gains `tradeType: z.enum(["sale","jeonse"]).default("sale")`.
- **Client** `Home.tsx`: trade-type state flows to the `recentTrades` query and to `interpretationRecords` (`tradeType` replaces the hardcoded `"sale"` at Home.tsx:581); jeonse `budget.total` uses interest-only (`Home.tsx:517-527` analog with `jeonsePaymentAffordablePrincipal`).

## job-1 — jeonse-server-module (dev)
Dependencies: none.
Deliverable: `server/jeonse.ts` (endpoints, `isJeonseRow`, `parseJeonseTrade`, `fetchMolitRentTrades`), reusing `server/realEstate.ts` utilities; extend `server/realEstate.test.ts` with mocked-fetch tests.
Acceptance: `server/jeonse.acceptance.test.ts` all pass; `pnpm check`; `pnpm test`; mocked fetch test proves jeonse inclusion/exclusion, deposit→priceMan mapping, 429 backoff reuse. No new deps.
Evidence: run `pnpm test` output; commit `server/jeonse.ts` + tests.

## job-2 — jeonse-server-tradetype (dev)
Dependencies: job-1.
Deliverable: `tradeType` plumbed through `fetchRecentAptTrades` (sale default, no rent calls for sale) + cache key + router schema `tradeType` enum; update `docs/data-sources.md` with rent endpoints/limits.
Acceptance: sale path regression test (mock fetch asserts no rent endpoint called and same output shape); jeonse path test returns jeonse rows; router rejects invalid tradeType; `pnpm check`/`test`/`build`/`build-api.mjs` pass.
Evidence: test output; commit server + docs/data-sources.md.

## job-3 — jeonse-interpretation (dev)
Dependencies: job-1.
Deliverable: verify/harden `evaluateFeasibility` jeonse branch and `jeonsePaymentAffordablePrincipal` use; extend `client/src/lib/interpretation.test.ts` with explicit jeonse budget cases (interest-only monthly burden; rate 0 finite via LTV cap; sale regression).
Acceptance: `pnpm test` interpretation suite passes with added jeonse numeric expectations using independent values; `pnpm check`.
Evidence: test output; commit test changes (and interpretation.ts only if a real defect is found).

## job-4 — jeonse-ui-toggle (dev)
Dependencies: job-2, job-3.
Deliverable: trade-type toggle (매매|전세) in `client/src/pages/Home.tsx` + `client/src/index.css`, 44px + keyboard focus + aria; wire `tradeType` into the query and interpretation records; jeonse exploration budget (interest-only) branch; conditional jeonse notices ("전세 실거래(과거 신고)", "월세는 제외"); update `docs/HANDOFF.md`.
Acceptance: `pnpm check`/`test`/`build`/`build-api.mjs` pass; sale default unchanged; toggle switches results; no overflow at 360/1280 (checked in job-5).
Evidence: commit Home.tsx/index.css/HANDOFF.

## job-5 — jeonse-browser-acceptance (dev)
Dependencies: job-4.
Deliverable: `tests/acceptance/jeonse.cjs` Playwright-MCP-callable script (async page fn) with fixture routes covering scenario 1-3,5,7: trade toggle 44px, sale default zero rent calls, jeonse notices, classification fixtures (월세0/양수, 월세>0, 보증금0, 갱신), filters/sort/map count consistency, 360/1280 no overflow, console 0; run it and fix any UI defects found (scoped to jeonse feature).
Acceptance: script reports all assertions pass at 1280 and 360; `pnpm test` still passes.
Evidence: script output; commit tests/acceptance/jeonse.cjs (+ any scoped fix).

## e2e-1 — jeonse-final-verify (integration_test, report_only)
Dependencies: job-5.
Prompt: Read-only independent final verification. Run mechanical suite (`pnpm check`, `pnpm test`, `pnpm build`, `node scripts/build-api.mjs`), the browser acceptance script at 360/1280, and a bounded live apartment-jeonse sample (if keys/entitlement present) for one district; inspect `docs/HANDOFF.md` honesty. Report exact outcomes. Do not edit code/tests/docs; use `tenet_report_blocking_finding` for blocking gaps. No commit/push/deploy.

## Verification evidence
Clarity 0.885 passed (1st 0.783 fail). Readiness passed; eval_parallel_safe=false (shared dev server/port, Playwright, data.go.kr rate limits). Pre-written acceptance contract: `server/jeonse.acceptance.test.ts` (intentionally fails until job-1 creates `server/jeonse.ts`). Existing `client/src/lib/interpretation.test.ts` already covers jeonse budget cases.
