# Jeonse feature quality contract

## Commands and environment
- cwd /Users/guremini/projects/budungbudung; pnpm 10 installed, node_modules present.
- Gates: `pnpm check`; `pnpm test`; `pnpm build`; `node scripts/build-api.mjs`. No lint script exists; do not add a linter.
- `pnpm dev` starts port 3000; check availability first, do not kill unrelated processes. Health: GET `/` and `/api/trpc/realEstate.districts?input=...` return JSON/superjson.
- Existing `.env` keys may be loaded by dotenv for live checks; **never print keys, credential files, or upstream URLs containing serviceKey**. Public first search must work independent of rent-API entitlement.

## Tests and layers
- Unit/integration (Vitest, mock external fetch): jeonse classification boundaries (monthlyRent 0/1, deposit 0/positive, renewal exclusion, missing area/year), field mapping (deposit→priceMan/priceWon), defensive key parsing, batching/timeouts/backoff reuse, cache key includes tradeType, and **sale regression** (sale path unchanged). Use independent expected numeric values for `jeonsePaymentAffordablePrincipal` (incl. rate 0 → finite via LTV cap) and interest-only monthly burden.
- Acceptance: extend the pure interpretation acceptance tests already present (`client/src/lib/interpretation.test.ts`) and add jeonse-specific cases; server fetch tests in `server/realEstate.test.ts` (credential-gated live cases may skip). Assert output semantics, not no-crash.
- Browser scripted acceptance + Layer 2 exploration REQUIRED at 360x800 and 1280x900 via Playwright MCP. Use a standalone Playwright-MCP-callable module (`tests/acceptance/jeonse.cjs`, async page function) executed through `browser_run_code_unsafe`; fixture routes are test-only (no runtime mock fallback). Verify: trade-type toggle present and 44px, sale default unchanged, jeonse mode shows jeonse notices, filters/sort/map count consistency, no horizontal overflow, console errors 0. Explore live separately with source provenance.
- Live (credentials-dependent, read-only): with keys present, fetch a bounded apartment-jeonse sample for one district and confirm ≥1 real jeonse record (deposit>0, monthlyRent 0). Record district/date/counts/limitations; if keys/entitlement missing, report actual failure — no invented live claim.
- e2e_surface web_ui + API. eval_parallel_safe=false (shared browser/port, public API rate limits). Must report actual exploration; no skipped-browser pass.

## Architecture and iron laws
- Jeonse classification is pure and conservative: include only `monthlyRent == 0 && deposit > 0` non-renewal rows; exclude others; **never substitute samples or infer**.
- Deposit is the price for jeonse (`priceMan = deposit`, `priceWon = deposit*10000`). Interpretation uses the existing `jeonse` branch (interest-only); do not special-case sale.
- `recentTrades` with `tradeType: "sale"` (default) must make **zero** rent-API calls and behave byte-for-byte as before. Rent API calls happen only for jeonse.
- Reuse existing bounded fetch utilities (`settleInBatches`, `fetchWithBackoff`, `regionCache`); no unbounded fans/retries. Cache key includes `tradeType`.
- Server financial privacy: monetary inputs never leave the browser or reach the rent API. Service key server-only; sanitize errors (no raw key/URL/body).
- No runtime LLM, no ranking/scores, no invented statistics. Existing patterns preserved (no new deps, no `as any`, no type suppression).
- Scope narrowly; generated shadcn untouched; actual code + HANDOFF override stale greenfield docs.

## Danger Zones
Never edit `.env` or secret files, `.tenet/project/**`, generated `client/src/components/ui/**`, `.git` internals, `node_modules`, production settings, or push/deploy. `.tenet/.state` is tool-owned; never commit live DB files. No new dependencies. Workers may edit application files required by spec, tests, `docs/HANDOFF.md`, `docs/data-sources.md`, and run-local evidence.

## Git and doctrine
Branch `tenet/2026-10-12-jeonse`, specific-path staging, local commit per dev job. No push. Leave dirty unrelated files (e.g. `opencode.json.bak*`) untouched. Normal implementation never edits `.tenet/project/**`; propose doctrine updates in the run journal. Read-only integration job cannot fix product; it reports findings.
