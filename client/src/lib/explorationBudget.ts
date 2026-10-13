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

/**
 * 예산 패널 가정 문구. 매매는 원리금균등상환, 전세는 이자만 상환.
 * 매매 문구는 기존 화면과 byte-identical 하게 유지한다.
 */
export function budgetAssumptionNote(tradeType: ExplorationTradeType, ratePct: number): string {
  if (tradeType === "jeonse") {
    return `월 이자 상한을 기준으로 이자만 상환, 금리 ${ratePct}%를 가정했어요.`;
  }
  return `월 상환액을 기준으로 원리금균등상환, 금리 ${ratePct}%를 가정했어요.`;
}

/**
 * 예산 패널의 "대출 기간" 입력 노출 여부.
 * 전세는 이자만 상환 구조라 대출 기간이 예산 계산에 쓰이지 않으므로 입력을 숨긴다.
 * 매매는 기존 화면과 byte-identical 하게 유지한다(항상 노출).
 */
export function showsLoanTerm(tradeType: ExplorationTradeType): boolean {
  return tradeType !== "jeonse";
}

/**
 * "예상 대출 가능액" 지표의 상세 문구.
 * 매매는 금리 + 대출 기간, 전세는 이자만 상환 구조라 기간 지표를 넣지 않는다.
 * 매매 문구는 기존 화면과 byte-identical 하게 유지한다.
 */
export function loanMetricDetail(tradeType: ExplorationTradeType, ratePct: number, years: number): string {
  if (tradeType === "jeonse") {
    return `금리 ${ratePct}% · 이자만 상환`;
  }
  return `금리 ${ratePct}% · ${years}년 가정`;
}
