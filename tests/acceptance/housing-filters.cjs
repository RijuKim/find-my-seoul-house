/* Housing filters browser acceptance script (Playwright MCP callable).
 *
 * Invoke through `browser_run_code_unsafe`:
 *   { "filename": "tests/acceptance/housing-filters.cjs", "code": "" }
 * The file evaluates to an `async (page) => results[]` function expression.
 *
 * It routes only the tRPC endpoints under test to deterministic fixtures and
 * returns a list of { name, pass, detail } assertions. Test-only fixtures; the
 * application has no runtime mock fallback.
 */
async (page) => {
  let forceScaleFailure = false;
  await page.unroute("**/api/trpc/**").catch(() => {});
  const SCALE_FIXTURE_MAP = {
    규모A: { households: 99, buildingCount: 2 },
    규모B: { households: 100, buildingCount: 2 },
    규모C: { households: 250, buildingCount: 1 },
    규모D: { households: undefined, buildingCount: 1 },
    규모E: { households: 150, buildingCount: undefined },
    규모F: undefined,
  };

  const fixtureTrade = ({ id, name, propertyType, region }) => ({
    id,
    apartmentName: name,
    district: region === "gyeonggi" ? "성남시 분당구" : "강남구",
    neighborhood: "삼성동",
    priceMan: 50000,
    area: 84,
    floor: "5",
    year: 2010,
    dealDate: "2026-09-30",
    jibun: `10${id.length}`,
    roadName: "",
    lawdCd: region === "gyeonggi" ? "41135" : "11680",
    lat: 37.5,
    lng: 127.0,
    cluster: "강남권",
    propertyType,
    trendPct: 1.2,
    trendPcts: { 1: 1.2 },
  });

  const scaleResultFor = (candidate) => {
    if (forceScaleFailure) {
      return { id: candidate.id, status: "unavailable", source: "none", checkedAt: new Date().toISOString(), statusMessage: "일시 조회 실패(테스트)" };
    }
    const match = SCALE_FIXTURE_MAP[candidate.apartmentName];
    if (!match) {
      return { id: candidate.id, status: "not_found", source: "none", checkedAt: new Date().toISOString(), statusMessage: "일치 단지 없음(테스트)" };
    }
    return { id: candidate.id, status: "matched", households: match.households, buildingCount: match.buildings ?? match.buildingCount, source: "K-apt", checkedAt: new Date().toISOString(), statusMessage: "K-apt 공식 정보(테스트)" };
  };

  const tradesJson = (region) => ({
    json: {
      expiresAt: Date.now() + 10 * 60 * 1000,
      data: [
        fixtureTrade({ id: "apt-a", name: "규모A", propertyType: "apartment", region }),
        fixtureTrade({ id: "apt-b", name: "규모B", propertyType: "apartment", region }),
        fixtureTrade({ id: "apt-c", name: "규모C", propertyType: "apartment", region }),
        fixtureTrade({ id: "apt-d", name: "규모D", propertyType: "apartment", region }),
        fixtureTrade({ id: "apt-e", name: "규모E", propertyType: "apartment", region }),
        fixtureTrade({ id: "apt-f", name: "규모F", propertyType: "apartment", region }),
        fixtureTrade({ id: "villa-v", name: "빌라V", propertyType: "villa", region }),
      ],
      month: "202609",
      region,
      propertyType: "all",
      periodYears: 1,
      requestFailures: 0,
    },
  });

  // httpBatchLink may combine procedures into one URL:
  //   /api/trpc/procA,procB?batch=1&input={"0":{json:...},"1":{json:...}}
  // Handle the general case by mapping each procedure in path order.
  const respondToProcedure = (procedure, input) => {
    if (procedure.endsWith("districts")) return [{ lawdCd: "11680", district: "강남구" }];
    if (procedure.endsWith("recentTrades")) return tradesJson(input?.json?.region ?? "seoul").json;
    if (procedure.endsWith("complexScales")) return (input?.json?.candidates ?? []).map(scaleResultFor);
    if (procedure.endsWith("complexInfo")) return [];
    if (procedure.endsWith("nearbySignals")) return [];
    if (procedure.endsWith("trendSeries")) return {};
    return null;
  };

  await page.route("**/api/trpc/**", (route) => {
    const url = new URL(route.request().url());
    const procedures = url.pathname.replace(/^.*\/api\/trpc\//, "").split(",");
    const input = JSON.parse(url.searchParams.get("input") ?? "{}");
    const batched = url.searchParams.has("batch") || procedures.length > 1;
    const payloads = procedures.map((procedure, index) => ({ result: { data: { json: respondToProcedure(procedure, batched ? input?.[String(index)] : input) } } }));
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(batched ? payloads : payloads[0]) });
  });

  const scaleCalls = [];
  page.on("request", (request) => { if (request.url().includes("complexScales")) scaleCalls.push(request.url()); });

  const results = [];
  const record = (name, pass, detail) => results.push({ name, pass: Boolean(pass), detail: String(detail) });
  const cardNames = () => page.$$eval(".listing-card h3", (nodes) => nodes.map((node) => node.textContent));
  const cardCount = () => page.$$eval(".listing-card", (nodes) => nodes.length);
  const statusText = async () => {
    const element = await page.$(".scale-status");
    return element ? (await element.innerText()).replace(/\s+/g, " ") : "";
  };

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".listing-card", { timeout: 15000 });

  const defaultCards = await cardCount();
  record("default apartment view renders cards without scale calls", defaultCards > 0 && scaleCalls.length === 0, `cards=${defaultCards} scaleCalls=${scaleCalls.length}`);
  record("no horizontal overflow at 1280", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "scrollWidth<=innerWidth");
  const scaleSelectHeights = await page.$$eval(".scale-field select", (nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  record("scale selects meet 44px touch target at 1280", scaleSelectHeights.length === 2 && scaleSelectHeights.every((height) => height >= 44), `heights=${scaleSelectHeights.join(",")}`);

  await page.getByRole("button", { name: "전체", exact: true }).click();
  await page.waitForTimeout(300);
  const allCards = await cardCount();
  record("전체 includes villas and apartments", allCards >= 7, `cards=${allCards}`);

  await page.selectOption('select[aria-label="단지 규모 조건"]', "either");
  await page.selectOption('select[aria-label="단지 규모 보기 방식"]', "only");
  await page.waitForTimeout(1500);
  const onlyNames = await cardNames();
  const onlySet = new Set(onlyNames);
  record("only/either shows exactly A,C,D plus villa", ["규모A", "규모C", "규모D", "빌라V"].every((n) => onlySet.has(n)) && ["규모B", "규모E", "규모F"].every((n) => !onlySet.has(n)), `names=${onlyNames.join(",")}`);
  record("scale status shows progress denominator", (await statusText()).includes("/"), await statusText());

  await page.selectOption('select[aria-label="단지 규모 보기 방식"]', "exclude");
  await page.waitForTimeout(500);
  const excludeNames = await cardNames();
  const excludeSet = new Set(excludeNames);
  record("exclude/either shows only confirmed-false B plus villa", excludeSet.has("규모B") && excludeSet.has("빌라V") && !excludeSet.has("규모A") && !excludeSet.has("규모C"), `names=${excludeNames.join(",")}`);

  await page.selectOption('select[aria-label="단지 규모 보기 방식"]', "unknown");
  await page.waitForTimeout(500);
  const unknownNames = await cardNames();
  const unknownSet = new Set(unknownNames);
  record("unknown mode shows unconfirmed E,F plus villa", unknownSet.has("규모E") && unknownSet.has("규모F") && unknownSet.has("빌라V") && !unknownSet.has("규모D") && !unknownSet.has("규모C") && !unknownSet.has("규모B"), `names=${unknownNames.join(",")}`);

  await page.selectOption('select[aria-label="단지 규모 보기 방식"]', "all");
  await page.waitForTimeout(300);
  const restored = await cardCount();
  record("all restores full base results", restored === allCards, `cards=${restored} allCards=${allCards}`);

  await page.getByRole("button", { name: "빌라·다세대", exact: true }).click();
  await page.waitForTimeout(300);
  const scaleDisabled = await page.$eval("fieldset.scale-control", (element) => element.hasAttribute("disabled"));
  record("villa-only disables scale control", scaleDisabled, `disabled=${scaleDisabled}`);

  await page.getByRole("button", { name: "아파트", exact: true }).click();
  await page.waitForTimeout(300);
  const modeAfter = await page.$eval('select[aria-label="단지 규모 보기 방식"]', (element) => element.value);
  record("returning to apartment resets scale mode to all", modeAfter === "all", `mode=${modeAfter}`);

  await page.getByRole("button", { name: "전체", exact: true }).click();
  await page.selectOption('select[aria-label="단지 규모 보기 방식"]', "exclude");
  await page.waitForTimeout(800);
  const cardsAfterFilter = await cardCount();
  const mapText = await page.$eval(".map-panel-meta", (element) => element.innerText).catch(() => "");
  const mapCount = Number(String(mapText).match(/(\d+)개/)?.[1] ?? -1);
  record("map displayed count matches filtered card count", mapCount === cardsAfterFilter, `map=${mapCount} cards=${cardsAfterFilter}`);

  const overLimit = scaleCalls.some((url) => {
    const input = JSON.parse(new URL(url).searchParams.get("input") ?? "{}");
    const candidates = input?.json?.candidates ?? input?.candidates ?? [];
    return candidates.length > 12;
  });
  record("scale API requests never exceed 12 candidates", !overLimit, `requests=${scaleCalls.length}`);

  // --- Mobile 360px ---
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".listing-card", { timeout: 15000 });
  record("no horizontal overflow at 360", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "scrollWidth<=innerWidth");
  const chipsVisible = await page.$$eval(".type-chip", (nodes) => nodes.length === 3 && nodes.every((node) => node.getBoundingClientRect().height >= 44));
  record("type chips visible, tappable, and 44px at 360", chipsVisible, "3 chips rendered at >=44px");
  await page.getByRole("button", { name: "전체", exact: true }).click();
  await page.selectOption('select[aria-label="단지 규모 보기 방식"]', "only");
  await page.waitForTimeout(1200);
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  record("no horizontal overflow after scale filter at 360", mobileOverflow, "post-filter scrollWidth<=innerWidth");
  const mobileCards = await cardCount();
  record("scale filtering works at 360", mobileCards > 0, `cards=${mobileCards}`);
  const sourceNoteText = await page.$eval(".scale-source-note", (element) => element.innerText.replace(/\s+/g, " ")).catch(() => "");
  record("scale status shows K-apt check time", /확인 시각/.test(sourceNoteText), sourceNoteText.slice(0, 140));
  const resetHeight = await page.$eval(".scale-reset", (element) => element.getBoundingClientRect().height).catch(() => 0);
  record("scale reset meets 44px touch target", resetHeight >= 44, `height=${resetHeight}`);
  await page.selectOption('select[aria-label="단지 규모 보기 방식"]', "all");

  // --- Region switch (fresh identities for gyeonggi) ---
  await page.selectOption('select[aria-label="단지 규모 조건"]', "either");
  await page.selectOption('select[aria-label="단지 규모 보기 방식"]', "only");
  await page.waitForTimeout(1000);
  await page.getByLabel("지역").selectOption("gyeonggi");
  await page.waitForTimeout(1500);
  const regionOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const regionMode = await page.$eval('select[aria-label="단지 규모 보기 방식"]', (element) => element.value);
  const regionOnlyNames = await cardNames();
  record("region switch keeps scale state and recomputes for new region", regionMode === "only" && regionOverflow && regionOnlyNames.length > 0, `mode=${regionMode} names=${regionOnlyNames.join(",")}`);

  // --- Failure / retry: reload clears in-memory results, then force failure on fresh identities ---
  await page.selectOption('select[aria-label="단지 규모 보기 방식"]', "all");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".listing-card", { timeout: 15000 });
  forceScaleFailure = true;
  await page.selectOption('select[aria-label="단지 규모 조건"]', "either");
  await page.selectOption('select[aria-label="단지 규모 보기 방식"]', "unknown");
  await page.waitForTimeout(1500);
  const failureStatus = await statusText();
  const retryVisible = await page.$(".scale-retry");
  record("failed lookups offer retry and are distinguished from absent", Boolean(retryVisible) && failureStatus.includes("조회 실패"), failureStatus.slice(0, 80));
  const retryHeight = retryVisible ? await retryVisible.evaluate((element) => element.getBoundingClientRect().height) : 0;
  record("scale retry meets 44px touch target", retryHeight >= 44, `height=${retryHeight}`);

  forceScaleFailure = false;
  if (retryVisible) await retryVisible.click();
  await page.waitForTimeout(1500);
  const afterRetry = await statusText();
  record("retry resolves only failed lookups", afterRetry.includes("조회 실패 0"), afterRetry.slice(0, 80));

  await page.selectOption('select[aria-label="단지 규모 보기 방식"]', "all");
  await page.waitForTimeout(300);
  const afterReset = await cardCount();
  record("resetting to all restores base results immediately", afterReset === 7, `cards=${afterReset}`);

  return results;
}
