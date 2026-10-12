import { describe, expect, it } from "vitest";
import {
  computeExplorationBudget,
  jeonseLoanByInterest,
  saleLoanByPayment,
} from "./explorationBudget";

describe("saleLoanByPayment", () => {
  it("returns monthly * months at zero rate", () => {
    expect(saleLoanByPayment(100, 30, 0)).toBe(36_000);
  });

  it("matches the independent annuity formula at 6% annual (0.5% monthly)", () => {
    // Independent: P = M * (1 - (1+r)^-n) / r, r=0.005, n=360.
    const expected = (100 * (1 - Math.pow(1.005, -360))) / 0.005;
    expect(saleLoanByPayment(100, 30, 6)).toBeCloseTo(expected, 6);
  });
});

describe("jeonseLoanByInterest", () => {
  it("is monthly interest budget / monthly rate (interest-only)", () => {
    // r = 0.06/12 = 0.005 → 100 / 0.005 = 20,000만원.
    expect(jeonseLoanByInterest(100, 6)).toBeCloseTo(20_000, 6);
  });

  it("is +Infinity at zero rate (no interest burden)", () => {
    expect(jeonseLoanByInterest(100, 0)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("computeExplorationBudget", () => {
  const saleBase = {
    tradeType: "sale" as const,
    savingsMan: 10_000,
    monthlyMan: 100,
    years: 30,
    ratePct: 6,
    ltvPct: 80,
  };

  it("sale path is unchanged: min(savings + annuity, LTV cap), floored to 500만원", () => {
    // annuity ≈ 16,679.2; savings + annuity ≈ 26,679.2; LTV cap = 10,000/0.2 = 50,000.
    const budget = computeExplorationBudget(saleBase);
    expect(budget.ltvCapPrice).toBeCloseTo(50_000, 6);
    expect(budget.total).toBe(26_500);
    expect(budget.loan).toBe(16_500);
  });

  it("jeonse uses interest-only principal, giving a different (higher) budget than sale", () => {
    // interest-only principal = 100 / 0.005 = 20,000; total = floor(30,000/500)*500 = 30,000.
    const budget = computeExplorationBudget({ ...saleBase, tradeType: "jeonse" });
    expect(budget.repaymentLoan).toBeCloseTo(20_000, 6);
    expect(budget.total).toBe(30_000);
    expect(budget.loan).toBe(20_000);
  });

  it("jeonse at zero rate stays finite via the LTV cap (no Infinity exposed)", () => {
    const budget = computeExplorationBudget({ ...saleBase, tradeType: "jeonse", ratePct: 0 });
    expect(Number.isFinite(budget.total)).toBe(true);
    expect(Number.isFinite(budget.loan)).toBe(true);
    // savings + Infinity → min with LTV cap 50,000.
    expect(budget.total).toBe(50_000);
    expect(budget.loan).toBe(40_000);
  });

  it("caps the budget at the LTV-derived price", () => {
    // Huge interest-only allowance cannot exceed the deposit the loan ratio supports.
    const budget = computeExplorationBudget({
      tradeType: "jeonse",
      savingsMan: 24_000,
      monthlyMan: 380,
      years: 30,
      ratePct: 4.2,
      ltvPct: 70,
    });
    // 70% LTV: 24,000 / 0.3 ≈ 80,000 (floating point floors to 79,500).
    expect(budget.total).toBe(79_500);
    expect(budget.total).toBeLessThanOrEqual(budget.ltvCapPrice);
  });
});
