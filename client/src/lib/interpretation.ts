/**
 * 결정적(deterministic) 해석 레이어.
 *
 * spec 요구:
 * - 모든 수치는 재현 가능하고 근거(reference)를 가진다.
 * - 비교 시 기준 레코드를 이름으로 명시한다.
 * - 부족한 필드는 비교에서 제외한다 (임의 추정 금지).
 * - 향/안전/승인/매물 존재 등 데이터로 확인할 수 없는 속성은 생성하지 않는다.
 * - 런타임 LLM을 쓰지 않는다.
 */

export type HousingType = "apartment" | "villa" | "house";
export type TradeType = "sale" | "jeonse";

export type InterpretationRecord = {
  id: string;
  name: string;
  housingType: HousingType;
  tradeType: TradeType;
  priceWon: number;
  areaM2: number | null;
  builtYear: number | null;
  contractDate: string;
};

export type BudgetInputs = {
  cashWon: number;
  incomeAnnualWon: number;
  debtMonthlyWon: number;
  reserveWon: number;
  feesWon: number;
  rateAnnual: number;
  termMonths: number;
  allocationRatio: number;
  loanCeilingWon: number;
  financedShare: number;
};

export type Feasibility = {
  feasible: boolean;
  neededLoanWon: number;
  loanCapWon: number;
  paymentAffordablePrincipalWon: number;
  monthlyPaymentWon: number;
  cashRemainingWon: number;
};

export type Evidence = {
  label: string;
  value: string;
};

export type Interpretation = {
  kind: "cash-room" | "monthly-burden" | "space-age" | "budget-gap";
  headline: string;
  evidence: Evidence[];
  referenceIds: string[];
};

const WON_PER_MAN = 10_000;

export function formatWon(won: number): string {
  if (!Number.isFinite(won)) return "-";
  const man = won / WON_PER_MAN;
  if (Math.abs(man) >= 10_000) {
    const eok = man / 10_000;
    const rounded = Math.round(eok * 100) / 100;
    return `${rounded}억`;
  }
  return `${Math.round(man).toLocaleString("ko-KR")}만`;
}

const isFiniteNonNegative = (value: number) =>
  Number.isFinite(value) && value >= 0;

export function validateBudgetInputs(inputs: BudgetInputs): string | null {
  const amounts: Array<[string, number]> = [
    ["보유 자금", inputs.cashWon],
    ["연 소득", inputs.incomeAnnualWon],
    ["기존 월 부채", inputs.debtMonthlyWon],
    ["예비 자금", inputs.reserveWon],
    ["비용", inputs.feesWon],
    ["대출 한도", inputs.loanCeilingWon],
  ];
  for (const [label, value] of amounts) {
    if (!isFiniteNonNegative(value))
      return `${label}은(는) 0 이상의 숫자여야 합니다.`;
  }
  if (!Number.isFinite(inputs.rateAnnual) || inputs.rateAnnual < 0)
    return "금리는 0 이상의 숫자여야 합니다.";
  if (!Number.isFinite(inputs.termMonths) || inputs.termMonths <= 0)
    return "대출 기간은 0보다 커야 합니다.";
  if (
    !Number.isFinite(inputs.allocationRatio) ||
    inputs.allocationRatio < 0 ||
    inputs.allocationRatio > 1
  )
    return "소득 배분 비율은 0과 1 사이여야 합니다.";
  if (
    !Number.isFinite(inputs.financedShare) ||
    inputs.financedShare < 0 ||
    inputs.financedShare > 1
  )
    return "대출 비중은 0과 1 사이여야 합니다.";
  return null;
}

/** 매매: 월 상환 가능액으로부터 원리금균등상환 원금. */
export function salePaymentAffordablePrincipal(
  monthlyBudgetWon: number,
  annualRate: number,
  termMonths: number,
): number {
  if (monthlyBudgetWon <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return monthlyBudgetWon * termMonths;
  return monthlyBudgetWon * ((1 - Math.pow(1 + r, -termMonths)) / r);
}

/** 전세: 이자만 지불하는 구조에서 월 이자 상한이 허용하는 원금. */
export function jeonsePaymentAffordablePrincipal(
  monthlyBudgetWon: number,
  annualRate: number,
): number {
  if (monthlyBudgetWon <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return Number.POSITIVE_INFINITY;
  return monthlyBudgetWon / r;
}

/** 매매 원금에 대한 월 상환액. */
export function saleMonthlyPayment(
  principalWon: number,
  annualRate: number,
  termMonths: number,
): number {
  if (principalWon <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principalWon / termMonths;
  return (principalWon * r) / (1 - Math.pow(1 + r, -termMonths));
}

export function evaluateFeasibility(
  record: InterpretationRecord,
  inputs: BudgetInputs,
): Feasibility {
  const usableCash = inputs.cashWon - inputs.reserveWon - inputs.feesWon;
  const monthlyBudget = Math.max(
    0,
    (inputs.incomeAnnualWon / 12) * inputs.allocationRatio -
      inputs.debtMonthlyWon,
  );

  if (record.tradeType === "sale") {
    const paymentAffordable = salePaymentAffordablePrincipal(
      monthlyBudget,
      inputs.rateAnnual,
      inputs.termMonths,
    );
    const loanCap = Math.min(
      paymentAffordable,
      inputs.loanCeilingWon,
      record.priceWon * inputs.financedShare,
    );
    const neededLoan = Math.max(record.priceWon - usableCash, 0);
    const feasible = neededLoan <= loanCap;
    const borrowedLoan = feasible ? neededLoan : 0;
    return {
      feasible,
      neededLoanWon: neededLoan,
      loanCapWon: loanCap,
      paymentAffordablePrincipalWon: paymentAffordable,
      monthlyPaymentWon: saleMonthlyPayment(
        borrowedLoan,
        inputs.rateAnnual,
        inputs.termMonths,
      ),
      cashRemainingWon: feasible
        ? usableCash - (record.priceWon - borrowedLoan)
        : usableCash,
    };
  }

  // jeonse: 이자만 지불
  const paymentAffordable = jeonsePaymentAffordablePrincipal(
    monthlyBudget,
    inputs.rateAnnual,
  );
  const loanCap = Math.min(
    paymentAffordable,
    inputs.loanCeilingWon,
    record.priceWon * inputs.financedShare,
  );
  const neededLoan = Math.max(record.priceWon - usableCash, 0);
  const feasible = neededLoan <= loanCap;
  const borrowedLoan = feasible ? neededLoan : 0;
  return {
    feasible,
    neededLoanWon: neededLoan,
    loanCapWon: loanCap,
    paymentAffordablePrincipalWon: paymentAffordable,
    monthlyPaymentWon: (borrowedLoan * inputs.rateAnnual) / 12,
    cashRemainingWon: feasible
      ? usableCash - (record.priceWon - borrowedLoan)
      : usableCash,
  };
}

const sameTradeAndType = (
  a: InterpretationRecord,
  b: InterpretationRecord,
) => a.tradeType === b.tradeType && a.housingType === b.housingType;

/**
 * 면적 기준이 같은(같은 거래/유형) 후보 중, 가격이 기준의 +/-10% 안에 있고
 * 면적·연식 정보가 있는 레코드로만 비교한다.
 */
function pickSpaceAgeBaseline(
  record: InterpretationRecord,
  pool: InterpretationRecord[],
): InterpretationRecord | null {
  if (record.areaM2 === null || record.builtYear === null) return null;
  const lower = record.priceWon * 0.9;
  const upper = record.priceWon * 1.1;
  const candidates = pool.filter(
    (candidate) =>
      candidate.id !== record.id &&
      sameTradeAndType(candidate, record) &&
      candidate.priceWon >= lower &&
      candidate.priceWon <= upper &&
      candidate.areaM2 !== null &&
      candidate.builtYear !== null,
  );
  if (candidates.length === 0) return null;
  // 기준에 가장 가까운 가격 순, 동률이면 id 오름차순 (결정적).
  candidates.sort(
    (a, b) =>
      Math.abs(a.priceWon - record.priceWon) -
        Math.abs(b.priceWon - record.priceWon) || a.id.localeCompare(b.id),
  );
  return candidates[0] ?? null;
}

export function interpret(
  record: InterpretationRecord,
  inputs: BudgetInputs,
  pool: InterpretationRecord[],
): Interpretation {
  const feasibility = evaluateFeasibility(record, inputs);
  const evidence: Evidence[] = [];
  const referenceIds: string[] = [];

  if (!feasibility.feasible) {
    const gap = feasibility.neededLoanWon - feasibility.loanCapWon;
    evidence.push({
      label: "필요 대출",
      value: formatWon(feasibility.neededLoanWon),
    });
    evidence.push({
      label: "가정상 대출 한도",
      value: formatWon(feasibility.loanCapWon),
    });
    return {
      kind: "budget-gap",
      headline: `가정한 조건에서는 약 ${formatWon(gap)}이 부족해요.`,
      evidence,
      referenceIds,
    };
  }

  evidence.push({
    label: "예상 월 부담",
    value:
      record.tradeType === "sale"
        ? `${formatWon(feasibility.monthlyPaymentWon)} (원리금균등 가정)`
        : `${formatWon(feasibility.monthlyPaymentWon)} (이자만 가정)`,
  });
  evidence.push({
    label: "거래 후 남는 현금",
    value: formatWon(feasibility.cashRemainingWon),
  });

  const baseline = pickSpaceAgeBaseline(record, pool);
  let kind: Interpretation["kind"] = "cash-room";
  let headline: string;

  if (baseline && record.areaM2 !== null && baseline.areaM2 !== null) {
    const areaDiff = Math.round(record.areaM2 - baseline.areaM2);
    const ageDiff =
      record.builtYear !== null && baseline.builtYear !== null
        ? baseline.builtYear - record.builtYear
        : null;
    referenceIds.push(baseline.id);
    evidence.push({
      label: "비교 기준",
      value: `${baseline.name} (${formatWon(baseline.priceWon)})`,
    });
    const areaText =
      areaDiff === 0
        ? "같은 전용면적"
        : `${Math.abs(areaDiff)}㎡ ${areaDiff > 0 ? "넓음" : "좁음"}`;
    const ageText =
      ageDiff === null
        ? ""
        : ageDiff === 0
          ? ", 같은 연식"
          : `, ${Math.abs(ageDiff)}년 ${ageDiff > 0 ? "최신" : "오래됨"}`;
    kind = "space-age";
    headline = `${baseline.name} 대비 ${areaText}${ageText}이에요.`;
  } else {
    headline =
      record.tradeType === "sale"
        ? `예산 안에서 매월 ${formatWon(feasibility.monthlyPaymentWon)} 부담으로 가능해요.`
        : `예산 안에서 매월 ${formatWon(feasibility.monthlyPaymentWon)} 이자로 가능해요.`;
  }

  return { kind, headline, evidence, referenceIds };
}
