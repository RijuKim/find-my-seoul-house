# Doctrine proposals — jeonse run (2026-10-12)

Append-only. Collected at run completion from bootstrap observations and run evidence.
The jeonse DAG passed (all dev jobs + final integration verification). The proposals
below reflect `.tenet/project/**` drift observed while bootstrapping this run.

## project/architecture.md — stale worker model + missing stack/deploy facts
- status: proposed
- current_claim: "React/TypeScript mobile web with Vite; ... Workers use Tenet/OpenCode ollama/deepseek-v4-flash:0731-cloud; host authors planning and design."
- observed_reality: executor is `ollama/deepseek-v4.1-flash` (the 0731 model was retired 2026-09-25, HTTP 410). The app is React 19 + Vite 7 + Tailwind 4 + shadcn/ui, Express + tRPC 11 backend, Vitest 2, pnpm 10, deployed on Vercel (serverless) with a local Express dev/prod path; sale + jeonse trade types.
- proposed_change: update the worker model line to `ollama/deepseek-v4.1-flash`; add the real stack, dual local/Vercel runtime, and current trade-type scope.
- rationale: doctrine is read by every run; a retired model name and missing stack facts mislead planning.

## project/overview.md — still described as greenfield/pending
- status: proposed
- current_claim: "Initial delivery is local mobile web without login. Greenfield implementation pending; ... No public deployment yet."
- observed_reality: brownfield, fully implemented, deployed at `budungbudung.vercel.app` (GitHub `RijuKim/find-my-seoul-house`). Features live: budget explorer, interpretation layer, Kakao map, location signals, comparison, housing type + apartment-scale filters, and now jeonse.
- proposed_change: replace the greenfield/pending framing with current brownfield status + deployed URL and implemented feature list.
- rationale: "greenfield pending / no deployment" directly contradicts the repo and docs/HANDOFF.md.

## project/testing.md — wrong framework + gates
- status: proposed
- current_claim: "Initial pure tests use node:test; setup not yet implemented."
- observed_reality: Vitest is the test framework (121 passed / 8 skipped at run end); browser acceptance is scripted via Playwright MCP-callable modules under `tests/acceptance/`; gates are `pnpm check`, `pnpm test`, `pnpm build`, `node scripts/build-api.mjs`.
- proposed_change: state Vitest + Playwright-MCP browser acceptance + the exact gate commands; drop the node:test reference.
- rationale: the framework claim is factually wrong and would send workers down the wrong path.

## project/design.md — stale component/provenance notes
- status: proposed
- current_claim: "No existing component examples. Initial standalone HTML design requires agile plan approval." and "Visible sample provenance".
- observed_reality: shadcn/ui components exist under `client/src/components/ui/` (CLI-managed); design tokens/palette live in `client/src/index.css`; provenance is now real data source + check time (K-apt/MOLIT), not a sample; there is no standalone-HTML agile gate in practice.
- proposed_change: note the existing component system + token file; replace "sample provenance" with real data-source/check-time provenance; drop the obsolete standalone-HTML approval note.
- rationale: aligns design doctrine with the actual brownfield UI conventions.

## project/product.md — partial scope note
- status: proposed
- current_claim: product mentions "sale/jeonse examples across apartments, villas (연립·다세대), houses (단독·다가구)."
- observed_reality: sale + jeonse are implemented for apartments + villas/연립·다세대; 단독·다가구 (houses) are NOT implemented (out of scope).
- proposed_change: mark 단독·다가구 as not yet implemented so the doctrine doesn't imply coverage.
- rationale: avoid implying a housing type that returns no data.
