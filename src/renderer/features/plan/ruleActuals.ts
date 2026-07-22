// RuleActuals 持久化层（v1.7）
// 每条法则各自独立的「实际分配金额」记录。
// 用户在方案页为某法则的每个桶填写「我的实际支出/投入」，存入 localStorage。
// 切换法则时自动加载该法则上次填过的值。

const LS_KEY = 'fb_rule_actuals';

/** { [ruleId]: { [bucketKey]: number（元/月） } } */
export interface RuleActualsMap {
  [ruleId: string]: Record<string, number>;
}

function loadRaw(): RuleActualsMap {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as RuleActualsMap) : {};
  } catch {
    return {};
  }
}

function saveRaw(map: RuleActualsMap): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {
    // localStorage 满了等边缘情况静默降级
  }
}

/** 读取某条法则的所有桶实际值 */
export function getRuleActuals(ruleId: string): Record<string, number> {
  return loadRaw()[ruleId] ?? {};
}

/** 写入某条法则的某个桶实际值 */
export function setRuleActual(ruleId: string, bucketKey: string, amount: number): void {
  const map = loadRaw();
  if (!map[ruleId]) map[ruleId] = {};
  map[ruleId][bucketKey] = amount;
  saveRaw(map);
}

/** 批量写入某条法则的所有桶实际值（如从表单一次性提交） */
export function setRuleActualsBulk(ruleId: string, actuals: Record<string, number>): void {
  const map = loadRaw();
  map[ruleId] = { ...actuals };
  saveRaw(map);
}

/** 清除某条法则的所有实际值（如法则被删除后清理） */
export function clearRuleActuals(ruleId: string): void {
  const map = loadRaw();
  delete map[ruleId];
  saveRaw(map);
}
