# Housing filters quality contract

## Commands and environment
- cwd /Users/guremini/projects/budungbudung; pnpm10 installed, node_modules present.
- pnpm check; pnpm test; pnpm build; node scripts/build-api.mjs. No lint script exists; no added linter.
- pnpm dev starts port3000; inspect availability first, do not kill unrelated processes. Health GET / and /api/trpc/realEstate.districts?input=... JSON/superjson.
- Existing .env keys may be loaded by dotenv for live audit; never print keys, credentials files or upstream URLs with serviceKey. Server-only K-apt env names in spec. Public first-search works independent of K-apt keys.

## Tests and layers
- Unit/integration: Vitest mock external fetch for boundary predicates, matching, errors, concurrency, cache identity and deadline. Use independent expected values 99/100/250,1/2,missing. Tests assert output semantics, not no-crash.
- Acceptance: implement pure tri-state test contract at client/src/lib/housingFilters.acceptance.test.ts before worker implementation. Worker extends it and server tests as needed. Vitest excludes tests from main tsc as current config.
- Browser scripted acceptance and Layer2 exploration REQUIRED, 360x800 and1280x900; available Playwright MCP can execute script with page routing/assertions. No @playwright/test install without approval. Use standalone Playwright-MCP-callable module in tests/acceptance/housing-filters.cjs (async page function) or equivalent existing-tool script; execute through browser_run_code_unsafe. Fixture routes for rare boundary/error cases are explicitly test-only, no runtime mock fallback. Explore live/default UI separately with source provenance.
- Browser verification: type states, modes only/exclude/unknown/all, loading/partial/failure/retry, region switch while lookup pending, count/card/map consistency, no default scale calls, 44px/keyboard/focus and overflow. Existing budget change, sort, comparison selection and clear, map result input regressions checked. Charts/nearby/K-apt comparison live failures clearly surfaced; do not demand unrelated external availability.
- Strict live coverage audit is read-only real K-apt, credentials-dependent; max12 complexes sampled. Store aggregate safe evidence with source/date and limitations. Production initial sample9 already in research. No live claim from mocked fixtures.
- e2e_surface web_ui + API. eval_parallel_safe=false (shared browser/port, public API rate limits). Must report actual exploration, no skipped browser pass.

## Architecture and iron laws
- Pure tri-state predicate separate from UI. Missing is not false; 0 invalid count. Conservative identity matching before publishing sizes.
- recentTrades cannot call scale service; lazy scale lookup<=12 per request, external concurrency3, timeout5s, batch budget25s. No unbounded server/client API fans or retries. Share in-flight/cache by identity not caller id.
- Unknown/pending/error distinguishable. Filter count, cards and map use same results. Villas bypass apartment scale filter.
- Server financial privacy, fixed upstream endpoint and validated lengths; sanitize errors. No runtime LLM, scores or invented data.
- Scope narrowly; generated shadcn untouched; current code/HANDOFF overrides stale greenfield docs. No type suppression or `as any`. Existing patterns preserved.

## Danger Zones
Never edit .env or secret files, .tenet/project/**, generated client/src/components/ui/**, .git internals, node_modules, production settings or push/deploy. .tenet/.state is tool-owned, never commit live DB files. No new dependencies. Workers may edit application files required by spec, tests, docs/HANDOFF.md, docs/kapt-integration.md, scripts for coverage audit and run-local evidence.

## Git and doctrine
Branch tenet/2026-10-07-housing-filters, specific-path staging and local commit per dev job if possible. No push. Dirty unrelated opencode.json (if present) untouched. Normal implementation never edits project doctrine; propose updates in run journal. Read-only integration job cannot fix product; report findings.
