import type { UserProfile } from '../../@core/domain/user';
import { monthlyDisposable } from '../../@core/domain/user';

export interface Badge {
  id: string;
  icon: string;
  label: string;
  desc: string;
  earned: boolean;
}

/** 财务健康分：档案完整度 0-100（本地计算，无服务器） */
export function computeHealthScore(p: UserProfile): number {
  const checks: boolean[] = [
    (p.monthlyIncome ?? 0) > 0,
    (p.fixedExpenses ?? 0) > 0,
    (p.currentSavings ?? 0) > 0,
    (p.variableExpenses ?? 0) > 0,
    (p.age ?? 0) > 0,
    !!p.riskProfile,
    (p.goals?.length ?? 0) > 0,
    (p.debts?.length ?? 0) > 0,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

/** 成就徽章：从真实财务指标派生（T05，数据达成型，移除「用功能就亮」逻辑） */
export function computeBadges(
  p: UserProfile,
  ctx: { hasPlan: boolean },
): Badge[] {
  const disposable = p ? monthlyDisposable(p) : 0;
  const monthlyVar = p?.variableExpenses ?? 0;
  const monthlyOut = (p?.fixedExpenses ?? 0) + monthlyVar;
  const emergencyOk =
    (p?.currentSavings ?? 0) >= 3 * monthlyOut && monthlyOut > 0;
  return [
    { id: 'surplus', icon: '💰', label: '月盈余转正', desc: '每月可支配收入为正', earned: disposable > 0 },
    { id: 'emergency', icon: '🛡️', label: '应急金达标', desc: '储蓄 ≥ 3 倍月支出', earned: emergencyOk },
    { id: 'goal', icon: '🎯', label: '目标已设', desc: '已设定至少一个财务目标', earned: (p?.goals?.length ?? 0) > 0 },
    { id: 'plan', icon: '📊', label: '方案已生成', desc: '已生成并保存理财方案', earned: ctx.hasPlan },
    { id: 'classify', icon: '🏷️', label: '收支已分类', desc: '已完成收支分类录入', earned: monthlyVar > 0 },
  ];
}

/** 应急金倍数（用于文案） */
export function emergencyMultiple(p: UserProfile): number {
  const fe = p.fixedExpenses ?? 0;
  if (fe <= 0) return 0;
  return Math.round(((p.currentSavings ?? 0) / fe) * 10) / 10;
}
