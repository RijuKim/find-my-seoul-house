# job-3 jeonse interpretation hardening

type: journal
source_job: a7d906e4-2ee8-4e22-8343-428563eab4ef
job_name: jeonse-interpretation
created: 2026-10-12T23:41:52.195Z

## Findings

- **commands**: {"pnpm check":"pass","pnpm test":"107 passed | 8 skipped (115); interpretation.test.ts 34 passed"}
- **defect_found**: At rateAnnual 0, evaluateFeasibility jeonse branch returned paymentAffordablePrincipalWon = Infinity (jeonsePaymentAffordablePrincipal returns Infinity at 0%). loanCapWon/monthlyPaymentWon/verdict were already finite, but the informational field could surface an infinite value (anti-scenario: 금리0 전세가 무한대로 표시).
- **fix**: In the jeonse branch, report paymentAffordablePrincipalWon = loanCap when the payment-derived principal is not finite. Helper jeonsePaymentAffordablePrincipal still returns Infinity at rate 0 (its documented behavior, existing helper test unchanged).
- **summary**: Verified/hardened client/src/lib/interpretation.ts jeonse branch and extended interpretation.test.ts with explicit jeonse numeric cases + sale regression.
- **tests_added**: ["interest-only monthly burden independent expected (50M*4.8%/12=200000)","rate 0 -> every verdict field finite, loanCap/paymentAffordable = 200M","rate 0 LTV-binding infeasible (100M*0.3=30M cap)","deposit(priceWon) drives LTV cap (300M*0.7=210M)","jeonse interest-only cheaper than sale annuity on same principal","sale regression: annuity principal/monthlyPayment unchanged and finite","interpret labels jeonse burden 이자만 and prints no Infinity/NaN"]
