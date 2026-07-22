// 三桶分配（C8 / T08，设计文档 §3.5）。
// 基于「每月入水流 D」的再分配，纯函数、不写 SQLite。
// D 默认 = monthlyDisposable（无法则时）；选了法则时由调用方传入「法则储蓄额」
//   （即每月真正能攒、进三桶的钱，例如 4321 的储蓄 2150，而非整个可自由可支配 4300）。
// v1.7.1：备用金目标改用「消费类实际月额」(monthlyConsumption) 取代旧的 fixed+variable。
// 不变量：reserve + flexible + free === D。

import type { UserProfile } from '../../@core/domain/user';
import { monthlyDisposable } from '../../@core/domain/user';

// 三桶分配比例（用户可调；默认应急金 100% = 旧「先攒满」行为，灵活占剩余 50%）
export interface ThreeBucketRatios { reserve: number; flexible: number; }
const RATIO_KEY = 'fb_three_bucket_ratios';

function clamp01(n: unknown, fallback: number): number {
  const v = typeof n === 'number' && !isNaN(n) ? n : fallback;
  return Math.min(1, Math.max(0, v));
}

/** 读取三桶比例（应急金占比、灵活占剩余部分比例），缺省回退 100% / 50% */
export function getThreeBucketRatios(): ThreeBucketRatios {
  try {
    if (typeof localStorage === 'undefined') return { reserve: 1, flexible: 0.5 };
    const raw = localStorage.getItem(RATIO_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { reserve: clamp01(p?.reserve, 1), flexible: clamp01(p?.flexible, 0.5) };
    }
  } catch { /* ignore */ }
  return { reserve: 1, flexible: 0.5 };
}

/** 持久化三桶比例到 localStorage */
export function setThreeBucketRatios(r: ThreeBucketRatios): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(RATIO_KEY, JSON.stringify({ reserve: clamp01(r.reserve, 1), flexible: clamp01(r.flexible, 0.5) }));
  } catch { /* ignore */ }
}

export interface ThreeBuckets {
  reserve: number; // 备用金：固定不动，覆盖失业/重病/大额意外
  flexible: number; // 灵活应急金：补弹性缺口，不用于娱乐
  free: number; // 自由支配：剩余全部
  total: number; // 合计（= D，不溢出不短缺）
  reserveTarget: number; // 备用金目标 = reserveMonths × 消费类实际月额
  reserveMet: boolean; // 备用金是否达标（单月入水已 ≥ 目标）
  inflow: number; // 本月实际入水流（= D，展示用）
  monthsToFull: number; // 以当前 inflow 存满备用金目标所需月数（inflow>0 时）
  reserveTargetMonths: number; // 实际使用的备用金月数（由法则决定，默认 3）
}

/**
 * 三桶分配（设计文档 §3.5）。
 *  D = monthlyInflow（传入则用，否则 monthlyDisposable）
 *  reserveTarget = reserveMonths × 消费类实际月额   // 月数由法则差异化决定
 *  reserve = min(D, reserveTarget)
 *  flexible = min(remaining, 消费类实际月额)   // 默认 1 个月弹性缓冲
 *  free = remaining - flexible
 * 不变量：reserve + flexible + free === D
 */
export function allocateThreeBuckets(
  profile: UserProfile,
  monthlyInflow?: number,
  reserveMonths = 3,
  monthlyConsumption?: number,
  reserveRatio = 1,
  flexibleRatio = 0.5,
): ThreeBuckets {
  const legacy = (profile.fixedExpenses || 0) + (profile.variableExpenses || 0);
  const monthly = monthlyConsumption != null ? monthlyConsumption : legacy;
  const D = monthlyInflow != null && monthlyInflow > 0 ? monthlyInflow : monthlyDisposable(profile);
  const reserveTarget = reserveMonths * monthly;
  const rReserve = clamp01(reserveRatio, 1);
  const rFlex = clamp01(flexibleRatio, 0.5);

  // 应急金：比例=100% 维持旧「优先攒满」行为（溢出再进灵活/自由）；<100% 按比例并行
  const reserve = rReserve >= 1 ? Math.min(D, reserveTarget) : D * rReserve;
  const remainder = Math.max(0, D - reserve);
  // 灵活应急金：100% 模式沿用「先补 1 月缓冲」；并行模式按 flexibleRatio 占剩余部分
  const flexible = rReserve >= 1 ? Math.min(remainder, monthly) : remainder * rFlex;
  const free = Math.max(0, remainder - flexible);
  const reserveMonthly = rReserve >= 1 ? Math.min(D, reserveTarget) : D * rReserve;
  const monthsToFull = reserveTarget > 0 && reserveMonthly > 0 ? reserveTarget / reserveMonthly : 0;

  return {
    reserve: Math.round(reserve),
    flexible: Math.round(flexible),
    free: Math.round(free),
    total: Math.round(reserve + flexible + free),
    reserveTarget: Math.round(reserveTarget),
    reserveMet: reserveTarget > 0 && reserve >= reserveTarget,
    inflow: Math.round(D),
    monthsToFull,
    reserveTargetMonths: reserveMonths,
  };
}
