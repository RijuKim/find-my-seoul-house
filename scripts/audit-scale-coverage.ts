import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fetchRecentAptTrades } from "../server/realEstate";
import { createScaleService, type ScaleCandidate, type ScaleResult } from "../server/scale";

// 읽기 전용 K-apt 정밀 매처 감사. 최대 12개 고유 단지를 재현 가능한 방식으로 표본 추출한다.
// 키/원문 URL/응답 본문은 절대 출력하지 않는다. 집계 안전 증거만 남긴다.

const MAX_SAMPLE = 12;
const OUT_DIR = path.resolve(import.meta.dirname, "..", ".tenet", "runs", "2026-10-07-housing-filters", "research");
const OUT_MD = path.join(OUT_DIR, "strict-audit.md");
const OUT_JSON = path.join(OUT_DIR, "strict-audit.json");

type AuditRow = {
  id: string;
  apartmentName: string;
  lawdCd: string;
  neighborhood?: string;
  jibun?: string;
  status: ScaleResult["status"];
  households?: number;
  buildingCount?: number;
  statusMessage: string;
  checkedAt: string;
};

async function main() {
  const startedAt = new Date().toISOString();
  const trades = await fetchRecentAptTrades({ region: "seoul", months: 1, propertyType: "apartment", periodYears: 1 });
  const identities = new Map<string, ScaleCandidate>();
  for (const trade of trades.data) {
    if (trade.propertyType !== "apartment" || !trade.lawdCd) continue;
    const key = [trade.lawdCd, trade.apartmentName, trade.neighborhood, trade.jibun].join("|");
    if (identities.has(key)) continue;
    identities.set(key, {
      id: key,
      apartmentName: trade.apartmentName,
      lawdCd: trade.lawdCd,
      neighborhood: trade.neighborhood,
      jibun: trade.jibun,
      propertyType: "apartment",
    });
  }
  const unique = Array.from(identities.values());
  const sample: ScaleCandidate[] = [];
  const step = unique.length > 0 ? Math.max(1, Math.floor(unique.length / MAX_SAMPLE)) : 1;
  for (let index = 0; index < unique.length && sample.length < MAX_SAMPLE; index += step) sample.push(unique[index]!);

  const hasKeys = Boolean(process.env.KAPT_LIST_SERVICE_KEY && process.env.KAPT_BASIS_SERVICE_KEY);
  const rows: AuditRow[] = [];
  const lookupStarted = Date.now();
  if (hasKeys) {
    const service = createScaleService();
    const results = await service.fetchScales(sample);
    for (const result of results) {
      const candidate = sample.find((item) => item.id === result.id)!;
      rows.push({
        id: candidate.id,
        apartmentName: candidate.apartmentName,
        lawdCd: candidate.lawdCd,
        neighborhood: candidate.neighborhood,
        jibun: candidate.jibun,
        status: result.status,
        households: result.households,
        buildingCount: result.buildingCount,
        statusMessage: result.statusMessage,
        checkedAt: result.checkedAt,
      });
    }
  }
  const elapsedMs = Date.now() - lookupStarted;

  const tally = (predicate: (row: AuditRow) => boolean) => rows.filter(predicate).length;
  const counts = {
    total: rows.length,
    matched: tally((row) => row.status === "matched"),
    bothCounts: tally((row) => row.status === "matched" && typeof row.households === "number" && typeof row.buildingCount === "number"),
    oneCount: tally((row) => row.status === "matched" && (typeof row.households === "number") !== (typeof row.buildingCount === "number")),
    notFound: tally((row) => row.status === "not_found"),
    ambiguous: tally((row) => row.status === "ambiguous"),
    unavailable: tally((row) => row.status === "unavailable"),
    error: tally((row) => row.status === "error"),
  };

  const summary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    source: "K-apt AptListService4 + AptBasisInfoServiceV5 (공공데이터포털)",
    credentialsAvailable: hasKeys,
    region: "seoul",
    denominator: {
      tradeRecords: trades.data.length,
      uniqueApartmentIdentities: unique.length,
      sampled: sample.length,
      method: "evenly spaced indices over the unique apartment identity list",
    },
    elapsedMs,
    counts,
    limitations: [
      "표본은 서울 아파트 최근 1개월 실거래에서 균등 간격으로 뽑은 진단용이며 모집단 확보율이 아니다.",
      "K-apt 등록 단지가 아닌 건물은 정밀 매처에서 not_found/ambiguous로 남는다(정보 없음).",
      "서버리스 인메모리 캐시는 인스턴스 재사용 시에만 유지되며 영속 캐시를 주장하지 않는다.",
    ],
    rows,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2));
  const table = rows.map((row) => `| ${row.apartmentName} | ${row.lawdCd} | ${row.neighborhood ?? ""} | ${row.jibun ?? ""} | ${row.status} | ${row.households ?? "-"} | ${row.buildingCount ?? "-"} |`).join("\n");
  const md = `# 정밀 매처 실측 감사 (strict scale audit)

- 실행: ${summary.startedAt} ~ ${summary.finishedAt}
- 출처: ${summary.source}
- 인증키 사용 가능: ${hasKeys}
- 지역: 서울 아파트, 최근 1개월 실거래
- 분모: 거래 ${summary.denominator.tradeRecords}건 → 고유 단지 정체성 ${summary.denominator.uniqueApartmentIdentities}개 → 표본 ${summary.denominator.sampled}개 (${summary.denominator.method})
- 조회 소요(표본 전체): ${elapsedMs}ms

## 집계

| status | matched | 세대·동수 모두 | 한쪽만 | not_found | ambiguous | unavailable | error |
|---:|---:|---:|---:|---:|---:|---:|---:|
| ${counts.total} | ${counts.matched} | ${counts.bothCounts} | ${counts.oneCount} | ${counts.notFound} | ${counts.ambiguous} | ${counts.unavailable} | ${counts.error} |

## 표본 상세

| 실거래 단지명 | lawdCd | 동 | 지번 | status | 세대수 | 동수 |
|---|---|---|---|---|---|---|
${table || "| (표본 없음) | | | | | | |"}

## 한계

${summary.limitations.map((item) => `- ${item}`).join("\n")}
`;

  if (!hasKeys) {
    writeFileSync(OUT_MD, `# 정밀 매처 실측 감사 (strict scale audit)\n\n- 실행: ${startedAt}\n- 결과: **K-apt 인증키를 사용할 수 없어 실측을 수행하지 못했습니다.**\n- 이 실행은 실제 실패를 그대로 기록하며, 어떤 결과도 만들어내지 않습니다.\n`);
  } else {
    writeFileSync(OUT_MD, md);
  }
  console.log(JSON.stringify({ credentialsAvailable: hasKeys, counts, denominator: summary.denominator, elapsedMs }, null, 2));
}

main().catch((error) => {
  console.error("audit failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
