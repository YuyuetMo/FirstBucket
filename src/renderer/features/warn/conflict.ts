// 冲突判定纯函数 + 权益桶占比（设计文档 §3.7 / T03）
import type { UserProfile } from '../../@core/domain/user';
import type { Rule } from '../../@core/domain/rule';
import { WARN_THRESHOLDS, type WarnThresholds } from './thresholds';

/** 视为「权益类」的桶 key 与标签关键词 */
const EQUITY_BUCKET_KEYS = ['equity', 'stock', 'index', 'satellite', 'grow'];
const EQUITY_LABEL_RE = /权益|股票|指数|进取|生钱/;

/**
 * 权益类桶占比（0-1）。
 * 对 100−年龄 法则，按 (100−年龄)% 直接计算；其余按法则分配中权益类桶占比。
 * 纯函数，不读全局态。
 */
export function getEquityRatio(profile: UserProfile, rule: Rule): number {
  if (rule.id === '100-age') {
    const age = profile.age ?? 0;
    return Math.max(0, Math.min(1, (100 - age) / 100));
  }
  const total = rule.allocations.reduce((s, a) => s + (a.pct || 0), 0);
  if (total <= 0) return 0;
  const equity = rule.allocations
    .filter((a) => EQUITY_BUCKET_KEYS.includes(a.bucketKey) || EQUITY_LABEL_RE.test(a.label))
    .reduce((s, a) => s + (a.pct || 0), 0);
  return Math.round((equity / total) * 100) / 100;
}

/** 冲突预警对象 */
export interface ConflictWarning {
  id: string;
  severity: 'warning' | 'danger';
  title: string;
  message: string;
  ruleId: string;
}

/**
 * 冲突判定：年龄 ≥ ageMin 且权益桶占比 > equityRatioMax 时返回冲突。
 * 纯函数，阈值可注入（默认 WARN_THRESHOLDS）。
 */
export function detectConflict(
  profile: UserProfile,
  rule: Rule,
  thresholds: WarnThresholds = WARN_THRESHOLDS,
): ConflictWarning | null {
  const age = profile.age ?? 0;
  if (age < thresholds.conflict.ageMin) return null;
  const ratio = getEquityRatio(profile, rule);
  if (ratio <= thresholds.conflict.equityRatioMax) return null;
  return {
    id: `conflict-${rule.id}`,
    severity: 'danger',
    title: '权益配置与年龄不匹配',
    message: `您当前 ${age} 岁，法则「${rule.name}」的权益类占比约 ${Math.round(ratio * 100)}%，高于 ${Math.round(
      thresholds.conflict.equityRatioMax * 100,
    )}% 的建议上限。临近退休阶段建议降低波动风险。`,
    ruleId: rule.id,
  };
}
