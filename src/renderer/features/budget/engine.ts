import type { UserProfile } from '../../@core/domain/user';
import { totalMonthlyIncome, investmentPool } from '../../@core/domain/user';
import type { Rule } from '../../@core/domain/rule';
import type { Bucket } from '../../@core/domain/bucket';

// 应用所选法则 → 生成分桶配置（M3）
// 纯函数语义不变：仅加法扩展——
//  · 新增可选第 3 参数 baseOverride（组合引擎注入投资池）
//  · 返回对象补 bucketKey（投资桶识别 / 组合归一化用）
export function applyRule(profile: UserProfile, rule: Rule, baseOverride?: number): Bucket[] {
  const base =
    baseOverride ??
    (rule.scope === 'invest' ? investmentPool(profile) : totalMonthlyIncome(profile));
  return rule.allocations.map((a) => ({
    id: `${rule.id}-${a.bucketKey}`,
    ruleId: rule.id,
    name: a.label,
    color: a.color,
    monthlyAmount: Math.round((base * a.pct) / 100),
    bucketKey: a.bucketKey,
    note: `${a.pct}% · ${rule.name}`,
  }));
}

// 复利模拟（M4）：基于可支配投资额的月度复利
export interface CompoundPoint {
  month: number;
  value: number;
}

export function compoundSeries(
  monthlyInvest: number,
  annualRate: number,
  months: number,
): CompoundPoint[] {
  const r = annualRate / 12;
  const pts: CompoundPoint[] = [];
  let value = 0;
  for (let m = 0; m <= months; m++) {
    if (m > 0) value = value * (1 + r) + monthlyInvest;
    pts.push({ month: m, value: Math.round(value) });
  }
  return pts;
}
