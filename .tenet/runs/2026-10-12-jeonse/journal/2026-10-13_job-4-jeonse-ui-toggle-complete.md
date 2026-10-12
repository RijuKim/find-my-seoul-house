# job-4 jeonse-ui-toggle complete

type: journal
source_job: cb7a4be7-0b36-46e1-a666-1e53a2761a15
job_name: jeonse-ui-toggle
created: 2026-10-13T00:00:00.000Z

## Findings

- **deliverable**: 상단 거래 유형 토글(매매|전세) 추가(44px·키보드 포커스·aria-pressed), `recentTrades`/`interpretationRecords`에 `tradeType` 배선(하드코딩 'sale' 제거), 전세 이자만 탐색 예산(`computeExplorationBudget`), 전세 고지("전세 실거래(과거 신고)", "월세는 제외"), `docs/HANDOFF.md` 전세 상태·한계 반영.
- **files**: client/src/pages/Home.tsx, client/src/index.css, client/src/lib/explorationBudget.ts (new), client/src/lib/explorationBudget.test.ts (new), docs/HANDOFF.md
- **budget**: `total = floor(min(savings + repaymentLoan, ltvCapPrice)/500)*500`. jeonse `repaymentLoan = jeonsePaymentAffordablePrincipal`. 금리 0 전세는 +Infinity이지만 LTV 상한과 min되어 유한(기본 24000/70% → 79,500만원). 매매 경로 불변.
- **gates**: `pnpm check` clean, `pnpm test` 115 passed / 8 skipped (explorationBudget 8 신규), `pnpm build` pass, `node scripts/build-api.mjs` pass.
- **browser smoke** (fixture-routed, 1280/360): 토글 버튼 매매/전세 각 44px, 기본 sale(tradeType=sale), 전세 클릭 시 tradeType=jeonse 재조회, 전세 고지 표시, 카드 수 유지, 오버플로 없음, 콘솔 에러 0.
- **note**: 생성 shadcn 컴포넌트 미수정. 거래 유형 전환 시 이전 비교 선택 초기화(필터 오염 방지). 주택 유형 칩·규모 필터 상태는 거래 유형과 독립.
