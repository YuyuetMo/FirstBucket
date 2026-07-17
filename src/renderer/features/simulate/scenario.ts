// What-if 场景派生（R4 / T05，设计文档 §3.2 / O3）。
// 纯函数：输入基准档案 + 场景杠杆，返回派生 UserProfile，不改 base。
// 通胀率/年薪涨幅按 (1+r)^(investHorizonMonths/12) 复合；大额支出按一次性流出从储蓄扣除；
// 失业月份取前 N 月 income=0（按总期平均折算）。全部局限在 What-if Tab 内（非全局持久化，区别于被排除的 M4 通胀开关）。
import type { UserProfile } from '../../@core/domain/user';

export interface WhatIfScenario {
  /** 年薪涨幅 % */
  salaryRaisePct: number;
  /** 通胀率 %（仅本场景临时杠杆） */
  inflationPct: number;
  /** 大额支出金额 ¥（一次性流出） */
  lumpExpense: number;
  /** 大额支出发生月序号 */
  lumpMonth: number;
  /** 失业月数（前 N 月 income=0） */
  unemploymentMonths: number;
}

/** 把场景杠杆复合进基准档案，返回派生档案（纯函数，不修改入参） */
export function deriveScenarioProfile(base: UserProfile, s: WhatIfScenario): UserProfile {
  const months = Math.max(1, base.investHorizonMonths || 120);
  const years = months / 12;

  const salaryFactor = Math.pow(1 + s.salaryRaisePct / 100, years);
  const inflFactor = Math.pow(1 + s.inflationPct / 100, years);

  let monthlyIncome = base.monthlyIncome * salaryFactor;
  // 失业月份：前 N 月收入为 0，按总期平均折算月收入
  if (s.unemploymentMonths > 0) {
    const n = Math.min(s.unemploymentMonths, months);
    monthlyIncome = (monthlyIncome * (months - n)) / months;
  }

  const fixedExpenses = base.fixedExpenses * inflFactor;
  const variableExpenses = base.variableExpenses * inflFactor;
  // 大额支出：第 lumpMonth 月一次性扣减 → 从当前储蓄扣除（一次性流出）
  const currentSavings = Math.max(0, base.currentSavings - Math.max(0, s.lumpExpense));

  return {
    ...base,
    monthlyIncome,
    fixedExpenses,
    variableExpenses,
    currentSavings,
  };
}
