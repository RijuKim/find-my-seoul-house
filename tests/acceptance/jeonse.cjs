/* Jeonse trade-type browser acceptance script (Playwright MCP callable).
 *
 * Invoke through `browser_run_code_unsafe`:
 *   { "filename": "tests/acceptance/jeonse.cjs", "code": "" }
 * The file evaluates to an `async (page) => results[]` function expression.
 *
 * It routes the tRPC endpoints under test to deterministic fixtures and returns
 * a list of { name, pass, detail } assertions. Test-only fixtures; the
 * application has no runtime mock fallback.
 *
 * Scope: scenario 1-3, 5, 7 from the jeonse run's scenarios.md.
 *   - trade-type toggle (매매|전세) visible, >=44px, focusable
 *   - sale is the default: the recentTrades request carries tradeType "sale"
 *     and the browser never calls a MOLIT rent endpoint directly
 *   - jeonse mode shows the "전세 실거래(과거 신고)" / "월세는 제외" notices
 *   - jeonse classification contract at the fixture boundary: only
 *     monthlyRent == 0 && deposit > 0 && non-renewal rows surface; deposit is
 *     rendered as the card price. (Authoritative boundary unit tests live in
 *     server/jeonse.acceptance.test.ts; this script mirrors the inclusion rule
 *     so the browser path is exercised against classified data.)
 *   - filters / sort / map-count consistency
 *   - jeonse rate-0 exploration budget stays finite (interest-only)
 *   - no horizontal overflow + zero console errors at 1280 and 360
 */
async (page) => {
  // ---- classification mirror (contract: monthlyRent 0, deposit>0, not renewal) ----
  const explicitNumber = (value) => {
    if (value === undefined || value === null) return null;
    const raw = String(value).trim().replace(/,/g, "");
    if (raw === "") return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const flagSet = (value) => {
    const raw = String(value ?? "").trim().toUpperCase();
    return raw !== "" && raw !== "N" && raw !== "0" && raw !== "FALSE";
  };
  const isJeonseRow = (row) => {
    const deposit = explicitNumber(row.deposit);
    const monthlyRent = explicitNumber(row.monthlyRent);
    if (deposit === null || deposit <= 0) return false;
    if (monthlyRent === null || monthlyRent !== 0) return false;
    if (flagSet(row.useRRRight)) return false;
    if (explicitNumber(row.preDeposit) > 0) return false;
    if (explicitNumber(row.preMonthlyRent) > 0) return false;
    return true;
  };

  // Raw MOLIT rent-style rows. Included rows are real jeonse; the rest are
  // 월세/반전세 (monthlyRent>0), zero deposit, or 계약갱신 rows that must never surface.
  const RAW_RENT_ROWS = [
    { pt: "apartment", aptNm: "전세A", umdNm: "삼성동", jibun: "101", roadNm: "테헤란로", excluUseAr: "84.9", buildYear: "2010", floor: "5", dealYear: "2026", dealMonth: "9", dealDay: "30", deposit: "45000", monthlyRent: "0", district: "강남구", lawdCd: "11680" },
    { pt: "apartment", aptNm: "전세B", umdNm: "대치동", jibun: "202", roadNm: "남부순환로", excluUseAr: "59.8", buildYear: "1995", floor: "12", dealYear: "2026", dealMonth: "9", dealDay: "28", deposit: "65000", monthlyRent: "0", district: "강남구", lawdCd: "11680" },
    { pt: "villa", mhouseNm: "전세빌라V", umdNm: "성산동", jibun: "303", roadNm: "월드컵로", excluUseAr: "45.1", buildYear: "2015", floor: "3", dealYear: "2026", dealMonth: "9", dealDay: "25", deposit: "20000", monthlyRent: "0", district: "마포구", lawdCd: "11440" },
    { pt: "apartment", aptNm: "월세B", umdNm: "역삼동", jibun: "404", excluUseAr: "59.0", buildYear: "2001", floor: "7", dealYear: "2026", dealMonth: "9", dealDay: "29", deposit: "5000", monthlyRent: "45", district: "강남구", lawdCd: "11680" },
    { pt: "apartment", aptNm: "보증금0C", umdNm: "논현동", jibun: "505", excluUseAr: "84.0", buildYear: "2005", floor: "9", dealYear: "2026", dealMonth: "9", dealDay: "27", deposit: "0", monthlyRent: "0", district: "강남구", lawdCd: "11680" },
    { pt: "apartment", aptNm: "갱신D", umdNm: "청담동", jibun: "606", excluUseAr: "84.0", buildYear: "2008", floor: "11", dealYear: "2026", dealMonth: "9", dealDay: "26", deposit: "50000", monthlyRent: "0", useRRRight: "Y", district: "강남구", lawdCd: "11680" },
    { pt: "apartment", aptNm: "반전세E", umdNm: "삼성동", jibun: "707", excluUseAr: "84.0", buildYear: "2009", floor: "4", dealYear: "2026", dealMonth: "9", dealDay: "24", deposit: "30000", monthlyRent: "10", district: "강남구", lawdCd: "11680" },
  ];

  const jeonseTrade = (row, index) => {
    const propertyType = row.pt === "villa" ? "villa" : "apartment";
    const name = row.aptNm ?? row.mhouseNm ?? "";
    const y = String(row.dealYear ?? "");
    const m = String(row.dealMonth ?? "").padStart(2, "0");
    const d = String(row.dealDay ?? "").padStart(2, "0");
    const district = row.district ?? "강남구";
    return {
      id: `jeonse-${row.lawdCd}-${y}${m}${d}-${index}-${name}-${row.jibun}`,
      apartmentName: name,
      district,
      neighborhood: row.umdNm ?? "",
      priceMan: explicitNumber(row.deposit) ?? 0,
      area: explicitNumber(row.excluUseAr) ?? 0,
      floor: String(row.floor ?? ""),
      year: explicitNumber(row.buildYear) ?? 0,
      dealDate: `${y}-${m}-${d}`,
      jibun: String(row.jibun ?? ""),
      roadName: String(row.roadNm ?? ""),
      lawdCd: row.lawdCd ?? "11680",
      lat: district === "마포구" ? 37.5663 : 37.5172,
      lng: district === "마포구" ? 126.9014 : 127.0473,
      cluster: district === "마포구" ? "서북권" : "강남권",
      propertyType,
      trendPct: 1.0,
      trendPcts: { 1: 1.0 },
    };
  };

  const saleTrade = ({ id, name, propertyType, priceMan, area, neighborhood, district, lawdCd, lat, lng, cluster }) => ({
    id,
    apartmentName: name,
    district: district ?? "강남구",
    neighborhood: neighborhood ?? "삼성동",
    priceMan,
    area,
    floor: "5",
    year: 2010,
    dealDate: "2026-09-30",
    jibun: `10${name.length}`,
    roadName: "테헤란로",
    lawdCd: lawdCd ?? "11680",
    lat: lat ?? 37.5172,
    lng: lng ?? 127.0473,
    cluster: cluster ?? "강남권",
    propertyType,
    trendPct: 1.2,
    trendPcts: { 1: 1.2 },
  });

  const SALE_ROWS = [
    saleTrade({ id: "sale-a", name: "매매A", propertyType: "apartment", priceMan: 50000, area: 84, neighborhood: "삼성동" }),
    saleTrade({ id: "sale-b", name: "매매B", propertyType: "apartment", priceMan: 65000, area: 59, neighborhood: "대치동" }),
    saleTrade({ id: "sale-v", name: "매매빌라V", propertyType: "villa", priceMan: 30000, area: 45, neighborhood: "성산동", district: "마포구", lawdCd: "11440", lat: 37.5663, lng: 126.9014, cluster: "서북권" }),
  ];

  const filterByPropertyType = (trades, propertyType) =>
    propertyType === "all" ? trades : trades.filter((trade) => trade.propertyType === propertyType);

  const DISTRICTS = [
    { lawdCd: "11680", district: "강남구" },
    { lawdCd: "11440", district: "마포구" },
  ];

  const recentTradesPayload = (input) => {
    const json = input?.json ?? {};
    const tradeType = json.tradeType === "jeonse" ? "jeonse" : "sale";
    const propertyType = json.propertyType ?? "apartment";
    const includedJeonse = RAW_RENT_ROWS.filter(isJeonseRow);
    const data =
      tradeType === "jeonse"
        ? filterByPropertyType(includedJeonse.map(jeonseTrade), propertyType)
        : filterByPropertyType(SALE_ROWS, propertyType);
    return {
      expiresAt: Date.now() + 10 * 60 * 1000,
      data,
      month: "202609",
      region: json.region ?? "seoul",
      propertyType,
      tradeType,
      periodYears: json.periodYears ?? 1,
      requestFailures: 0,
    };
  };

  const respondToProcedure = (procedure, input) => {
    if (procedure.endsWith("districts")) return DISTRICTS;
    if (procedure.endsWith("recentTrades")) return recentTradesPayload(input);
    if (procedure.endsWith("complexScales")) return [];
    if (procedure.endsWith("complexInfo")) return [];
    if (procedure.endsWith("nearbySignals")) return [];
    if (procedure.endsWith("trendSeries")) return {};
    return null;
  };

  await page.unroute("**/api/trpc/**").catch(() => {});
  await page.route("**/api/trpc/**", (route) => {
    const url = new URL(route.request().url());
    const procedures = url.pathname.replace(/^.*\/api\/trpc\//, "").split(",");
    const input = JSON.parse(url.searchParams.get("input") ?? "{}");
    const batched = url.searchParams.has("batch") || procedures.length > 1;
    const payloads = procedures.map((procedure, index) => ({
      result: { data: { json: respondToProcedure(procedure, batched ? input?.[String(index)] : input) } },
    }));
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(batched ? payloads : payloads[0]) });
  });

  // ---- instrumentation ----
  const results = [];
  const record = (name, pass, detail) => results.push({ name, pass: Boolean(pass), detail: String(detail) });
  const consoleErrors = [];
  const requestUrls = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${String(error)}`));
  page.on("request", (request) => requestUrls.push(request.url()));

  const cardNames = () => page.$$eval(".listing-card h3", (nodes) => nodes.map((node) => node.textContent?.trim() ?? "")).catch(() => []);
  const cardCount = () => page.$$eval(".listing-card", (nodes) => nodes.length).catch(() => 0);
  const mapCount = async () => {
    const text = await page.$eval(".map-panel-meta", (element) => element.textContent ?? "").catch(() => "");
    return Number(String(text).match(/(\d+)개/)?.[1] ?? -1);
  };
  const cardPriceByName = (name) =>
    page
      .evaluate((target) => {
        const cards = Array.from(document.querySelectorAll(".listing-card"));
        for (const card of cards) {
          const heading = card.querySelector("h3");
          if (heading && heading.textContent.trim() === target) {
            return card.querySelector(".listing-card-label strong")?.textContent?.trim() ?? "";
          }
        }
        return "";
      }, name)
      .catch(() => "");
  const textOf = (selector) => page.$eval(selector, (element) => element.innerText.replace(/\s+/g, " ").trim()).catch(() => "");
  const selectByLabel = (label) => page.locator(`.select-control:has(span:text-is("${label}")) select`);
  const sameOrder = (actual, expected) => actual.length === expected.length && expected.every((value, index) => actual[index] === value);
  const recentTradesInputs = () =>
    requestUrls
      .filter((url) => url.includes("recentTrades"))
      .map((url) => {
        try {
          const parsed = JSON.parse(new URL(url).searchParams.get("input") ?? "{}");
          const entry = parsed?.json ? parsed : parsed?.["1"] ?? parsed?.["0"] ?? {};
          return entry?.json ?? entry;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

  const toggleHeights = () => page.$$eval(".trade-type-button", (nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().height)));
  const pressedState = () => page.$$eval(".trade-type-button", (nodes) => nodes.map((node) => ({ label: node.textContent.trim(), pressed: node.getAttribute("aria-pressed") })));

  try {
    // =============================== 1280x900 ===============================
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".listing-card", { timeout: 15000 });

    const toggleButtons = await page.$$eval(".trade-type-button", (nodes) => nodes.map((node) => node.textContent.trim()));
    record("trade-type toggle shows 매매 and 전세", sameOrder(toggleButtons, ["매매", "전세"]), `buttons=${toggleButtons.join(",")}`);
    const heights1280 = await toggleHeights();
    record("trade-type buttons meet 44px touch target at 1280", heights1280.length === 2 && heights1280.every((height) => height >= 44), `heights=${heights1280.join(",")}`);
    const focusOk = await page.evaluate(() => {
      const button = document.querySelector(".trade-type-button");
      if (!button) return false;
      button.focus();
      return document.activeElement === button;
    });
    record("trade-type button is keyboard focusable", focusOk, `activeElementIsButton=${focusOk}`);

    const salePressed = await pressedState();
    record("매매 is the default (aria-pressed)", salePressed[0]?.label === "매매" && salePressed[0]?.pressed === "true" && salePressed[1]?.pressed === "false", JSON.stringify(salePressed));
    record("default help copy describes 매매", (await textOf(".trade-type-help")).includes("매매"), await textOf(".trade-type-help"));
    record("default mode shows no jeonse notice", (await page.$(".jeonse-notice")) === null, "no .jeonse-notice");
    const defaultNames = await cardNames();
    record("default sale results render sale fixtures", ["매매A", "매매B"].every((name) => defaultNames.includes(name)) && !defaultNames.includes("전세A"), `names=${defaultNames.join(",")}`);

    const defaultInputs = recentTradesInputs();
    record("default recentTrades request uses tradeType sale", defaultInputs.some((input) => input?.tradeType === "sale"), `inputs=${JSON.stringify(defaultInputs)}`);
    const rentRequests = requestUrls.filter((url) => /Rent|RTMSDataSvc.*Rent/i.test(url));
    record("browser makes zero direct MOLIT rent API calls", rentRequests.length === 0, `rentRequests=${rentRequests.length}`);
    record("no horizontal overflow at 1280 (sale)", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "scrollWidth<=innerWidth");

    // --- switch to 전세 ---
    await page.getByRole("button", { name: "전세", exact: true }).click();
    await page.waitForTimeout(500);
    const jeonsePressed = await pressedState();
    record("clicking 전세 selects jeonse (aria-pressed)", jeonsePressed[0]?.pressed === "false" && jeonsePressed[1]?.pressed === "true", JSON.stringify(jeonsePressed));

    const helpJeonse = await textOf(".trade-type-help");
    record("jeonse help states 전세 실거래(과거 신고)", helpJeonse.includes("전세 실거래(과거 신고)"), helpJeonse);
    record("jeonse help states 월세는 제외", helpJeonse.includes("월세는 제외"), helpJeonse);

    const notice = await textOf(".jeonse-notice");
    record("jeonse notice is shown", notice.length > 0, notice);
    record("jeonse notice labels past-reported jeonse", notice.includes("전세 실거래(과거 신고)"), notice);
    record("jeonse notice states 월세는 제외", notice.includes("월세는 제외"), notice);

    const jeonseNames = await cardNames();
    record("jeonse apartment results map to jeonse fixtures", ["전세A", "전세B"].every((name) => jeonseNames.includes(name)), `names=${jeonseNames.join(",")}`);
    const EXCLUDED = ["월세B", "보증금0C", "갱신D", "반전세E"];
    record("excluded (월세/보증금0/갱신) rows never surface", EXCLUDED.every((name) => !jeonseNames.includes(name)), `names=${jeonseNames.join(",")}`);
    record("deposit is rendered as the card price", (await cardPriceByName("전세A")) === "4.5억", `전세A price=${await cardPriceByName("전세A")}`);
    const jeonseCardLabel = await page.$eval(".listing-card .listing-card-label span", (element) => element.textContent).catch(() => "");
    record("jeonse card labels identify 전세 신고 실거래", jeonseCardLabel.includes("전세"), jeonseCardLabel);
    record("jeonse map count matches card count", (await mapCount()) === (await cardCount()), `map=${await mapCount()} cards=${await cardCount()}`);

    // --- include villas to exercise the full classified set ---
    await page.getByRole("button", { name: "전체", exact: true }).click();
    await page.waitForTimeout(500);
    const allNames = await cardNames();
    record("전체 adds jeonse villas", allNames.includes("전세빌라V"), `names=${allNames.join(",")}`);
    record("낮은 가격순 orders jeonse by deposit ascending", sameOrder(allNames, ["전세빌라V", "전세A", "전세B"]), `order=${allNames.join(" > ")}`);
    record("map count matches after 전체", (await mapCount()) === 3, `map=${await mapCount()}`);

    // --- area filter (84.9㎡ -> 20평대, 59.8㎡ -> 10평대) ---
    await selectByLabel("평형").selectOption("20평대");
    await page.waitForTimeout(400);
    const areaNames = await cardNames();
    record("평형 20평대 keeps only the 20평대 jeonse", sameOrder(areaNames, ["전세A"]), `names=${areaNames.join(",")}`);
    record("map count matches after 평형 filter", (await mapCount()) === 1, `map=${await mapCount()}`);
    await selectByLabel("평형").selectOption("10평대");
    await page.waitForTimeout(300);
    const smallAreaNames = await cardNames();
    record("평형 10평대 keeps the 10평대 jeonse", smallAreaNames.includes("전세B") && smallAreaNames.includes("전세빌라V") && !smallAreaNames.includes("전세A"), `names=${smallAreaNames.join(",")}`);
    await selectByLabel("평형").selectOption("전체 평형");
    await page.waitForTimeout(300);

    // --- sort ---
    await page.locator(".sort-control select").selectOption("높은 가격순");
    await page.waitForTimeout(400);
    const sortedNames = await cardNames();
    record("높은 가격순 orders jeonse by deposit descending", sameOrder(sortedNames, ["전세B", "전세A", "전세빌라V"]), `order=${sortedNames.join(" > ")}`);
    record("map count matches after sort", (await mapCount()) === 3, `map=${await mapCount()}`);
    await page.locator(".sort-control select").selectOption("낮은 가격순");
    await page.waitForTimeout(300);

    // --- district filter ---
    await selectByLabel("구·시").selectOption("마포구");
    await page.waitForTimeout(400);
    const districtNames = await cardNames();
    record("구·시 마포구 keeps only 마포구 jeonse", sameOrder(districtNames, ["전세빌라V"]), `names=${districtNames.join(",")}`);
    record("map count matches after 구·시 filter", (await mapCount()) === 1, `map=${await mapCount()}`);
    await selectByLabel("구·시").selectOption("전체 구");
    await page.waitForTimeout(300);

    // --- price filter ---
    await selectByLabel("최대 가격").selectOption("60000");
    await page.waitForTimeout(400);
    const priceNames = await cardNames();
    record("최대 가격 6억 excludes the 6.5억 jeonse", priceNames.includes("전세A") && priceNames.includes("전세빌라V") && !priceNames.includes("전세B"), `names=${priceNames.join(",")}`);
    record("map count matches after 최대 가격 filter", (await mapCount()) === priceNames.length, `map=${await mapCount()} cards=${priceNames.length}`);
    await selectByLabel("최대 가격").selectOption("200000");
    await page.waitForTimeout(300);

    // --- jeonse rate-0 budget stays finite (interest-only) ---
    // anti-scenario 4: rate-0 jeonse must NOT surface an infinite exploration budget.
    // The app floors the LTV cap to 500만 steps; with defaults (자금 2.4억, LTV 70%) the
    // finite cap is ~7.95억 (float 1-0.7 => 0.30000000000000004).
    await page.fill('input[aria-label="예상 금리"]', "0");
    await page.waitForTimeout(600);
    const resultNumber = (await textOf(".result-number")) || "";
    const finiteAtRateZero = /^\d+(\.\d+)?억$/.test(resultNumber);
    record("jeonse rate-0 exploration budget is finite (not Infinity/-)", finiteAtRateZero, `result-number=${resultNumber}`);
    const ltvCapMan = Math.floor(24000 / (1 - 0.7) / 500) * 500;
    record("jeonse rate-0 budget equals the finite LTV-capped limit", resultNumber === `${ltvCapMan / 10000}억`, `result-number=${resultNumber} expected=${ltvCapMan / 10000}억`);
    const metricsText = await textOf(".metrics-row");
    record("jeonse loan metric is interest-only", metricsText.includes("이자만 상환"), metricsText.slice(0, 120));
    const assumptionText = await textOf(".assumption-note");
    record("jeonse budget note is interest-only", assumptionText.includes("이자만 상환"), assumptionText);
    await page.fill('input[aria-label="예상 금리"]', "4.2");
    await page.waitForTimeout(400);

    // --- toggle back to 매매 ---
    await page.getByRole("button", { name: "매매", exact: true }).click();
    await page.waitForTimeout(500);
    const backToSale = await cardNames();
    record("toggling back to 매매 restores sale fixtures", ["매매A", "매매B", "매매빌라V"].every((name) => backToSale.includes(name)) && !backToSale.includes("전세A"), `names=${backToSale.join(",")}`);
    record("jeonse notice disappears in 매매 mode", (await page.$(".jeonse-notice")) === null, "no .jeonse-notice");

    // =============================== 360x800 ===============================
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".listing-card", { timeout: 15000 });
    record("no horizontal overflow at 360 (sale)", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "scrollWidth<=innerWidth");
    const heights360 = await toggleHeights();
    record("trade-type buttons meet 44px touch target at 360", heights360.length === 2 && heights360.every((height) => height >= 44), `heights=${heights360.join(",")}`);

    await page.getByRole("button", { name: "전세", exact: true }).click();
    await page.waitForTimeout(500);
    const mobileNotice = await textOf(".jeonse-notice");
    record("jeonse notice shows at 360", mobileNotice.includes("월세는 제외"), mobileNotice);
    const mobileCards = await cardCount();
    record("jeonse results render at 360", mobileCards > 0, `cards=${mobileCards}`);
    record("no horizontal overflow at 360 after jeonse switch", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "scrollWidth<=innerWidth");
    record("jeonse map count matches card count at 360", (await mapCount()) === mobileCards, `map=${await mapCount()} cards=${mobileCards}`);

    // =============================== console ===============================
    record("zero console errors across the run", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" | ") || "none");
  } catch (error) {
    record("script completed without throwing", false, String(error?.stack ?? error));
  }

  return results;
}
