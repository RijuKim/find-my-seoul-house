---
delivery_mode: autonomous
---
# 전세 거래 유형 (Jeonse transaction type)

## Purpose
부둥부둥 예산 탐색기에 **전세** 거래 유형을 추가한다. 사용자가 매매↔전세를 전환해, 국토부 전월세 실거래(보증금)를 과거 신고 사례로 예산 범위 내에서 탐색·비교할 수 있게 한다. 정직성 원칙(실거래=과거 신고, 랭킹/통계 금지, 입력값 비저장, 결정적 해석, 샘플 대체 금지)을 그대로 유지한다.

## Tech Stack and verified baseline
기존 `package.json`: React 19.2.1, Vite 7.1.7, TypeScript 5.9.3, Express 4.21.2, tRPC 11.6, React Query 5, Vitest 2, pnpm 10.4.1. **신규 의존성 없음.**
- `client/src/pages/Home.tsx` — 거래 유형 UI·예산·필터·카드/지도/비교를 소유. 현재 해석 입력에 `tradeType: "sale"` 하드코딩(Home.tsx:581). 탐색 예산 `budget.total = min(savings + 원리금상환상한, ltvCapPrice)`(Home.tsx:517-527). 해석 입력 `budgetInputs`는 `loanCeilingWon = MAX_SAFE_INTEGER`(Home.tsx:572). 주택 유형 칩/규모 필터 상호작용 Home.tsx:615+.
- `client/src/lib/interpretation.ts` — `TradeType = "sale" | "jeonse"`(13), `jeonsePaymentAffordablePrincipal`(121), `evaluateFeasibility`의 `jeonse` 분기(184-206) 이미 구현·테스트됨(`interpretation.test.ts` 27개, 전세 케이스 포함).
- `server/realEstate.ts` — 매매 엔드포인트 상수(3-6), `fetchMolitAptTrades`(82), `fetchRecentAptTrades`(102), 배치/백오프/캐시 유틸(`settleInBatches` 58, `fetchWithBackoff` 68, `regionCache` 101). 키는 `ENV.molitServiceKey`(83).
- `server/routers.ts` — `realEstate.recentTrades` 공개 tRPC(36-63), `complexScales`(93).
- `api-src/trpc.ts` — 라우터 공유(Vercel 서버리스). `api/`는 esbuild 번들 산출물.

## API Endpoints
| Method | Path | Auth | Contract |
|---|---|---|---|
| GET | /api/trpc/realEstate.recentTrades | public | 확장: 입력에 `tradeType: "sale" \| "jeonse"`(기본 "sale") 추가. 나머지 입력/응답 형태 유지. |
| GET | /api/trpc/realEstate.districts | public | 변경 없음 |
| GET | /api/trpc/realEstate.complexScales | public | 변경 없음(아파트 규모 필터는 거래 유형 무관, 정체성 기반) |
| GET | /api/trpc/realEstate.complexInfo, nearbySignals, trendSeries | public | 변경 없음 |

- `recentTrades` 응답 레코드는 `priceMan`(전세에서는 보증금, 만원)과 기존 필드를 유지한다. 별도 `tradeType` 필드를 응답에 포함해 출처를 명확히 한다(선택).
- 검증: `tradeType`은 enum 2값. 그 외 입력 검증은 기존 유지.

## External integration (국토부 전월세)
- 신규 엔드포인트 상수: `MOLIT_APT_RENT_ENDPOINT` = `https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent`, `MOLIT_VILLA_RENT_ENDPOINT` = `https://apis.data.go.kr/1613000/RTMSDataSvcRHRent/getRTMSDataSvcRHRent` `[scanned-not-verified]` — 구현 중 라이브 응답으로 확정.
- 신규 `fetchMolitRentTrades`: 매매 함수와 병렬 구조, 공용 파서/유틸 재사용(`asArray`, `text`, `number`, `settleInBatches`, `fetchWithBackoff`). 요청 파라미터 매매와 동일(`serviceKey`, `LAWD_CD`, `DEAL_YMD`, `pageNo`, `numOfRows`, `_type=json`).
- **전세 판정**: `monthlyRent == 0 && deposit > 0` 이고 갱신/종전계약이 아닌 레코드만 채택. 그 외(월세>0, 보증금<=0/누락, 갱신) 제외. **샘플/추정으로 대체 금지.**
- **가격 매핑**: `priceMan = deposit`, 해석 입력 `priceWon = deposit * 10000`.
- **방어적 파싱**: 실제 키 편차 흡수 — 후보 키 `deposit`/`보증금액`, `monthlyRent`/`월세금액`, 단지명 `aptNm`/`mhouseNm`, 주소 `umdNm`/`jibun`/`roadNm`, 면적 `excluUseAr`, 연식 `buildYear`, 계약일 `dealYear/Month/Day`. 갱신 신호 `useRRRight`(갱신요구권 사용) 존재 시 제외; 필드 부재 시 제외 규칙은 보수적으로 미적용하고 사유 기록.
- `fetchRecentAptTrades`에 `tradeType` 파라미터 추가: sale이면 기존 매매 경로 그대로(회귀 없음), jeonse이면 전월세 경로. 캐시 키에 `tradeType` 포함.

## Database Schema
없음. DB/영속 저장 미사용(기존 승계). 인메모리 `regionCache`(10분 TTL, 인스턴스 재활용 한정)에 `tradeType` 포함 키로 저장. 금전 입력값은 브라우저 메모리 전용.

## Design Direction
`.tenet/project/design.md`의 정직성/모바일 지침과 실제 `client/src/index.css` 팔레트를 따른다. 기존 화면 요소 재사용, 별도 리디자인 없음.
- **거래 유형 토글**: 주택 유형 칩과 분리된 상단 토글(매매 | 전세). 최소 44px 터치 타깃, 키보드 포커스, 의미 라벨(`aria-label`/role) 보장(하우징 필터 수정 44px 규약 승계).
- **전세 조건부 고지**: 전세 모드에서 "전세 실거래(과거 신고)", "월세는 제외" 문구를 결과/소스 영역에 표시.
- 360px 수평 오버플로 없음, 1280px 기존 그리드 유지. 생성된 shadcn 컴포넌트(`client/src/components/ui/**`) 수정 금지.

## Auth Flow
1. 익명 브라우저가 검증된 공개 라우터를 호출(인증 없음).
2. 서버가 기존 `MOLIT_SERVICE_KEY` 환경변수로 국토부 전월세 엔드포인트 호출(키는 서버 전용).
3. 서버가 전세 레코드(보증금 기반) 반환 또는 부분 결과+실패 사유.
4. 금전 입력값은 브라우저 메모리에만. 저장/전송/분석 없음.

## Success Criteria
1. 상단 거래 유형 토글로 매매↔전세 전환 시 결과·카드·지도·비교가 일관되게 갱신된다. 기본(매매) 동작은 완전히 회귀 없음.
2. 전세 판정 경계 단위 테스트 통과: 월세 0/1, 보증금 0/양수, 갱신 제외, 면적/연식 누락 처리.
3. 전세 예산 수치가 독립 기대값으로 검증됨(`jeonsePaymentAffordablePrincipal`, 금리 0 → LTV 상한 유한; 이자만 월부담). 매매 예산 경로 불변.
4. 기본(매매) 로드에서 전월세 API 호출 0. 전세 조회는 기존 배치 규약(요청당 numOfRows, 배치간 150ms, 요청 타임아웃 8s, 429 백오프 최대 4회, limit 240)을 지킨다.
5. `pnpm check`, `pnpm test`, `pnpm build`, `node scripts/build-api.mjs` 통과. 브라우저 검증 360/1280에서 토글·필터·정렬·지도 카운트 일관, 오버플로 없음, 콘솔 에러 0.
6. 라이브(키 존재 시): 특정 구 아파트 전세 표본 ≥1건 실제 조회(실응답 근거). 키 없으면 명시적 스킵, 날조 금지.
7. 정직성: 전세 소스를 "전세 실거래(과거 신고)"로 표기, 월세 제외 고지, 빈/오류/미지 필드 정직 표기, 샘플 대체 없음. `docs/HANDOFF.md` 전세 상태·한계 반영.

## Out of Scope
월세/반전세(보증금+월세) 및 그 예산 모델, 단독·다가구(`RTMSDataSvcSHTrade`/SHRent), 위치권한 기반 구·시 자동 해석, 랭킹/추천점수, 서버리스 캐시 외부 KV 이전, OG 이미지, 프로덕션 배포/push, 신규 의존성·시크릿 커밋, 무관한 비교/규모 로직 변경.
