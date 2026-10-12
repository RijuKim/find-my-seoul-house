# housing-filters integration verification 2026-10-10

type: journal
source_job: 7f71b628-2f85-4217-9699-8da35c531dcd
job_name: Verify housing filters across API and mobile desktop UI
created: 2026-10-10T08:08:09.353Z

## Findings

- **browser_acceptance**: tests/acceptance/housing-filters.cjs 20/20 at 1280 and 360, 0 console errors
- **live_smoke**: real trades 108 cards, map 108 markers, 0 scale API calls on default load
- **mechanical**: pnpm check clean; pnpm test 70 passed/8 skipped; pnpm build pass; node scripts/build-api.mjs pass
- **notes**: Tenet job 7f71b628 failed only because running MCP server (started 2026-09-29) cached retired model deepseek-v4-flash:0731; config now ollama/deepseek-v4.1-flash but server needs restart. Verification performed directly by host instead.
- **outcome**: verified
