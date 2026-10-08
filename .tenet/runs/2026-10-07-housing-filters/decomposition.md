# Housing filters DAG

Mode: Standard, autonomous. Executor OpenCode/Ollama DeepSeek v4.1 Flash per user. Goal-oriented jobs.

```
housing-filters-implementation (dev)
             |
housing-filters-integration (integration_test, report_only)
```

## housing-filters-implementation
Dependencies: none. Implement coherent backend+frontend goal from spec, conservative scale matching and tri-state predicates, visible grouped types, lazy bounded metadata and honest statuses. Extend acceptance and mocked server tests; author browser MCP runnable acceptance script with page.route fixtures and perform actual browser360/1280 plus basic live smoke; run strict bounded live audit; update HANDOFF/K-apt docs and run evidence. Run mechanical checks and commit scoped changes, no push.

## housing-filters-integration
Depends on implementation and its mandatory eval pass. Read-only independent acceptance: run all relevant existing/new tests/build, runtime API and browser workflows at360/1280, inspect audit evidence. Report exact outcomes. Cannot edit application/test files; use blocking finding tool for product/test/harness gaps.

## Interface contracts
Pure client/src/lib/housingFilters.ts exports getScaleMatch(counts, criterion) returning boolean|null; counts optional positive integer households/buildingCount, criterion households|buildings|either. matchesScaleFilter(propertyType, match, mode) returns boolean, villa bypass, mode all|only|exclude|unknown. Prewritten acceptance test specifies independent boundary expectations. Worker may refine signatures only if tests preserve all semantic assertions.
New realEstate.complexScales public query contract per spec, array<=12, identity fields only, safe status per id and provenance. Client request generation ties results to identity, not stale region result ids. Card/map selection from same filtered array.

## Authorization
User already approved feature approach, Standard mode, executor and resumed work after model repair. Host developer instructions require continuing authorized reversible work without repeated confirmation; this supersedes skill's repeated visual/pre-execution checkpoints. Plan, visuals, tests and bounds are concrete and reviewable. No deploy/main push authorization inferred.

## Verification evidence
Clarity0.9 passed; readiness passed, sequential eval (shared browser/port). Baseline live sample9 documented. New acceptance pure tests intentionally initially fail missing module until implementation. Browser script authored/expanded as part of implementation with MCP so no new dependencies.
