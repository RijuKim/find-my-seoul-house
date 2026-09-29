---
delivery_mode: agile
---
# 부둥부둥 — 주거 가능성 탐색

## Purpose
내 자금과 소득으로 고려할 수 있는 주거 선택을 실거래 사례로 해석한다. 현재 매물, 대출 승인 또는 전세 안전성 판단이 아니다.

## Tech Stack
Approved React/TypeScript mobile web. Pin React/react-dom 19.3.0, TypeScript 7.0.2, Vite 8.3.0, Node 24.18.0. Plain CSS, semantic HTML; Vite JSX transform with jsx=react-jsx, no optional React compiler plugin. Matching @types packages resolved and locked during installation. node:test for pure functions. Registry metadata verified on paper; actual build pending. Sources: https://vite.dev/guide/ and https://react.dev/learn/build-a-react-app-from-scratch .
Greenfield: no app source exists; opencode.json and .tenet/.state/config.json define the chosen worker. No claims of implemented behavior.

## API Endpoints
| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| local | TransactionProvider.query | none | Slice 1/2 fixtures; no HTTP dependency |
| future GET | /api/transactions | upstream server key | Slice 3, contract/access review required |
| future POST | /api/region/resolve | resolver-dependent | Transient location to district, not designed as live yet |

Financial inputs never leave browser. Future transaction server only needs district/period/trade filters.

## Database Schema / in-memory contract
No database in first two slices.
| Entity | Fields | Constraints |
| --- | --- | --- |
| Scenario | cashWon,incomeAnnualWon,debtMonthlyWon,reserveWon,feesWon,rateAnnual,termMonths,allocationRatio,loanCeilingWon,financedShare | finite; amounts integer >=0; term >0; ratios [0,1] |
| Transaction | id,districtCode,districtLabel,propertyType,tradeType,priceWon,areaM2,areaBasis,builtYear,contractDate,name,provenance,cancelled | positive price; area/year nullable; areaBasis exclusive/building; apartment/villa/house; sale/jeonse |
| QueryResult | records,coverage,asOf,sourceMode | sample/live explicit; zero differs from unavailable |
| Interpretation | kind,headline,evidence[],referenceIds[] | every figure reproducible; named comparison baseline |

Fixtures: >=18 synthetic records, >=3 districts, all 3 property types and both modes; asOf 2026-09-11, date window 2025-09-12..2026-09-11 inclusive. Exclude cancelled; deduplicate source record IDs, not distinct legitimate contracts. Do not claim nationwide coverage of fixtures.

## Budget scenario
Demonstration defaults, NOT regulations or current market guidance: 4% annual interest, sale 360 months, 25% gross monthly income payment allocation, principal ceiling 200M KRW, financed share 70%, reserve/fees/debt zero. Display costs-not-included when fees=0. All editable in slice 2.
C=cash-reserve-fees; reject feasibility if C<0. M=max(0,income/12*allocation-debt).
Sale payment-affordable principal P=M*(1-(1+r)^(-n))/r, r=annualRate/12. Zero-rate branch P=M*n.
Needed loan N=max(price-C,0); cap=min(P,ceiling,price*share); feasible iff N<=cap. Only borrow N. Calculate amortized monthly payment from N; round displays, not early comparisons. cashRemaining=cash-fees-(price-N).
Jeonse uses interest-only cost, P=M/r; zero-rate payment cap infinite but explicit ceiling/share still apply. No deposit safety guarantee. Zero-income cash-only is valid.
Invalid blank/negative/nonfinite input -> inline error. Amounts are KRW internally, UI labeled 만원. No silent unit guessing.

## Interpretation
Cash-room: actual modeled cash remaining; monthly burden: payment and gross income allocation; space/age: compare same trade/type/area basis within +/-10% price, with explicit reference record.
Missing fields omit comparison; house building area never treated as apartment exclusive area. No legitimate baseline -> factual budget-gap headline. Never generate orientation, neighborhood quality, approval, safety or inventory claims.
Order by contractDate descending then id. No runtime LLM.

## Auth Flow
1. No login; show sample notice.
2. Inputs held only in memory; reload resets.
3. No analytics or financial network payload.
4. Later location follows explanation/permission with manual override; never store exact coordinates.

## Design Direction
Doctrine .tenet/project/design.md. Destination visuals/2026-09-11-01-final-product.html; architecture visuals/2026-09-11-00-architecture.html; walkthrough visuals/2026-09-11-05-prototype-walkthrough.html. Pending initial agile approval. Self-contained HTML is a design artifact, not implementation.

## Success Criteria
1. Correct type/trade/region filtered counts across synthetic fixtures.
2. Every card exposes interpretation, numerical support, historical date and sample labeling.
3. Reload resets funds/income; no persistent storage or financial transmission.
4. Errors, zero matches, unknown fields have honest actionable feedback.
5. Keyboard usability and no horizontal overflow at 360/1280px.
6. <=500ms local recomputation of 1,000 fixtures on development browser; measure during implementation.
7. No sample/live substitution or fictitious location success.

## Out of Scope
Listings, brokerage, loan underwriting, tax advice, safety ratings, auth, analytics, persistent finances, map, monthly rent/officetels, public deployment, Toss submission and native apps.

## Slice plan
Total slices: 3. Slice 3 deferred behind access/contract/readiness gates.

### Slice 1: 내 돈으로 보는 주거 사례
- **Adds**: Cash/income -> interpreted sample cards with filters/details.
- **Bundled with**: React setup, budget functions, 18+ fixtures, sample district choices, input/empty states.
- **User can**: Explore all three housing types for sale/jeonse locally.
- **Out of slice**: Real location/API, advanced scenario editing and comparisons.

### Slice 2: 선택을 바꾸면 생기는 차이
- **Adds**: Editable funding assumptions and explicit before/after comparisons.
- **Bundled with**: Comparison evidence rules; retains slice 1.
- **User can**: Change funds/reserve/region and compare named baselines.
- **Out of slice**: Live API/current-district lookup, deployment.

### Slice 3: 실제 거래와 내 동네
- **Adds**: Actual public transactions and real current district.
- **Bundled with**: Server credentials, 6 verified source contracts, paging/cancellation/coverage, resolver and permission/error/manual override.
- **User can**: Explore sourced records for selected/current district AFTER live verification.
- **Out of slice**: Publishing/Toss submission.
This slice is a future preview, NOT ready to dispatch. API key absent, resolver undecided. Research exact contracts/access and revalidate before implementation. First two slices remain independently usable.
