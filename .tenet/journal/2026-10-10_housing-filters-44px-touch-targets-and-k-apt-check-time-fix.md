# Housing filters 44px touch targets and K-apt check time fix

type: journal
source_job: 56a4a4a2-fb3c-4a61-814c-f3d141008ff7
job_name: blocking finding follow-up for Verify housing filters across API and mobile desktop UI
created: 2026-10-10T08:19:04.183Z

## Findings

- **changes**: ["client/src/index.css: .type-chip-group and .type-chip min-height 32px->44px; .scale-field select 36px->44px; .scale-retry/.scale-reset 32px->44px; added .scale-checked-at style","client/src/pages/Home.tsx: added formatCheckedAt helper; ScaleStatusBanner/ScaleControlPanel accept checkedAt; computed latest scaleCheckedAt from scaleResults over target identities; rendered check time in .scale-source-note","tests/acceptance/housing-filters.cjs: chip assertion 32->44; added >=44 assertions for .scale-field select (1280), .scale-reset (360), .scale-retry (failure); added K-apt check-time assertion"]
- **scope**: Limited to new filter controls; existing .select-control 32px untouched per finding scope. 360px no-overflow and wrapping preserved.
- **summary**: Resolved blocking finding: new housing-filter controls now meet 44px minimum; acceptance test enforces 44px; K-apt check time surfaced.
- **verification**: {"browser":"25/25 assertions pass at 1280x900 and 360x800, 0 console errors","check":"pnpm check clean","tests":"pnpm test 70 passed / 8 skipped"}
