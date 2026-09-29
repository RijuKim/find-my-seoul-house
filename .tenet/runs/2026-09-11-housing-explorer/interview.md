# Interview: 부둥부둥

Date: 2026-09-11
Mode: Full
Rounds: 3 (in progress)

## Mode Selection
- Prompt shown: Previous session initialized Tenet; user independently requested Full mode on resumption.
- User response: "재실행했는데 full modefh 계속해주라"
- Selected mode: full
- Selection basis: explicit_user_choice

## Clarity Score
- Latest verdict: ca22b07d-0b4f-4e51-ab46-e26237740134; goal .85, constraints .8, success .85; clarity .835; passed true. Prior failures below are preserved history.
- Independent validation job: 5d4f9926-24aa-485f-b9c8-ba0824b1eb79, retry 1 after provider fallback.
- Goal: 0.7 (weight 0.4)
- Constraints: 0.6 (weight 0.3)
- Success criteria: 0.6 (weight 0.3)
- Total: 0.64 / 0.8 required; passed: false.
- Gaps: user confirmation of acceptance/persistence/empty behavior; measurable targets; stack versions; scaling scope.

## Round 1

### Prior Conversation and Confirmed Decisions
- User chose the name 부둥부둥.
- User wants asset/income-based exploration of housing in selectable Korean regions.
- User accepted starting without login.
- User wants a website and eventual Apps in Toss presence; standalone mobile apps are a future possibility.
- User explicitly pivoted away from live listings and sales-dependent data partnerships to actual transaction data, combining fun exploration with realistic context.
- Initial transaction modes: sale and jeonse. User explicitly expanded initial property types to apartments, villas (row/multi-family units: 연립·다세대), and houses (단독·다가구).
- Default geography: request current location with a short purpose explanation, resolve to city/county/district, and allow manual region changes. If permission is denied or location fails, offer manual region search. Exact coordinates are not stored.
- Query period: recent one year; counts refer to matching transaction records, never active listings or unique available homes.
- Design: warm and approachable Korean UI, with clear monetary figures and transaction evidence.
- Product differentiator: a concise interpretation headline, two or three supporting numbers, then underlying property/transaction details. Explain cash remaining, monthly payment assumptions, space differences and region/age/type tradeoffs.
- Interpretation is deterministic and evidence-based. Do not infer neighborhood quietness, safety, rental-deposit protection, suitability for families, orientation, or other unsupported attributes.
- User has no public-data API key yet and accepted starting with explicitly labeled synthetic sample transactions; later server-side API integration must never leak keys into chat, client code or version control.
- Inputs accepted: available housing cash and gross annual income; optional existing debt and adjustable monthly burden assumptions.
- Results must distinguish historical transactions from available listings and hypothetical financing from approved lending.
- User requested Tenet and explicitly selected Full mode.

### Questions Asked
- Full/agile and worker-tier questions were answered explicitly (see decisions below).
- UI direction: user accepted a warm, approachable design with clear figures.
- Region/type scope: user requested location-first defaults, manual override, and villas/houses as well as apartments.
- Data access: user stated no API key; accepted an explicitly labeled sample-first implementation.
- Differentiation: user requested concise, impactful interpretations rather than a plain property-detail list; accepted evidence-based cash/space/tradeoff explanations.

### Decisions Made
- [decision-only] Build a historical transaction-based housing possibility explorer, not a current listing aggregator.
- [decision-only] Continue through Tenet Full mode.

### Current Resolution (supersedes earlier open questions)
- React + TypeScript, supporting packages, mobile web first and no initial database were explicitly approved by user ("좋아."). Toss submission and standalone native releases remain later work.
- Round 3 confirmed reset-on-reload and actionable empty/error states. These are no longer open questions.
- User approved preparing the sample-first preview on the consolidated criteria. Numeric verification thresholds and package pins are routine engineering decisions, not missing product intent.

## Delivery Mode Decision
- Prompt shown: agile delivers small working slices with user feedback; autonomous implements and verifies the whole agreed specification in one continuous run.
- User response: "좋아 agile로 가자."
- Selected delivery_mode: agile
- Selection basis: explicit_user_choice

## Model Tier Decision
- Prompt shown: frontier uses goal-oriented jobs; local uses smaller explicit jobs.
- User response: frontier accepted; design by the host agent, implementation by OpenCode DeepSeek. Latest correction: deepseek-v4.1-flash:cloud.
- Selected model_tier: frontier
- Selection basis: explicit_user_choice
- Decomposition adjustment: smaller bounded jobs with explicit inputs, outputs and acceptance criteria for the selected implementation model.
- Originally selected model: ollama/deepseek-v4.1-flash:cloud; provider denied access during rollout (403).
- User explicitly authorized temporary fallback: "뭐야 그러네 ㅠ잠시 바꿔서 계속하자."
- Active project OpenCode model and persisted Tenet arguments: ollama/deepseek-v4-flash:0731-cloud. Reuses existing global ollama provider and authentication.
- Direct OpenCode smoke request returned OK with exit code 0 on 2026-09-11. This verifies basic provider access, not implementation or tool-use quality.
- User restarted Tenet; retry 1 completed on 2026-09-11 with the fallback model. Provider access is working; the validation returned content gaps rather than an execution failure.

## Summary
Tenet MCP is connected and healthy. Greenfield doctrine remains deferred until interview clarity passes. No implementation jobs have been registered or started.

## Round 2

### Questions Asked
1. React + TypeScript, supporting packages and mobile web without a database for the first slice?
   > User: "좋아."
2. Should assets/income be kept only in memory and reset on reload, or remembered on this device?
   > Initially unanswered; subsequently EXPLICITLY CONFIRMED in Round 3 consolidated acceptance ("좋아 준비해줘"). Reset on reload is the current decision.

### Implementation Defaults (engineering choices within approved sample scope)
- Vite SPA, local preview first; no public deployment or Toss submission in this run.
- Explicit sample mode with synthetic records and a fixed example-date label, never silent sample fallback after an upstream failure.
- Pure finance and interpretation functions, independent of React and future server adapters.
- No automatic region expansion, budget increases or lending eligibility claims when there are no matching records. Offer explicit region/budget edits.
- Standard web geolocation timeout/failure is recoverable through manual region search; no IP geolocation fallback.
- Sample-first acceptance is local browser use. API credentials, deployment account, and live-data national ingestion are not prerequisites for the sample slice. Subsequent live integration remains dependent on API access.
- Loan assumptions are editable illustrative scenarios; annual income supports a user-adjustable payment budget and is never treated as sufficient underwriting data. This elaborates the already accepted "선택한 대출 조건", "예상 월 부담", and "실거래 사례" behavior, not a live lending product.

### Acceptance Scenarios (confirmed through Round 3)
1. Enter available funds and annual income, choose sale or jeonse, and see matching sample transactions grouped into apartment/villa/house counts.
2. Every result has a concise evidence-grounded interpretation, numeric support, property basics and visible sample/historical labeling.
3. Change funds or region and observe recalculated results; inspect calculation assumptions and interpretation evidence.
4. Deny location permission or encounter timeout and continue through manual selection without reloading.
5. Zero results, invalid amounts and missing property fields have honest actionable UI; no invented attributes or replacement of errors with zero counts.

## Round 3

### Independent Review Follow-up
The failed clarity gate is preserved above. Do not proceed to specification or implementation until revalidation passes.

### First-Slice Acceptance Contract
- User can enter housing funds and gross annual income, select sale/jeonse and a sample region, then filter apartment/villa/house examples and inspect the evidence for each interpretation.
- All figures are synthetic and visibly labeled. Fixture coverage: at least 3 named sample districts, all 3 property types and both transaction modes; fixture coverage is not presented as nationwide data availability.
- At least 18 sample records spanning those dimensions, plus deliberately empty and missing-field cases. Counts equal the filtered records, not property inventory.
- Inputs are in memory only; reload clears funds, income and exact location. No analytics, user profiles, asset/income network transmission or persistent browser storage in the first slice.
- A denied/failed location request opens manual selection. Because live administrative lookup is not yet connected, the first slice must explicitly offer sample regions and must not invent a current district. Real location-to-district mapping remains a later capability; show this scope in the initial agile plan for user approval.
- No matching records: show zero and offer region/condition edits. Never automatically expand the search or raise the user's budget.
- Interpretation evidence opens in one action; amount/region changes update local results within 500 ms for 1,000 synthetic records on the development machine. This is a proposed verification target, not a measured result.
- Layout acceptance: 360 px mobile and 1280 px desktop; keyboard access and readable inline errors. Initial runtime is single-user local preview, not a production concurrency/SLA promise.
- React 19.3.0 and TypeScript 7.0.2 were reported by npm metadata on 2026-09-11; compatibility must be checked before installation. Exact supporting tool versions will be pinned in the eventual spec/lockfile, not treated as user preference questions.

### User Confirmation — CURRENT AUTHORITATIVE STATE
User was shown a consolidated contract: input cash/income; sale/jeonse and all three housing types; interpretation evidence; reset on reload; sample districts first and real location next; explicit empty-state edits without budget inflation. User replied "좋아 준비해줘", approving preparation of the first mockup under these criteria. Technical values above remain agent-selected implementation targets, not fabricated user answers.

### Engineering Clarifications
- Initial deliverable: local clickable design preview, then local React implementation following the agile plan checkpoint. No hosting account or production SLA is needed for this explicitly approved sample-first stage.
- Inputs: cash and annual income are nonnegative integer KRW; blank/negative/non-finite amounts show an inline error and do not compute. Existing monthly debt payments default to zero and are editable.
- Illustrative financing defaults: annual interest 4%, sale term 30 years, gross monthly income payment allocation 25%, editable fixed borrowing ceiling 200 million KRW and max financed share 70%. These are labeled demonstration assumptions, not Korean lending limits, market rates or bank approval. Reserve funds and extra transaction costs are editable KRW amounts, default zero with explicit "비용 미반영" disclosure.
- Sale calculation uses the lower of payment-affordable principal, explicit borrowing ceiling and financed-share limit; a candidate passes only when cash after reserve/costs plus that loan covers its price. Zero income permits cash-only cases. Zero interest uses principal/months.
- Jeonse scenario uses interest-only monthly cost with the same explicitly hypothetical principal limits, never sale amortization. At zero interest the monthly-interest cap does not constrain principal; ceiling and financed share still do. Deposit recovery/guarantee safety is not assessed.
- Missing area/build year is labeled unknown and excluded from comparisons requiring it. Comparisons name the baseline and use like-for-like area measures; house building area is not silently treated as an apartment unit's exclusive area.
- Performance numbers are prospective pass/fail checks (500 ms recomputation for 1,000 local fixtures), not claims already measured. Responsive widths 360 and 1280 px are test cases for the approved mobile web.
- No pending user-facing product question blocks preparing the requested design preview. Previous questions/failed scores are history, superseded where explicitly resolved above.
