# 부둥부둥 (budungbudung)

예산과 소득으로 서울·경기 주거 선택지를 **실거래 사례**로 탐색·비교하는 웹앱.

> 과거 신고 실거래 기반이며, 현재 매물이나 대출 승인을 의미하지 않습니다.

React + Vite 프론트엔드와 Express + tRPC 서버로 구성됩니다.

## 구성

```text
client/   React 19 + Vite + Tailwind 4 + shadcn/ui 화면
server/   Express + tRPC API
  realEstate.ts   국토교통부 아파트·빌라 실거래
  kapt.ts         K-apt 공동주택 단지정보
  buildingHub.ts  건축HUB 총괄표제부 용적률
  places.ts       카카오 로컬 API 기반 상권·학군·교통 신호
```

## 실행

```bash
pnpm install
cp .env.example .env   # 키 입력
pnpm run dev           # 개발 서버 (Vite HMR)
```

빌드·실행:

```bash
pnpm run check   # tsc --noEmit
pnpm test        # vitest (키 없는 단위 테스트만 통과)
pnpm run build
pnpm run start
```

## 환경변수

| 변수                       | 용도                                  | 노출 |
| -------------------------- | ------------------------------------- | ---- |
| `MOLIT_SERVICE_KEY`        | 국토부 실거래 API                     | 서버 |
| `KAPT_LIST_SERVICE_KEY`    | K-apt 단지 목록                       | 서버 |
| `KAPT_BASIS_SERVICE_KEY`   | K-apt 기본·상세정보                   | 서버 |
| `BUILDING_HUB_SERVICE_KEY` | 건축HUB 건축물대장                    | 서버 |
| `VITE_NAVER_MAPS_CLIENT_ID` | 브라우저 지도 JS (NCP ncpKeyId)      | 브라우저 |
| `KAKAO_REST_API_KEY`       | 카카오 로컬 API (입지 신호)          | 서버 |
| `PORT`                     | 서버 포트 (기본 3000)                 | 서버 |

브라우저 키에는 HTTP referrer 제한, 서버 키에는 IP/API 제한을 거는 것을 권장합니다.

## API 키 없이 실행

키가 없어도 화면과 입력·필터·지도 컨테이너는 동작하며, 실거래/단지/지도 데이터는 오류·빈 상태를 정직하게 표시합니다. 샘플 데이터로 대체하지 않습니다.

## 데이터 출처

- 국토교통부 실거래가: https://rt.molit.go.kr/
- 공공데이터포털: https://www.data.go.kr/
- 자세한 엔드포인트는 `docs/data-sources.md`, `docs/kapt-integration.md`

## 배포

`docs/DEPLOYMENT.md` 참고. Node.js 장기 실행 프로세스를 지원하는 호스팅(Railway·Render·Fly.io 등)에 프론트와 서버를 함께 배포하는 것을 권장합니다.
