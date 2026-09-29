# Web runtime and location research

Date: 2026-09-11
Confidence: [scanned-not-verified]

## Purpose
Check the approved React/TypeScript approach against a mobile web first delivery and later Apps in Toss support.

## Sources and findings
- https://vite.dev/guide/ — Vite supports TypeScript frontend scaffolding and requires Node 20.19+ or 22.12+. Local read-only checks found Node v24.18.0 and npm 11.16.0. Actual dependency installation/build remains untested.
- https://vite.dev/guide/static-deploy.html — Vite produces a static deployment build. Local preview is the initial delivery target; publishing is not yet requested.
- https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition — web location requires a secure context and permission. The API supports timeout, maximumAge and enableHighAccuracy. Coordinates alone do not provide Korean administrative region codes.
- https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EC%9C%84%EC%B9%98%20%EC%A0%95%EB%B3%B4/Location.html — official search result identifies getCurrentLocation and separate permission handling in the Toss SDK. A conventional browser implementation must not be assumed to work unchanged in Toss.
- https://developers-apps-in-toss.toss.im/tutorials/webview.html returned Page Not Found. Do not use this obsolete path as an implementation contract; discover current docs before Toss integration.
- https://www.data.go.kr/data/15126469/openapi.do — official apartment sale transaction resource is reachable. The apartment rental page request failed in this browsing session. No authenticated transaction call has been made.

## Recommended boundaries
- [decision-only] Use React/TypeScript UI with pure budget/interpretation functions and explicit provider interfaces. Vite is a proposed implementation tool supporting the already-approved stack.
- [decision-only] Browser location and Toss location should be adapters. No IP-based location fallback, coordinate logging or silent nearby-region substitution.
- [decision-only] Sample provider must label all synthetic records and specify fixture coverage. Current location must not be represented as a successfully resolved district unless an actual region resolver supplies it.
- [decision-only] Live national data ingestion, administrative boundary/reverse-geocoding source and Toss SDK release compatibility require further research before their implementation slice. First sample UI does not require an API key.
