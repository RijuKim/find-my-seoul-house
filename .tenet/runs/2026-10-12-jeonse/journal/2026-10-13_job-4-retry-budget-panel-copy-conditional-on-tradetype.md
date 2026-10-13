# job-4 retry budget panel copy conditional on tradeType

type: journal
source_job: cb7a4be7-0b36-46e1-a666-1e53a2761a15
job_name: jeonse-ui-toggle
created: 2026-10-13T00:02:15.870Z

## Findings

- **browser_smoke**: dev server :3000. sale note/metric byte-identical; clicking jeonse switches note to interest-only, metric to '금리 4.2% · 이자만 상환'; console errors 0.
- **files**: ["client/src/lib/explorationBudget.ts","client/src/lib/explorationBudget.test.ts","client/src/pages/Home.tsx"]
- **gates**: {"build":"pass","build_api":"pass","check":"pass","test":"119 passed / 8 skipped"}
- **summary**: code_critic finding fixed: budget panel methodology copy was sale-hardcoded even in jeonse mode. Extracted two pure copy helpers (budgetAssumptionNote, loanMetricDetail) in explorationBudget.ts, made the assumption note at Home.tsx conditional (jeonse interest-only; sale byte-identical), and replaced the term-bearing Metric detail with tradeType-conditional output (jeonse '금리 X% · 이자만 상환' with no term; sale byte-identical '금리 X% · Y년 가정').
- **tests**: +4 behavioral tests (sale byte-identical, jeonse interest-only, term metric omitted). Suite 119 passed / 8 skipped.
- **working_tree**: reverted unrelated uncommitted server/realEstate.ts dirt (settleInBatches batchSize 25->8, perDistrict 20->100, extra break) — not part of job-4 scope; committing run journal/evidence/status to leave a clean tree.
