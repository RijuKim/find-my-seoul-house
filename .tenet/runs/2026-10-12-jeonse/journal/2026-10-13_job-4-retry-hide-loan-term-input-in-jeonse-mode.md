# job-4 retry hide loan-term input in jeonse mode

type: journal
source_job: cb7a4be7-0b36-46e1-a666-1e53a2761a15
job_name: jeonse-ui-toggle
created: 2026-10-13T00:10:05.256Z

## Findings

- **browser_smoke**: dev server :3000 — sale mode shows 4 budget fields incl 대출 기간; clicking 전세 hides 대출 기간 (3 fields), note '월 이자 상한을 기준으로 이자만 상환', metric detail '금리 4.2% · 이자만 상환'. 360px no horizontal overflow, console errors 0.
- **change**: Added pure helper showsLoanTerm(tradeType) returning tradeType !== 'jeonse'; Home.tsx conditionally renders the 대출 기간 BudgetField only when showsLoanTerm(tradeType) is true.
- **files**: ["client/src/lib/explorationBudget.ts","client/src/lib/explorationBudget.test.ts","client/src/pages/Home.tsx"]
- **gates**: {"build":"pass","build_api":"pass","check":"pass","test":"121 passed / 8 skipped"}
- **sale_identical**: showsLoanTerm('sale') === true so sale JSX/DOM unchanged.
- **summary**: In jeonse mode the budget panel's 대출 기간 (loan term) input is now hidden because interest-only repayment ignores the term; sale mode rendering is byte-identical (field still rendered).
- **tests**: +2 behavioral tests (sale shows term, jeonse hides term) in explorationBudget.test.ts.
