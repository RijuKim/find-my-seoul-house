# Interview: 부둥부둥 — 전세 거래 유형 추가

Date: 2026-10-12
Mode: Standard
Rounds: 1

## Mode Selection
- Prompt shown: "추천: Standard — 브라운필드에 기존 아키텍처가 확립되어 있고(Express+tRPC+React, 해석 레이어에 전세 로직 일부 이미 구현), 미지수는 전세 API 형태·예산 의미 정도라 Full의 전체 ceremony는 과합니다. 표준 인터뷰(3~5문답) 후 autonomous 단일 런으로 진행."
- User response: Standard (Recommended)
- Selected mode: standard
- Selection basis: explicit_user_choice

## Clarity Score
- Goal: 0.9 (weight 0.4)
- Constraints: 0.85 (weight 0.3)
- Success criteria: 0.9 (weight 0.3)
- **Total: 0.885 / 0.8 required (PASS)** — 1차 0.783 FAIL, 갭 해소 후 재검증 통과.
- 비차단 잔여: 전월세 API 실제 필드명/엔드포인트 라이브 미확정, 갱신 필드 값 형식, UI 응답시간/스케일링 목표 미수치화, 정확한 패치 버전 미핀.

## Round 1

### Questions Asked
1. 전세 기능의 주택 유형 범위를 어떻게 할까요?
   > 아파트+빌라·다세대 전세 (매매와 동일 범위)

2. 매매/전세 전환 UI는 어떻게 할까요?
   > 거래 유형 토글 분리 (상단 매매|전세 토글, 주택유형 칩과 독립)

3. 전세의 "예산 안" 판정 기준은?
   > 이자만 상환 기준 (기존 `jeonsePaymentAffordablePrincipal` 재사용)

4. 전세 데이터 소스와 정의를 확인해 주세요.
   > 국토부 전월세 실거래 API 사용 — 아파트 `RTMSDataSvcAptRent`, 연립·다세대 `RTMSDataSvcRHRent`. 전세 = 월세액 0이고 보증금 > 0, 보증금을 가격으로 사용.

5. 전세 데이터의 한계·엣지는 어떻게 처리할까요?
   > 정직하게 제외/표기 — 월세>0·보증금 0·계약갱신(갱신요구권) 등은 전세에서 제외하거나 "정보 없음" 표기, API 실패는 재시도/부분 표기, 샘플 대체 금지.

(추가) 구현 job 실행 모델 계층?
   > local

### Decisions Made
- 범위: 아파트 + 연립·다세대 전세. 거래 유형은 매매/전세 이분. 월세·반전세는 범위 밖.
- UI: 상단 거래 유형 토글(매매|전세)을 주택 유형 칩과 분리해 신설.
- 예산: 전세는 이자만 상환 구조로 보증금 상한을 계산한다. `evaluateFeasibility`의 `jeonse` 분기와 `jeonsePaymentAffordablePrincipal`을 재사용한다.
- 데이터: 국토부 전월세 API. 전세 판정 = `monthlyRent == 0 && deposit > 0`. 가격(`priceWon`/`priceMan`)은 보증금(deposit)으로 매핑한다.
- 정직성: 전세로 볼 수 없는 레코드(월세>0, 보증금 0/누락)는 제외하며 샘플로 대체하지 않는다. 계약갱신 데이터는 중복 위험을 고려해 다룬다(아래 잔여 모호성). API 실패는 부분 결과 + 실패 사유 표기, 기존 매매와 동일 원칙.
- 기존 정직성 원칙 유지: 랭킹/점수 금지, 근거 없는 통계 금지, 입력값 브라우저 메모리 전용, 결정적 해석, 매물로 오인 금지(실거래 = 과거 신고).
- 기술 제약(기존 승계): React19+Vite7+Tailwind4+shadcn, Express+tRPC, TS strict, pnpm. 서버 키는 서버 전용, 인메모리 캐시(인스턴스 재활용). Vercel 서버리스 + 로컬 양쪽.
- 보안: 금전 입력값은 브라우저 메모리만, 저장/전송 없음. 서비스키는 서버 환경변수만. 신규 입력 표면 없음.
- 통합: 신규 외부 의존은 국토부 전월세 API 2종(기존 `MOLIT_SERVICE_KEY` 재사용, API별 활용신청 여부 확인 필요).

### Follow-up Clarifications (clarity-gate gap closure)
6. 계약갱신(갱신요구권) 전세 레코드 처리?
   > 갱신 계약 제외 — `useRRRight`(갱신요구권 사용) 또는 종전계약(`preDeposit`/`preMonthlyRent` 존재) 레코드는 전세 결과에서 제외해 동일 보증금 중복 계상을 막는다.
7. 전세 예산 구조 확정?
   > 매매와 동일 구조, 이자만 — `loanCap = min(이자만상환 원금, LTV비중×보증금)`; 탐색 예산 `total = savings + 이자만상환 원금`(LTV 상한 `ltvCapPrice` 적용). 상환 공식만 원리금균등 → 이자만으로 교체.
8. 기존 매매 UI 필터의 전세 적용?
   > 필터 승계 + 전세 고지 — 가격상한·정렬·평형 버킷은 그대로 적용(가격 = 보증금). "전세 실거래(과거 신고)", "월세는 제외" 고지를 전세 모드에서 조건부 표시.

### Concrete Acceptance Criteria & Contracts
- **전세 판정**: `monthlyRent == 0 && deposit > 0` 이고 갱신/종전계약이 아닌 레코드만 전세로 채택. 그 외(월세>0, 보증금<=0/누락, 갱신)는 제외하며 샘플로 대체하지 않는다.
- **가격 매핑**: `priceMan = deposit`(만원), 해석 입력 `priceWon = deposit * 10000`.
- **예산(전세)**: `evaluateFeasibility`의 `jeonse` 분기 사용. 탐색 `budget.total`은 `savings + jeonsePaymentAffordablePrincipal(monthlyBudget, rate)`을 `ltvCapPrice`로 상한. `neededLoan = max(deposit - usableCash, 0)`, `loanCap = min(이자만상환 원금, loanCeiling, deposit × financedShare)`, `feasible = neededLoan <= loanCap`, 월 부담 = `borrowedLoan × rate / 12`(이자만).
- **금리 0 전세**: `jeonsePaymentAffordablePrincipal`는 `+∞` 반환하며 LTV 상한(`deposit × financedShare`)이 유한 상한을 제공(기존 테스트 `interpretation.test.ts:70,163` 근거).
- **정량 성공 기준**:
  - 기계: `pnpm check` clean, `pnpm test` 전체 통과(신규 전세 테스트 포함), `pnpm build`, `node scripts/build-api.mjs` pass.
  - 단위: 전세 판정 경계(월세 0/1, 보증금 0/양수, 갱신 제외), 전세 예산 수치(독립 기대값), 토글별 `tradeType` 매핑.
  - 라이브: 키가 있으면 아파트 전세 표본 1개 구에서 보증금>0·월세0 레코드 ≥1 조회(실응답 근거); 없으면 스킵 명시.
  - 성능/호출 예산: 기본(매매) 로드에서 전월세 API 호출 0. 전세 조회는 기존 배치 규약 준수(요청당 `numOfRows`, 배치 간 150ms, 요청 타임아웃 8s, 429 백오프 최대 4회, `limit` 240).
  - 브라우저: 360/1280에서 거래 유형 토글 동작, 매매↔전세 전환 시 필터·정렬·지도 카운트 일관, 수평 오버플로 없음, 콘솔 에러 0.
- **API 실패 계약**: 개별 구/유형 실패는 부분 결과 + `requestFailures` 집계 + `failureReason`/`sourceWarning` 표기(기존 매매와 동일). 캐시 히트 시 재호출 없음(인메모리 10분, 인스턴스 재활용 한정 명시).
- **API 필드/엔드포인트 검증**: `[scanned-not-verified]` 상태를 구현 시 credential-gated 라이브 테스트로 확정(실제 키 이름·엔드포인트). 미확정 시 매매와 동일 파서로 방어적 키 후보(`deposit`/`monthlyRent`/`보증금액`/`월세금액`) 처리.
- **보안**: 신규 입력 표면 없음. 서비스키 서버 전용. 금전 입력은 브라우저 메모리만, 저장/전송 없음(기존 승계).
- **정직성**: 랭킹/점수·근거 없는 통계 금지, 실거래=과거 신고, "매물" 오인 금지, 빈 결과/오류/미지 필드 정직 표기.

### Remaining Ambiguities
- 전월세 API의 실제 필드명·엔드포인트명(라이브 검증 시 확정; 방어적 파싱으로 흡수).
- 갱신 판정 필드(`useRRRight` 등)의 실제 값 형식(라이브 확인; 부재 시 갱신 제외 규칙은 보수적으로 미적용하고 사유 기록).

## Delivery Mode Decision
(Standard mode — autonomous. Section intentionally omitted.)

## Model Tier Decision
- Prompt shown: "구현 job을 실행할 모델 계층은? (분해 granularity에만 영향) — local vs frontier"
- User response: local
- Selected model_tier: local
- Selection basis: explicit_user_choice

## Summary
부둥부둥에 **전세 거래 유형**을 추가한다. 상단에 매매|전세 토글을 신설해 거래 유형을 전환하고, 전세 선택 시 국토부 전월세 실거래 API(아파트 `RTMSDataSvcAptRent`, 연립·다세대 `RTMSDataSvcRHRent`)에서 보증금 기반 전세 레코드를 가져온다. 전세 판정은 월세 0 + 보증금>0이며 보증금을 가격으로 사용한다. 예산 판정은 이자만 상환 구조(`jeonsePaymentAffordablePrincipal`)로 보증금 상한을 계산한다. 기존 정직성 원칙(실거래=과거 신고, 랭킹/통계 금지, 입력값 비저장, 결정적 해석, 샘플 대체 금지)을 그대로 유지한다. 아키텍처는 기존 스택을 승계하며 신규 외부 의존은 전월세 API 2종뿐이다.
