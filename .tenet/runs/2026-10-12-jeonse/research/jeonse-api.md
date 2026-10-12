# Research: 국토부 전월세 실거래 API (전세 연동)

Date: 2026-10-12
Confidence: [scanned-not-verified] — 엔드포인트/필드명은 라이브 응답으로 확정 필요.

## 왜 조사했나
전세 기능은 기존 매매(RTMSDataSvcAptTrade/RHTrade)와 다른 국토부 "전월세" API를 쓴다. 엔드포인트·필드명·전세 판정 규칙을 사전에 정리해 구현 실수를 막는다.

## 기존 코드 패턴 (확인됨, 코드 근거)
- `server/realEstate.ts`: `MOLIT_APT_TRADE_ENDPOINT` = `.../RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade`, `MOLIT_VILLA_TRADE_ENDPOINT` = `.../RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade`.
- 요청 파라미터: `serviceKey`, `LAWD_CD`(5자리), `DEAL_YMD`(YYYYMM), `pageNo`, `numOfRows`, `_type=json`.
- 응답: `response.header.resultCode`("00"/"000" 성공), `response.body.items.item` (배열/단일 혼재 → `asArray`), `totalCount`.
- 매매 필드: `aptNm`/`mhouseNm`, `umdNm`, `dealYear/Month/Day`, `dealAmount`(만원), `excluUseAr`, `floor`, `buildYear`, `jibun`, `roadNm`.
- 키: `ENV.molitServiceKey` (MOLIT_SERVICE_KEY) 재사용.

## 전월세 API 가정 (검증 대상)
- 아파트 전월세: `https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent`
- 연립·다세대 전월세: `https://apis.data.go.kr/1613000/RTMSDataSvcRHRent/getRTMSDataSvcRHRent`
- 필드(가정): `deposit`(보증금, 만원), `monthlyRent`(월세, 만원), `contractType`(계약구분), `contractTerm`, `useRRRight`(갱신요구권 사용), `preDeposit`/`preMonthlyRent`(종전), `aptNm`/`mhouseNm`, `umdNm`, `dealYear/Month/Day`, `excluUseAr`, `floor`, `buildYear`, `jibun`, `roadNm`, `sggCd`.
- 일부 구현은 `deposit`/`monthlyRent` 대신 `보증금액`/`월세금액` 한글 키 또는 `depositAmount`를 쓸 수 있어 라이브 페이로드로 키 이름을 반드시 확인한다.

## 전세 판정 규칙 (채택 방향)
- 전세 = `monthlyRent == 0 && deposit > 0`.
- 가격 매핑: `priceMan = deposit`. `priceWon = deposit * 10000`.
- 제외: `monthlyRent > 0`(월세/반전세), `deposit <= 0` 또는 누락.
- 계약갱신(`useRRRight`/종전 계약): 중복 신고 위험. 기본 제외 방향. 필드 존재/값 확인 후 확정.

## 리스크
- 활용신청: 공공데이터포털 키 4종은 같아도 API별 활용신청이 별도일 수 있음(기존 매매도 동일 이슈). 전월세 API 미신청 시 실패 → 부분 결과 + 사유 표기.
- 응답 필드 편차: 연립·다세대(`RHRent`)는 `mhouseNm` 등 매매와 유사하나 세부 키가 다를 수 있음.
- 개인정보성: 전월세는 계약 정보이므로 `useRRRight` 등 부가 필드는 표시하지 않고 가격(보증금) 계산에만 사용.

## 권장 접근
1. 신규 엔드포인트 상수 2종 + `fetchMolitRentTrades` (매매 함수와 병렬 구조, 공용 파서 재사용).
2. 라이브 페이로드 1회 조회로 실제 키 이름·전세 판정 확정 (credential-gated test).
3. 전세 전용 정직 표기: "전세 실거래(과거 신고)", 월세 제외 사유 등.
