# Data sources

- MOLIT apartment sales API: https://www.data.go.kr/data/15126469/openapi.do
  - Official description: reports are queried by 5-digit legal-dong code and 6-digit contract month.
  - API base/service path used by the app: `https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade`
- MOLIT multi-family / villa sales API: https://www.data.go.kr/data/15126467/openapi.do
  - Official search result documents GET `getRTMSDataSvcRHTrade`.
  - API path used by the app: `https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade`
- Official transaction system categories include apartment, multi-family/villa, detached/multi-household, officetel, etc.: https://rt.molit.go.kr/

The app uses the user-provided MOLIT service key server-side and does not expose it in the client.
