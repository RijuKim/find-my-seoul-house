# Quality contract
## Commands
Implementation supplies npm run dev (127.0.0.1:5173), build, typecheck and test. Strict TS; no any/ts-ignore. Exact lockfile. Pure node:test via supported TS stripping or compiled tests; no unnecessary test framework.
## Test strategy
Unit: actual pure math with independently calculated expected values; zero rate/income, fees/reserve, cap/share, jeonse branches.
Integration: sample fixtures with period/cancellation/unknown fields/counts.
Browser Layer 2 REQUIRED via Playwright MCP at 360x800 and 1280x900: inputs, submit, type/trade/region, details, reset, invalid/empty states; keyboard focus, no overflow/console errors/persistent storage/financial network payload.
Prototype: self-contained HTML and functional controls, labeled synthetic values. Prototype arithmetic does not substitute for implementation verification.
Actual geolocation/source API mocked or deferred in slices 1/2; no live-success claims. Slice 3 needs actual access and fresh readiness.
Performance: 1,000 local fixture recomputations <=500ms, record environment.
## Danger zones
No sibling/global configuration, credentials, .agents/.codex/.git internals, runtime DB manual edits or public deployment. Preserve worker configuration. Normal jobs cannot edit .tenet/project/**; proposals go in run journal.
## Iron laws
Korean copy, evidence-grounded interpretation, area-basis integrity, no lending/safety/listing claims, no invented current district, no silent sample fallback. User financial data stays in memory. Every implementation goes through Tenet and independent eval.
## Gates
Initial agile plan approval before readiness/decomposition. Browser/dev server shared -> sequential eval. No implementation exists yet.
