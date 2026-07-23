// RuleActuals 门面（v2.2 起委托月度账本 monthlyLedger）。
// v1.7 的扁平快照升级为按月账页：本模块保留原 API 不变，
// 内部全部读写「当前月」账页 —— 跨月自动开新账页，历史月份数据保留可回看。
// 旧 localStorage key 'fb_rule_actuals' 由 monthlyLedger 首次加载时自动迁入当前月（保留备份）。

import { currentYm, getMonthActuals, setMonthActual, setMonthActualsBulk, clearMonthActuals } from './monthlyLedger';

/** { [ruleId]: { [bucketKey]: number（元/月） } } */
export interface RuleActualsMap {
  [ruleId: string]: Record<string, number>;
}

/** 读取某条法则「当前月」的所有桶实际值 */
export function getRuleActuals(ruleId: string): Record<string, number> {
  return getMonthActuals(currentYm(), ruleId);
}

/** 写入某条法则「当前月」的某个桶实际值 */
export function setRuleActual(ruleId: string, bucketKey: string, amount: number): void {
  setMonthActual(currentYm(), ruleId, bucketKey, amount);
}

/** 批量写入某条法则「当前月」的所有桶实际值（如从表单一次性提交） */
export function setRuleActualsBulk(ruleId: string, actuals: Record<string, number>): void {
  setMonthActualsBulk(currentYm(), ruleId, actuals);
}

/** 清除某条法则「当前月」的所有实际值（如法则被删除后清理） */
export function clearRuleActuals(ruleId: string): void {
  clearMonthActuals(currentYm(), ruleId);
}
