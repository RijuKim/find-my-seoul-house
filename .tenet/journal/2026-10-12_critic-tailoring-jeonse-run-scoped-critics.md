# critic tailoring: jeonse run-scoped critics

type: journal
source_job: f7d7e309-6217-4892-b52c-f8ebc014fcee
job_name: eval-mv4miecl
created: 2026-10-12T04:02:19.545Z

## Findings

- **step0_orphan_sweep**: no run-scoped entries existed; no-op
- **step1_global_review**: only global custom critic 'security' (disabled, prompt file absent). Jeonse adds no auth/input surface, so it stays disabled for this run; no stale-scope note needed.
- **step2_run_scoped**: added 2 run-scoped critics: jeonse-classification (stage jeonse_classification_critic) for jeonse selection/price-mapping honesty and no-fabrication; jeonse-budget (stage jeonse_budget_critic) for interest-only budget path, zero-rate cap, and sale-mode regression. Built-ins code/test/interaction-e2e cover the rest.
