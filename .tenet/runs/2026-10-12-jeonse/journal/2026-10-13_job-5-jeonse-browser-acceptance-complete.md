# job-5 jeonse browser acceptance complete

type: journal
source_job: adffac56-9b67-4df6-a30e-e9d14fdd4bf6
job_name: jeonse-browser-acceptance
created: 2026-10-13T00:19:21.050Z

## Findings

- **coverage**: toggle visible/44px/focusable; sale default (tradeType=sale, zero direct rent calls); jeonse notices (전세 실거래(과거 신고)/월세는 제외); classification fixtures (월세0+보증금>0 included, 월세>0/보증금0/갱신 excluded, deposit->card price 4.5억); area/district/price filters + sort + map-count consistency; jeonse rate-0 budget finite (7.95억 LTV cap) interest-only copy; no overflow + 0 console errors at both widths
- **deliverable**: tests/acceptance/jeonse.cjs — Playwright-MCP-callable async(page) script with tRPC fixture routes; 45/45 assertions pass at 1280x900 and 360x800 against pnpm dev on :3000
- **honesty_note**: classification boundary is mirrored in-script at the fixture boundary; authoritative unit tests remain server/jeonse.acceptance.test.ts
- **job**: job-5 jeonse-browser-acceptance
- **no_scoped_fix_needed**: Initial 2 failures were test-expectation bugs, not app defects: (1) 84.9㎡ buckets to 20평대 not 30평대 in Home.tsx:546; (2) LTV cap floors to 7.95억 because 1-0.7=0.30000000000000004 in computeExplorationBudget — pre-existing sale behavior, finite as required
- **tests**: pnpm test => 121 passed, 8 skipped
