import { describe, expect, it } from "vitest";
import {
  type BudgetInputs,
  type InterpretationRecord,
  evaluateFeasibility,
  formatWon,
  interpret,
  jeonsePaymentAffordablePrincipal,
  saleMonthlyPayment,
  salePaymentAffordablePrincipal,
  validateBudgetInputs,
} from "./interpretation";

const baseInputs: BudgetInputs = {
  cashWon: 200_000_000,
  incomeAnnualWon: 60_000_000,
  debtMonthlyWon: 0,
  reserveWon: 0,
  feesWon: 0,
  rateAnnual: 0.048,
  termMonths: 360,
  allocationRatio: 0.25,
  loanCeilingWon: 200_000_000,
  financedShare: 0.7,
};

const saleRecord = (
  overrides: Partial<InterpretationRecord> = {},
): InterpretationRecord => ({
  id: "sale-a",
  name: "테스트아파트",
  housingType: "apartment",
  tradeType: "sale",
  priceWon: 350_000_000,
  areaM2: 59,
  builtYear: 2015,
  contractDate: "2026-01-10",
  ...overrides,
});

describe("formatWon", () => {
  it("formats 만원 under 1억", () => {
    expect(formatWon(50_000_000)).toBe("5,000만");
  });
  it("formats 억 at/above 1억", () => {
    expect(formatWon(350_000_000)).toBe("3.5억");
  });
});

describe("payment-affordable principal", () => {
  it("uses M*n at zero rate (sale)", () => {
    expect(salePaymentAffordablePrincipal(1_000_000, 0, 360)).toBe(
      360_000_000,
    );
  });
  it("computes annuity principal at 4.8% annual (0.4% monthly)", () => {
    // Independent annuity formula: P = M * (1 - (1+r)^-n) / r, r=0.004, n=360.
    const expected = (1_000_000 * (1 - Math.pow(1.004, -360))) / 0.004;
    expect(salePaymentAffordablePrincipal(1_000_000, 0.048, 360)).toBeCloseTo(
      expected,
      2,
    );
  });
  it("computes interest-only principal for jeonse", () => {
    expect(jeonsePaymentAffordablePrincipal(500_000, 0.048)).toBeCloseTo(
      125_000_000,
      0,
    );
  });
  it("returns Infinity for zero-rate jeonse (ceiling still applies)", () => {
    expect(jeonsePaymentAffordablePrincipal(500_000, 0)).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
  it("returns zero for zero budget", () => {
    expect(salePaymentAffordablePrincipal(0, 0.048, 360)).toBe(0);
    expect(jeonsePaymentAffordablePrincipal(0, 0.048)).toBe(0);
  });
});

describe("saleMonthlyPayment", () => {
  it("returns principal/months at zero rate", () => {
    expect(saleMonthlyPayment(360_000_000, 0, 360)).toBe(1_000_000);
  });
  it("matches the annuity payment for a known principal", () => {
    // P=150,000,000, r=0.004, n=360 -> M = P*r / (1-(1+r)^-n)
    const expected = (150_000_000 * 0.004) / (1 - Math.pow(1.004, -360));
    expect(saleMonthlyPayment(150_000_000, 0.048, 360)).toBeCloseTo(
      expected,
      0,
    );
  });
});

describe("validateBudgetInputs", () => {
  it("accepts a valid scenario", () => {
    expect(validateBudgetInputs(baseInputs)).toBeNull();
  });
  it("rejects negative cash", () => {
    expect(validateBudgetInputs({ ...baseInputs, cashWon: -1 })).toContain(
      "보유 자금",
    );
  });
  it("rejects non-finite income", () => {
    expect(
      validateBudgetInputs({ ...baseInputs, incomeAnnualWon: NaN }),
    ).toContain("연 소득");
  });
  it("rejects zero term", () => {
    expect(validateBudgetInputs({ ...baseInputs, termMonths: 0 })).toContain(
      "대출 기간",
    );
  });
  it("rejects allocation ratio above 1", () => {
    expect(
      validateBudgetInputs({ ...baseInputs, allocationRatio: 1.5 }),
    ).toContain("소득 배분");
  });
});

describe("evaluateFeasibility", () => {
  it("is feasible when needed loan is within every cap", () => {
    const result = evaluateFeasibility(saleRecord(), baseInputs);
    expect(result.feasible).toBe(true);
    expect(result.neededLoanWon).toBe(150_000_000);
    // 200M cash + 150M loan == 350M price, so no cash remains.
    expect(result.cashRemainingWon).toBe(0);
  });
  it("reports leftover cash when cash exceeds the price", () => {
    const result = evaluateFeasibility(
      saleRecord({ priceWon: 150_000_000 }),
      baseInputs,
    );
    expect(result.feasible).toBe(true);
    expect(result.neededLoanWon).toBe(0);
    expect(result.cashRemainingWon).toBe(50_000_000);
  });
  it("only borrows the needed loan, not the cap", () => {
    const result = evaluateFeasibility(saleRecord(), baseInputs);
    expect(result.monthlyPaymentWon).toBeCloseTo(
      saleMonthlyPayment(150_000_000, 0.048, 360),
      0,
    );
  });
  it("fails when needed loan exceeds the financial ceiling", () => {
    const result = evaluateFeasibility(
      saleRecord({ priceWon: 500_000_000 }),
      baseInputs,
    );
    expect(result.feasible).toBe(false);
    expect(result.loanCapWon).toBe(200_000_000);
  });
  it("enforces reserve and fees as a cash deduction", () => {
    const result = evaluateFeasibility(saleRecord(), {
      ...baseInputs,
      reserveWon: 30_000_000,
      feesWon: 20_000_000,
    });
    // usable cash = 150M; needed loan = 200M > ceiling 200M? equal -> feasible
    expect(result.neededLoanWon).toBe(200_000_000);
    expect(result.feasible).toBe(true);
  });
  it("treats zero interest jeonse as finite via ceiling/share", () => {
    const result = evaluateFeasibility(
      saleRecord({
        tradeType: "jeonse",
        priceWon: 100_000_000,
      }),
      { ...baseInputs, rateAnnual: 0, loanCeilingWon: 80_000_000 },
    );
    // needed 100M - 200M cash -> 0, feasible
    expect(result.feasible).toBe(true);
  });
  it("allows cash-only purchase at zero income", () => {
    const result = evaluateFeasibility(
      saleRecord({ priceWon: 150_000_000 }),
      { ...baseInputs, incomeAnnualWon: 0, cashWon: 200_000_000 },
    );
    expect(result.feasible).toBe(true);
    expect(result.monthlyPaymentWon).toBe(0);
  });
});

describe("interpret", () => {
  it("returns a budget-gap headline with evidence when infeasible", () => {
    const result = interpret(
      saleRecord({ priceWon: 500_000_000 }),
      baseInputs,
      [],
    );
    expect(result.kind).toBe("budget-gap");
    expect(result.headline).toContain("부족");
    expect(result.evidence.map((item) => item.label)).toContain("필요 대출");
    expect(result.referenceIds).toHaveLength(0);
  });

  it("uses a named baseline for within-band comparisons", () => {
    const target = saleRecord({
      id: "target",
      name: "기준단지",
      areaM2: 59,
      builtYear: 2015,
      priceWon: 350_000_000,
    });
    const baseline = saleRecord({
      id: "baseline",
      name: "이웃단지",
      areaM2: 66,
      builtYear: 2012,
      priceWon: 360_000_000,
    });
    const result = interpret(target, baseInputs, [target, baseline]);
    expect(result.kind).toBe("space-age");
    expect(result.headline).toContain("이웃단지");
    expect(result.headline).toContain("좁음");
    expect(result.referenceIds).toEqual(["baseline"]);
    expect(result.evidence.map((item) => item.label)).toContain("비교 기준");
  });

  it("omits comparison when area or year is missing", () => {
    const target = saleRecord({ id: "t", areaM2: null, priceWon: 350_000_000 });
    const baseline = saleRecord({ id: "b", name: "이웃단지", priceWon: 355_000_000 });
    const result = interpret(target, baseInputs, [target, baseline]);
    expect(result.kind).toBe("cash-room");
    expect(result.referenceIds).toHaveLength(0);
  });

  it("does not compare across different trade types", () => {
    const target = saleRecord({ id: "t", priceWon: 350_000_000 });
    const baseline = saleRecord({
      id: "b",
      tradeType: "jeonse",
      priceWon: 355_000_000,
    });
    const result = interpret(target, baseInputs, [target, baseline]);
    expect(result.referenceIds).toHaveLength(0);
  });

  it("keeps cash-room headline when no baseline exists", () => {
    const result = interpret(saleRecord(), baseInputs, [saleRecord()]);
    expect(result.kind).toBe("cash-room");
    expect(result.evidence.length).toBeGreaterThanOrEqual(2);
  });

  it("is deterministic (same inputs, same output)", () => {
    const target = saleRecord();
    const pool = [target, saleRecord({ id: "x", name: "A", priceWon: 355_000_000 })];
    expect(interpret(target, baseInputs, pool)).toEqual(
      interpret(target, baseInputs, pool),
    );
  });
});
