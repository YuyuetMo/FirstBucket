// 偏离判定纯函数：超支 / 单桶超配比（设计文档 §3.7 / T03）
import type { UserProfile } from '../../@core/domain/user';
import { totalMonthlyIncome } from '../../@core/domain/user';
import type { Rule } from '../../@core/domain/rule';
import { WARN_THRESHOLDS, type WarnThresholds } from './thresholds';

/** 单桶占比偏高阈值（占月收入百分比） */
const ALLOC_CONCENTRATION_CAP = 70;

/** 偏离预警对象 */
export interface DeviationWarning {
  id: string;
  severity: 'warning';
  title: string;
  message: string;
  bucketKey?: string;
  ruleId: string;
}

/**
 * 超支判定（与法则无关）：固定+变动支出 / 月收入 超过阈值即命中。
 * 纯函数，阈值可注入（默认 WARN_THRESHOLDS）。供无选定法则时（如档案页）单独使用。
 */
export function detectOverspend(
  profile: UserProfile,
  thresholds: WarnThresholds = WARN_THRESHOLDS,
): DeviationWarning | null {
  const income = totalMonthlyIncome(profile);
  if (income <= 0) return null;
  const expenseRatio = (profile.fixedExpenses + profile.variableExpenses) / income;
  if (expenseRatio <= thresholds.deviation.totalExpenseRatioMax) return null;
  return {
    id: 'deviation-overspend',
    severity: 'warning',
    title: '支出超过收入',
    message: `固定+变动支出约占月收入的 ${Math.round(expenseRatio * 100)}%，已超过 100%。建议压缩非必要支出或增加收入。`,
    ruleId: '',
  };
}

/**
 * 偏离判定：支出/收入比超阈值 → 超支；单桶占比超过 70% → 集中度偏高。
 * 纯函数，阈值可注入（默认 WARN_THRESHOLDS）。
 */
export function detectDeviation(
  profile: UserProfile,
  rule: Rule,
  thresholds: WarnThresholds = WARN_THRESHOLDS,
): DeviationWarning[] {
  const out: DeviationWarning[] = [];
  const over = detectOverspend(profile, thresholds);
  if (over) out.push({ ...over, ruleId: rule.id });
  for (const a of rule.allocations) {
    if (a.pct > ALLOC_CONCENTRATION_CAP) {
      out.push({
        id: `deviation-concentration-${a.bucketKey}`,
        severity: 'warning',
        title: '单桶占比偏高',
        message: `「${a.label}」占月收入 ${a.pct}%，比例偏高，建议结合其他法则分散配置。`,
        bucketKey: a.bucketKey,
        ruleId: rule.id,
      });
    }
  }
  return out;
}
