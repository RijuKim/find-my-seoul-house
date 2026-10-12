/**
 * 탐색 예산 계산 (순수).
 *
 * - 매매: 원리금균등상환으로 월 상환 가능액이 허용하는 원금.
 * - 전세: 이자만 상환. 월 이자 상한이 허용하는 원금(금리 0이면 무한대).
 *   전역 탐색 예산은 실제 조달 상한(LTV)으로 유한화되므로 무한대가 노출되지 않는다.
 *
 * 만원 단위 입출력. 매매 경로는 기존 Home.tsx 계산과 완전히 동일하다.
 */
import { jeonsePaymentAffordablePrincipal } from "./interpretation";

export type ExplorationTradeType = "sale" | "jeonse";

export type ExplorationBudgetInputs = {
  tradeType: ExplorationTradeType;
  savingsMan: number;
  monthlyMan: number;
  years: number;
  ratePct: number;
  ltvPct: number;
};

export type ExplorationBudget = {
  total: number;
  loan: number;
  repaymentLoan: number;
  ltvCapPrice: number;
};

/** 매매: 월 상환 가능액으로부터 원리금균등상환 원금 (만원). */
export function saleLoanByPayment(monthlyMan: number, years: number, ratePct: number): number {
  const months = years * 12;
  const monthlyRate = ratePct / 100 / 12;
  if (monthlyRate === 0) return monthlyMan * months;
  return monthlyMan * ((1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate);
}

/** 전세: 이자만 상환 구조에서 월 이자 상한이 허용하는 원금 (만원, 금리 0이면 +Infinity). */
export function jeonseLoanByInterest(monthlyMan: number, ratePct: number): number {
  const principalWon = jeonsePaymentAffordablePrincipal(monthlyMan * 10_000, ratePct / 100);
  return Number.isFinite(principalWon) ? principalWon / 10_000 : Number.POSITIVE_INFINITY;
}

export function computeExplorationBudget(inputs: ExplorationBudgetInputs): ExplorationBudget {
  const { tradeType, savingsMan, monthlyMan, years, ratePct, ltvPct } = inputs;
  const ltvCapPrice = savingsMan / Math.max(0.01, 1 - ltvPct / 100);
  const repaymentLoan =
    tradeType === "jeonse"
      ? jeonseLoanByInterest(monthlyMan, ratePct)
      : saleLoanByPayment(monthlyMan, years, ratePct);
  // 금리 0 전세는 repaymentLoan이 +Infinity → min이 LTV 상한으로 수렴해 유한하다.
  const total = Math.max(0, Math.floor(Math.min(savingsMan + repaymentLoan, ltvCapPrice) / 500) * 500);
  return { total, loan: Math.max(0, total - savingsMan), repaymentLoan, ltvCapPrice };
}
