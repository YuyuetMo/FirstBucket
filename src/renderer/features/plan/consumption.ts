// 消费类 / 分配类 实际金额计算（v1.7.3 抽取，统一收入级法则与执行清单/仪表盘逻辑）。
// 关键：消费类实际只统计「纯消费桶」（CONSUMPTION_KEYS），
//      储蓄 / 投资 / 保险 / 保本 等「分配桶」不再计入消费，避免双重计算。
import type { UserProfile } from '../../@core/domain/user';
import type { Rule } from '../../@core/domain/rule';
import { getRuleActuals } from './ruleActuals';
import { CONSUMPTION_KEYS } from '../budget/waterfall';

/**
 * 计算「消费类实际月额」：
 *  - 有法则时 = 该法则「纯消费桶」各桶 RuleActuals 合计（v1.7 逐桶填写）
 *  - 无法则时 = 0（不再回退旧字段，避免混淆数据来源）
 * 返回 [值, 是否来自旧档案回退] 元组
 */
export function consumptionActualOf(profile: UserProfile, rule?: Rule): [number, boolean] {
  if (rule) {
    const actuals = getRuleActuals(rule.id);
    const sum = rule.allocations
      .filter((a) => CONSUMPTION_KEYS.has(a.bucketKey ?? ''))
      .reduce((s, a) => s + (actuals[a.bucketKey ?? ''] || 0), 0);
    if (sum > 0) return [sum, false];
    // 有法则但用户还没填任何消费实际值 → 回退旧字段并标记
    const legacy = (profile.fixedExpenses || 0) + (profile.variableExpenses || 0);
    return [legacy > 0 ? legacy : 0, true];
  }
  return [0, false];
}

/** 分配桶（储蓄/投资/保险/保本等，非消费类）的实际填写明细 */
export interface AllocationActual {
  label: string;
  key: string;
  amount: number;
}

export function allocationActualOf(rule: Rule): AllocationActual[] {
  const actuals = getRuleActuals(rule.id);
  return rule.allocations
    .filter((a) => !CONSUMPTION_KEYS.has(a.bucketKey ?? ''))
    .map((a) => ({ label: a.label, key: a.bucketKey ?? '', amount: actuals[a.bucketKey ?? ''] || 0 }));
}
