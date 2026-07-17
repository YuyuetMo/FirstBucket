// 三桶分配（C8 / T08，设计文档 §3.5）。
// 基于「每月入水流 D」的再分配，纯函数、不写 SQLite。
// D 默认 = monthlyDisposable（无法则时）；选了法则时由调用方传入「法则储蓄额」
//   （即每月真正能攒、进三桶的钱，例如 4321 的储蓄 2150，而非整个可自由支配 4300）。
// 不变量：reserve + flexible + free === D。

import type { UserProfile } from '../../@core/domain/user';
import { monthlyDisposable } from '../../@core/domain/user';

export interface ThreeBuckets {
  reserve: number; // 备用金：固定不动，覆盖失业/重病/大额意外
  flexible: number; // 灵活应急金：补弹性缺口，不用于娱乐
  free: number; // 自由支配：剩余全部
  total: number; // 合计（= D，不溢出不短缺）
  reserveTarget: number; // 备用金目标 = reserveMonths × (固定+弹性) 月支出
  reserveMet: boolean; // 备用金是否达标（单月入水已 ≥ 目标）
  inflow: number; // 本月实际入水流（= D，展示用）
  monthsToFull: number; // 以当前 inflow 存满备用金目标所需月数（inflow>0 时）
  reserveTargetMonths: number; // 实际使用的备用金月数（由法则决定，默认 3）
}

/**
 * 三桶分配（设计文档 §3.5）。
 *  D = monthlyInflow（传入则用，否则 monthlyDisposable）
 *  reserveTarget = reserveMonths × (fixed + variable)   // 月数由法则差异化决定
 *  reserve = min(D, reserveTarget)
 *  flexible = min(remaining, variable)   // 默认 1 个月弹性缓冲
 *  free = remaining - flexible
 * 不变量：reserve + flexible + free === D
 */
export function allocateThreeBuckets(profile: UserProfile, monthlyInflow?: number, reserveMonths = 3): ThreeBuckets {
  const fixed = profile.fixedExpenses || 0;
  const variable = profile.variableExpenses || 0;
  const D = monthlyInflow != null && monthlyInflow > 0 ? monthlyInflow : monthlyDisposable(profile);
  const reserveTarget = reserveMonths * (fixed + variable);

  const reserve = Math.min(D, reserveTarget);
  const remaining = Math.max(0, D - reserve);
  const flexible = Math.min(remaining, variable);
  const free = remaining - flexible;
  const monthsToFull = D > 0 && reserveTarget > 0 ? reserveTarget / D : 0;

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
