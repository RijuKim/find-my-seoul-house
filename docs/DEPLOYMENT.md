# 예산에 맞는 집 — 외부 배포 가이드

## 1. 포함된 구성

이 프로젝트는 단순 정적 HTML이 아니라 **React 프론트엔드 + Express/tRPC 서버**로 구성되어 있습니다.

- `client/`: React 화면
- `server/`: Express/tRPC 서버 및 국토교통부·K-apt·건축HUB·네이버 지도/검색 연동
- `package.json`: 실행·빌드 명령

따라서 외부 서비스가 **Node.js 서버를 실행할 수 있어야** 전체 기능이 동작합니다. 정적 사이트 전용 호스팅에 올리면 화면은 배포할 수 있지만 서버 API는 별도로 배포해야 합니다.

## 2. 로컬에서 실행

```bash
pnpm install
pnpm run check
pnpm run build
pnpm run start
```

개발 모드:

```bash
pnpm run dev
```

## 3. 환경변수

ZIP에는 비밀키를 넣지 않았습니다. 배포 서비스의 Environment Variables / Secrets 메뉴에 아래 값을 등록하세요.

### 실거래·단지 정보

```env
MOLIT_SERVICE_KEY=국토교통부_실거래_서비스키
KAPT_LIST_SERVICE_KEY=K-apt_단지목록_서비스키
KAPT_BASIS_SERVICE_KEY=K-apt_기본정보_서비스키
BUILDING_HUB_SERVICE_KEY=건축HUB_서비스키
```

### 서버 실행

```env
NODE_ENV=production
PORT=3000
```

로그인이 없는 공개 탐색 도구이므로 인증·데이터베이스 환경변수는 필요하지 않습니다.

### 카카오 지도 (지도·상권 신호)

```env
VITE_KAKAO_MAPS_JS_KEY=카카오_JavaScript_키
KAKAO_REST_API_KEY=카카오_REST_API_키
```

- `MapView`는 브라우저에서 `VITE_KAKAO_MAPS_JS_KEY`(JavaScript 키)로 Kakao 지도 SDK를 로드합니다. developers.kakao.com > 앱 > 플랫폼 키 > JavaScript SDK 도메인에 배포 도메인을 등록해야 합니다.
- 상권·학군·교통 신호(`server/places.ts`)는 서버에서 카카오 로컬 API를 `KAKAO_REST_API_KEY`로 호출합니다. 지도 좌표 기준 반경 1.2km의 대형마트·학교·지하철역을 거리순으로 집계합니다.
- 자체 지도 SDK 경로를 쓸 경우 `VITE_KAKAO_MAPS_JS_URL`로 base URL을 바꿀 수 있습니다.

## 4. Vercel 배포 (권장)

프론트(정적)와 tRPC API를 Vercel 하나에 배포한다. 서버는 상시 프로세스가 아니라 `api/trpc/[...trpc].ts` 서버리스 함수로 동작한다.

구성:
- `vercel.json`: build `vite build`, output `dist/public`, SPA fallback rewrite, API 함수 maxDuration 60s
- `api/trpc/[...trpc].ts`: `fetchRequestHandler`로 `server/routers.ts`의 라우터를 노출
- 함수 런타임은 Node.js (기본), 리전은 `iad1` 기본

배포 방법:
1. https://vercel.com/new 에서 `RijuKim/find-my-seoul-house` 임포트
2. Framework Preset: **Other** (또는 Vite), 빌드 설정은 `vercel.json`이 대신 처리
3. 환경변수 등록 (아래) → Deploy

환경변수 (Vercel Project Settings > Environment Variables):
```env
MOLIT_SERVICE_KEY=
KAPT_LIST_SERVICE_KEY=
KAPT_BASIS_SERVICE_KEY=
BUILDING_HUB_SERVICE_KEY=
KAKAO_REST_API_KEY=
VITE_KAKAO_MAPS_JS_KEY=
```
- `VITE_*` 값은 **빌드 시** 번들에 심긴다. 바꾸면 재배포해야 반영된다.
- `KAKAO_REST_API_KEY`는 서버 함수에서만 쓰이며 클라이언트로 노출되지 않는다.

배포 후 확인:
- `https://<project>.vercel.app/` → 화면 로드
- `https://<project>.vercel.app/api/trpc/system.health?input=%7B%22json%22%3A%7B%22timestamp%22%3A1%7D%7D` → `{"result":{"data":{"json":{"ok":true}}}}`
- 카카오 JavaScript SDK 도메인에 배포 도메인을 등록해야 지도가 뜬다.

참고: 서버리스 특성상 인메모리 캐시(`regionCache`)는 인스턴스가 재활용될 때만 유지된다. 정확성에는 영향이 없지만 콜드 요청마다 국토부 API를 다시 호출할 수 있다.

## 5. Node.js 장기 실행 호스팅 (Render/Railway)

Vercel 대신 상시 서버로 배포하려면 (예: Render) 다음을 사용한다. `render.yaml`이 포함되어 있다.

- **Build command:** `pnpm run build`
- **Start command:** `pnpm run start`
- **Node version:** 20 이상
- **Port:** `PORT` 환경변수 우선, 없으면 3000

Render 무료 플랜은 15분 유휴 후 스핀다운(이후 첫 요청 ~1분), 외부 API 호출이 많은 서비스는 정지될 수 있다. 안정 운영에는 유료 플랜을 권장한다.

## 6. 인앱토스에 배포할 때 확인할 것

인앱토스가 아래를 지원하면 ZIP을 업로드해 Node 앱으로 배포할 수 있습니다.

- Node.js 20+
- `pnpm install` 또는 `npm install`
- 빌드 후 `node dist/index.js` 실행
- 외부 HTTPS 요청 허용
- 환경변수/시크릿 등록
- Express 포트에 대한 외부 접근

반대로 인앱토스가 **HTML·JS 정적 파일만 업로드하는 서비스**라면 이 프로젝트 전체를 그대로 올릴 수 없습니다. 그 경우:

- `pnpm run build` 결과물의 프론트만 정적 배포
- `server/`는 Node 호스팅에 별도 배포
- 프론트의 tRPC API 주소를 별도 서버 주소로 설정

인앱토스의 정확한 배포 메뉴와 런타임 지원 여부를 알려주면, 그 플랫폼의 설정값에 맞춘 파일까지 추가로 맞춰드릴 수 있습니다.

## 7. 보안 주의사항

- 서비스키를 `client/` 코드에 넣지 마세요.
- `.env` 파일을 GitHub나 공개 ZIP에 포함하지 마세요.
- 국토부·K-apt·건축HUB 키는 서버 환경변수로만 등록하세요.
- 공개 저장소에 올리기 전 `git grep`으로 키가 노출되지 않았는지 확인하세요.
- 무료 공공 API는 호출량 제한과 일시적 429/503이 있으므로 캐시를 유지하세요.
