# future feature: affordability comparison across trade types

type: knowledge
source_job: f7d7e309-6217-4892-b52c-f8ebc014fcee
job_name: eval-mv4miecl
confidence: decision-only
created: 2026-10-12T04:02:17.395Z

## Findings

- **compliant_reframing**: Frame as 'affordability comparison' not 'recommendation': deterministically show factual max price/deposit and estimated monthly burden per trade type side-by-side; let the user choose. Priorities (price/area/age/commute) may reorder or emphasize factual fields only when the user declares them; no composite score or quality judgment. Location uses measured 입지 신호 distances/counts only. Always label past-reported transactions, never imply current listings.
- **origin**: user idea raised 2026-10-12, deferred to a future run (not folded into the jeonse run)
- **principle_conflict**: Directly conflicts with project iron laws: no ranking/recommendation scores, no evidence-free statistics, past transactions are not listings, deterministic reproducible interpretation with explicit references.
- **raw_idea**: Recommend 매매/전세/월세 and a housing option based on the user's cash/income/loan inputs, with condition-focused / location-focused / price-focused modes; user choice is paramount but the app advises when the user is undecided.
- **scope_note**: Needs a 월세 (deposit + monthly rent) budget model plus cross-trade-type comparison and a priority UI — larger than the jeonse toggle run.
- **status**: queued for future run; not started
