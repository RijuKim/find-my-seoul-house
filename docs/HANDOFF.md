# 인수인계 (HANDOFF)

최종 갱신: 2026-10-07

부둥부둥(budungbudung) — 예산·소득으로 서울/경기 주거 선택지를 **과거 실거래 사례**로 탐색·비교하는 웹앱.

---

## 1. 현재 상태 요약

- **프로덕션 배포 완료**: https://budungbudung.vercel.app
- **GitHub**: `RijuKim/find-my-seoul-house` (public), 기본 브랜치 `main`
- **로컬 경로**: `~/projects/budungbudung`
- **Vercel 프로젝트**: `rijukims-projects/budungbudung` (Hobby/무료, GitHub 자동 배포 연결)
- 실거래·지도·해석·비교·입지 신호 모두 실데이터로 동작 확인 완료.

### 검증된 동작 (프로덕션)
| 기능 | 상태 |
| --- | --- |
| 국토부 실거래 조회 | 111건 (예산 7.95억 이내, 서울) |
| 예산 계산(저축+월상환+LTV) | 동작 |
| 결정적 해석 레이어(headline+evidence) | 동작 |
| 카카오 지도 | 타일 + 마커 111개 (카드와 1:1) |
| 입지 신호(상권/학군/교통) | 카카오 로컬 API 실데이터, 거리순 |
| 비교 리포트(3개) | 동작 |
| 콘솔 에러 | 0 |

---

## 2. 기술 스택 / 구조

- React 19 + Vite 7 + Tailwind 4 + shadcn/ui, Express + tRPC(서버), TypeScript strict
- 패키지 매니저: pnpm 10 (lockfile 커밋됨)
- 서버는 로컬(장기 실행)과 Vercel(서버리스 함수) 양쪽 지원

```
client/            React 화면 (Home.tsx가 메인, Map.tsx 지도, lib/interpretation.ts 해석)
server/
  realEstate.ts    국토부 아파트·빌라 실거래
  kapt.ts          K-apt 공동주택 단지정보
  buildingHub.ts   건축HUB 건축물대장(용적률)
  places.ts        카카오 로컬 API (상권·학군·교통)
  routers.ts       tRPC 라우터
  _core/           context, trpc, env, index(로컬 Express 진입), vite(로컬 dev)
api-src/trpc.ts    Vercel 서버리스 함수 소스 (fetchRequestHandler)
scripts/build-api.mjs  api-src를 api/trpc/[...trpc].js로 esbuild 번들
api/               빌드 산출물 (gitignore)
vercel.json        Vercel 설정
render.yaml        Render 대안 설정
docs/              DEPLOYMENT, data-sources, kapt-integration, HANDOFF
.tenet/            설계 문서(spec/harness/interview/visuals)
```

---

## 3. 실행 / 검증 명령

```bash
cd ~/projects/budungbudung
pnpm install
cp .env.example .env          # 키 입력 (아래 4절)

pnpm run dev                  # 로컬 개발 (Express + Vite HMR), 기본 3000
npx tsc --noEmit              # 타입체크
pnpm test                     # vitest (해석 27개 + 실거래 2개, 키 없으면 일부 skip)
pnpm run build                # vite build + 서버 esbuild (로컬 배포용)
node scripts/build-api.mjs    # Vercel 함수 번들(필요 시)

pnpm run start                # 프로덕션 서버 실행 (dist/index.js)
```

- 로컬 개발은 `http://localhost:3000`에서 카카오 지도가 뜨도록 등록돼 있음.
- 포트가 3000이 아니면 카카오 지도 도메인이 안 맞아 지도가 안 뜬다.

---

## 4. 환경변수 (`.env`, gitignore됨)

```
MOLIT_SERVICE_KEY          # 공공데이터포털 (실거래)
KAPT_LIST_SERVICE_KEY      # K-apt 단지 목록
KAPT_BASIS_SERVICE_KEY     # K-apt 기본·상세정보
BUILDING_HUB_SERVICE_KEY   # 건축HUB 건축물대장
VITE_KAKAO_MAPS_JS_KEY     # 카카오 JavaScript 키 (브라우저 노출, 지도)
KAKAO_REST_API_KEY         # 카카오 REST API 키 (서버 전용, 입지 신호)
```

- Vercel 대시보드에도 동일하게 등록되어 있음 (Production).
- `VITE_` 값은 **빌드 타임**에 번들에 심긴다 → 키 변경 시 재배포 필요.
- 공공데이터포털 키 4개는 같은 키를 쓰지만, **API별 활용신청**이 별도일 수 있음. 특정 단지에서 "매칭 정보 없음"이 뜨면 해당 API 활용신청 여부 확인.

---

## 5. 배포 절차

### Vercel (현재 사용 중)
GitHub `main`에 push하면 자동 배포된다. 수동 배포:
```bash
vercel deploy --prod --yes
```

**Vercel 주의사항 (겪었던 함정)**
1. Vercel CLI v62가 Vite+`api/`를 자동으로 "services"로 오감지 → 프로젝트 `framework`가 `services`로 생성되면 배포 실패. API로 리셋:
   ```bash
   TOKEN=$(node -e "console.log(require(process.env.HOME+'/Library/Application Support/com.vercel.cli/auth.json').token)")
   curl -X PATCH "https://api.vercel.com/v9/projects/budungbudung?teamId=team_jN7JAackJ82vks8oIGM837Y7" \
     -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"framework":null}'
   ```
2. Vercel 기본 api 번들러가 `server/*` 상대 import를 해석 못 함 → `scripts/build-api.mjs`로 esbuild 자체 번들 (이미 적용됨). `vercel.json` buildCommand에 포함.
3. Deployment Protection(Vercel Authentication)이 켜져 있으면 외부 접근 401 → 프로젝트 설정에서 해제됨(`ssoProtection: null`).

### Render (대안, 미사용)
`render.yaml` 참고. 무료 플랜은 15분 유휴 후 spin-down(첫 요청 ~1분), 외부 API 호출이 많은 서비스는 정지될 수 있음.

### 카카오 지도 도메인 등록 (지도 안 뜰 때)
developers.kakao.com → 앱 > **플랫폼 키 > JavaScript 키 > JavaScript SDK 도메인**에 등록:
```
https://budungbudung.vercel.app
http://localhost:3000
```
- **함정**: "로그인 리다이렉트 URI"나 "Web 플랫폼 도메인"에 넣어도 지도엔 적용 안 됨. 반드시 JavaScript SDK 도메인.
- 확인: `curl "https://dapi.kakao.com/v2/maps/sdk.js?appkey=<JS키>" -H "Referer: https://budungbudung.vercel.app/"` → 200 + `text/javascript`면 성공.

---

## 6. 설계 원칙 (`.tenet/project/`, spec)

이 프로젝트는 정직성/근거 우선을 강하게 지킨다. 기능 추가 시 반드시 유지:

- **실거래 = 과거 신고 거래**. 현재 매물이 아님. 화면 문구에서 매물로 오인되지 않게.
- **랭킹/추천점수 금지**. 정렬은 가격·평형 등 사실 기준만.
- **근거 없는 통계 금지** (출퇴근 시간, 학군 평가, 안전성 등 데이터로 확인 불가한 항목 생성 금지).
- **해석은 결정적·재현 가능**하고 근거(reference)를 명시. 런타임 LLM 금지.
- **입력값(자산/소득)은 브라우저 메모리에만**. 저장/전송/분석 없음.
- **빈 결과·오류·미지 필드를 정직하게** 표시. 샘플로 조용히 대체 금지.
- 비교 시 기준 레코드를 이름으로 명시, 부족 필드는 비교에서 제외.

해석 로직: `client/src/lib/interpretation.ts` (+ `interpretation.test.ts` 27개).

---

## 7. 알려진 제약 / 미완 작업

- **거래 유형**: 매매만 지원. 전세 미구현 (`spec`엔 있으나 미착수).
- **주택 유형**: 아파트 + 빌라·다세대. 단독·다가구 미구현 (`RTMSDataSvcSHTrade` 추가 필요).
- **지역**: 서울/경기 드롭다운. 위치 권한 기반 자동 구·시 미구현.
- **서버리스 캐시**: `server/realEstate.ts`의 인메모리 `regionCache`는 Vercel에서 인스턴스 재활용 시에만 유지. 콜드 요청마다 국토부 재호출 가능(정확성엔 영향 없음). 필요 시 Vercel KV/Redis로 이전.
- **앱인토스**: **현재 입점 불가**. Toss 정책 3-9 "한시적 출시 불가 카테고리"에 **부동산(시세 조회/상권 분석 등)** 포함. 카테고리 오픈 시 재검토. 기술적으로도 Toss 미니앱 SDK(React Native/WebView)로 재작성이 필요.
- **CI/테스트 자동화**: 없음. `pnpm test`는 수동.

---

## 8. 다음 후보 작업

1. 전세 거래 유형 추가 (매매 계산과 이자만 상환 로직 분리 필요 — `interpretation.ts`에 `jeonsePaymentAffordablePrincipal` 이미 구현됨).
2. 단독·다가구 실거래 API 연동.
3. 위치 권한 → 구·시 자동 해석(+수동 변경).
4. 서버리스 캐시를 외부 KV로 이전.
5. 공유용 OG 이미지/메타.
6. 부동산 외 카테고리로 Toss 재검토(정책 변경 시).

---

## 9. 주의사항

- 키/시크릿은 커밋 금지. `.env`는 gitignore. `git grep`으로 유출 점검.
- shadcn/ui 컴포넌트(`client/src/components/ui/`)는 CLI로만 수정 (`npx shadcn@latest add`).
- `api/`, `dist/`는 빌드 산출물이라 gitignore. 소스는 `api-src/`, `scripts/`.
- 커밋 이력: 초기 Manus 이식 → 정직성 정리(A) → 죽은 코드 청소(B) → 해석 레이어(C) → 카카오 통일 → Vercel 배포/번들.
