// 方案派生视图与轻量纯函数（设计文档 §3.7 / T04）
// 仅新增本文件的派生函数；applyRule/compoundSeries 直接复用引擎，不重写。
import type { UserProfile } from '../../@core/domain/user';
import { monthlyDisposable } from '../../@core/domain/user';
import type { Rule } from '../../@core/domain/rule';
import type { Bucket } from '../../@core/domain/bucket';
import { applyRule, compoundSeries } from '../budget/engine';
import { getEquityRatio } from '../warn/conflict';
import { INVESTMENT_BUCKET_KEYS } from './investmentBuckets';

/** 方案视图：分桶 + 汇总指标（点评/对比/推演/报告共用） */
export interface PlanView {
  buckets: Bucket[];
  totalMonthly: number;
  futureValue: number;
  reachMonths: number;
  equityRatio: number;
}

/** 风险偏好 / 手动利率 → 复利推演假设年化（v1.6：优先用用户手动设的 compoundAnnualRate） */
function annualRateFor(profile: UserProfile): number {
  if (typeof profile.compoundAnnualRate === 'number') return profile.compoundAnnualRate;
  if (profile.riskProfile === 'aggressive') return 0.07;
  if (profile.riskProfile === 'conservative') return 0.03;
  return 0.05;
}

/**
 * 某法则「投资/增值类」桶的合计月额（用于复利末值，设计文档 §3.2 / T02）。
 * 纯函数：applyRule(profile, rule) → 过滤 bucketKey ∈ 投资类集合 → 求和。
 */
export function investmentMonthlyOf(rule: Rule, profile: UserProfile): number {
  return applyRule(profile, rule)
    .filter((b) => b.bucketKey && INVESTMENT_BUCKET_KEYS.has(b.bucketKey))
    .reduce((s, b) => s + b.monthlyAmount, 0);
}

/**
 * 构建方案视图：应用法则得分桶，再以「该法则投资桶月额」做复利推演（T02）。
 * 纯函数（依赖既有引擎），不读全局态、不改 profile。
 */
export function buildPlanView(profile: UserProfile, rule: Rule): PlanView {
  const buckets = applyRule(profile, rule);
  const totalMonthly = buckets.reduce((s, b) => s + b.monthlyAmount, 0);
  const months = Math.max(1, profile.investHorizonMonths || 120);
  const investMonthly = Math.max(0, investmentMonthlyOf(rule, profile));
  const series = compoundSeries(investMonthly, annualRateFor(profile), months);
  const futureValue = series.length ? series[series.length - 1].value : 0;
  const reachMonths = computeEmergencyFundReachMonths(profile, monthlyDisposable(profile));
  const equityRatio = getEquityRatio(profile, rule);
  return { buckets, totalMonthly, futureValue, reachMonths, equityRatio };
}

/**
 * 达 3×固定支出所需月数（基于每月可存入的应急金）。
 * monthlySave ≤ 0 且仍有缺口时返回 Infinity（UI 展示「—」）。
 * 纯函数。
 */
export function computeEmergencyFundReachMonths(profile: UserProfile, monthlySave: number): number {
  const target = 3 * (profile.fixedExpenses || 0);
  const remaining = Math.max(0, target - (profile.currentSavings || 0));
  if (remaining <= 0) return 0;
  if (monthlySave <= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil(remaining / monthlySave);
}
