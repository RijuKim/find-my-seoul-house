# Interview: 부둥부둥 주택 유형·단지 규모 필터

Date: 2026-10-07
Mode: Standard
Rounds: 1

## Mode Selection
- Prompt shown: Standard recommended for existing app filter improvement plus data coverage investigation.
- User response: 응 그렇게 해줘.
- Selected mode: standard
- Selection basis: explicit_user_choice

## Clarity Score
Initial validation 0.726 failed (stale model preference snapshot and underspecified outcomes). Gaps addressed in Round 2. Fresh retry: goal 0.90, constraints 0.90, success 0.90, total 0.90, passed=true, job 5ab4e658-040b-483e-a2d3-f40e3440a1b1. Final copy and live audit delegated to implementation.

## Round 1
### Questions Asked
1. User requested apartment/villa/multifamily filtering and identification of apartments with fewer than 100 households OR one building; is the proposed staged approach acceptable?
   > 좋아 그렇게 하자.
2. Standard implementation mode for this scope?
   > 응 그렇게 해줘.
3. Frontier or local implementation model tier?
   > 모델은 opencode ollama deepseek에 적용된거 확인하면 돼. 0731은 지원 종료로 바뀌었을거야.
4. Include or exclude small/single-building complexes?
   > No optional preference reply after reasonable opportunity. Proceed with both inclusion/exclusion using host-authorized best judgment; this is not a permission gate. User subsequently asked to continue.

### Decisions Made
- Improve visibility of existing apartment vs villa/multifamily grouped selection; do not fabricate a villa vs multifamily distinction.
- Audit actual household/building-count availability before shipping scale filters.
- Expose separate factual conditions: households <100, buildingCount=1, missing scale information. No ranking and no definitive lifestyle label.
- Preserve first-search latency by separating optional scale lookup from recentTrades. No new infrastructure/dependencies, no financial input storage or transmission.
- Maintain React/Vite/Express/tRPC architecture and Vercel serverless compatibility. Current HANDOFF and actual code supersede stale greenfield doctrine.
- Success: selection changes cards and map consistently; 99 qualifies, 100 does not; 1 building qualifies independently of household count; ambiguous/missing/failed lookups never imply large complex; default search does not wait for scale API.
- Use existing K-apt credentials server-side, aggregate public-data research only. No secret output. Bounded concurrency and request deduplication required.
- Work is authorized locally through validation; no production deployment or main push until requested.

### Remaining Ambiguities
- No blocking ambiguity. Optional UX choice defaulted to both. Data coverage is inherently incomplete and must be measured, not invented.

## Model Tier Decision
- Prompt shown: Frontier (recommended) or Local execution granularity.
- User response: Use the DeepSeek model already configured in OpenCode/Ollama.
- Selected executor: opencode, ollama/deepseek-v4.1-flash (verified in project and user OpenCode config).
- Selected model_tier: frontier (cloud model; goal-oriented decomposition default).
- Selection basis: explicit_user_choice of executor/model; tier granularity default.

## Runtime recovery
- Initial clarity job 5ab4e658-040b-483e-a2d3-f40e3440a1b1 failed before evaluation: pinned deepseek-v4-flash:0731 retired, HTTP 410.
- Updated Tenet opencode_args with official CLI to --model ollama/deepseek-v4.1-flash, matching existing OpenCode config.
- Tenet loads adapter args once on MCP startup (verified installed dist/mcp/index.js). Host-managed MCP restart required before retry; no self-start or pipeline bypass.
- No application implementation has started. Coverage research and interview artifacts preserved.

## Summary
Implement discoverable grouped type filters, investigate real K-apt coverage, add honest household/building scale filters with unknown states and separate loading. Test boundaries, matching, errors, caching, mobile/desktop interaction and existing budget/map/comparison flows. No recommendation ranking or production deployment.

## Round 2 — clarified implementation contract on resume
- User explicitly resumed: 재시작했어 계속해줄 수 있어? Work remains authorized. No repeated scope/permission question needed under host developer instructions.
- Preserve package.json versions: React 19.2.1, Vite 7.1.7, tRPC 11.6, Express 4.21.2, TypeScript 5.9.3, pnpm 10.4.1. No dependency additions.
- Performance acceptance: initial recentTrades request has zero scale/K-apt dependency; optional scale endpoint accepts max 12 candidates per request, max 3 simultaneous external fetches, each 5-second timeout, one attempt. Client uses sequential batches, aborts/ignores stale region/type responses, shows completed/total progress; no all-results wait hidden as empty success. A batch is bounded by a 25-second total budget, unresolved items become unavailable. No absolute guarantee about public upstream latency.
- UX: 44px targets, readable wrapping at 360px, no horizontal page overflow; 1280px desktop keeps existing result grid. Semantic selected state on type controls. One grouped villa/multifamily option with explanatory copy.
- Scale logic is tri-state. With OR criterion, a known matching field yields true even if the other is absent; false requires both known and nonmatching; otherwise unknown. Exclusion shows only confirmed false apartment records; villas bypass apartment scale predicate. Explicit information-missing view shows apartments unknown for selected criterion, not pending requests.
- Default mode all makes no scale calls. Choosing only/exclude/unknown triggers scale lookup; pending results are not labeled final unknown. Progress visible, partial confirmed results may display with incomplete notice. Network failure preserves base search, shows retry/reset actions, never silently classifies all items as large or truly absent.
- Test examples: h=99,b=2 true; h=100,b=2 false; h=250,b=1 true; h=null,b=1 true; h=150,b=null unknown for OR; both null unknown; zero/NaN/negative/noninteger values invalid; duplicate or fuzzy name match unknown.
- Coverage investigation acceptance: document sample method/denominator, separate legacy returned values from strict identity confidence, report both-count/one-count/missing counts. No minimum percentage needed to ship explicitly incomplete experimental scale filtering. Nine production sample observations recorded in research/coverage.md (5 both, 1 buildings-only, 3 not found). A strict live audit will additionally be run with new matcher or honestly marked unavailable if credentials fail.
- Design decision within authorized existing-app scope: retain palette/components, choose wrapping chip controls (visuals/2026-10-08-01-mockup-chips.html) and interactive prototype (04). No new visual redesign approval required per host instructions for routine reversible choices.
