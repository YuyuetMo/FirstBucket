// 方案点评规则集 —— 纯函数，无副作用（设计文档 §3.4 / §7.3）
import type { UserProfile } from '../../@core/domain/user';
import type { Bucket } from '../../@core/domain/bucket';
import type { Rule } from '../../@core/domain/rule';
import type { Badge } from '../profile/health';
import type { PlanView } from '../plan/metrics';

/** 健康分聚合结果（复用 health.ts 的 Badge 与 emergencyMultiple） */
export interface HealthResult {
  score: number;
  badges: Badge[];
  emergencyMultiple: number;
}

/** 方案视图（派生自 metrics.buildPlanView） */
export type { PlanView };

/** 点评上下文：传入当前档案、方案视图、健康结果与选定法则（组合模式无单一 rule，故可选） */
export interface ReviewContext {
  profile: UserProfile;
  plan: PlanView;
  health: HealthResult;
  rule?: Rule;
}

/** 单条点评命中：标签 + 评语（≤60 字） */
export interface ReviewHit {
  tag: string;
  text: string;
}

/** 点评规则：test 为纯函数，命中返回 ReviewHit，否则返回 null */
export interface ReviewRule {
  id: string;
  tag: string;
  test: (ctx: ReviewContext) => ReviewHit | null;
}

/** 点评规则集（按优先级顺序匹配，buildReviews 收集非 null，最多 5 条） */
export const REVIEW_RULES: ReviewRule[] = [
  {
    id: 'emergency-fund',
    tag: '应急金不足',
    test: (ctx) =>
      ctx.health.emergencyMultiple < 3
        ? { tag: '应急金不足', text: `应急金仅 ${ctx.health.emergencyMultiple} 倍月固定支出，建议先补足至 3 倍再加大投资。` }
        : null,
  },
  {
    id: 'overspend',
    tag: '支出超收入',
    test: (ctx) => {
      const income = ctx.profile.monthlyIncome + ctx.profile.incomeAnnualBonus / 12 + ctx.profile.incomeOther;
      const expense = ctx.profile.fixedExpenses + ctx.profile.variableExpenses;
      if (income > 0 && expense / income > 1) {
        return { tag: '支出超收入', text: '固定+变动支出已超过月收入，持续透支会侵蚀复利本金，建议先控支出。' };
      }
      return null;
    },
  },
  {
    id: 'equity-high',
    tag: '权益占比偏高',
    test: (ctx) =>
      ctx.plan.equityRatio > 0.4 && ctx.profile.riskProfile === 'conservative'
        ? { tag: '权益占比偏高', text: `权益类占比约 ${Math.round(ctx.plan.equityRatio * 100)}%，与保守偏好不匹配，可考虑下调。` }
        : null,
  },
  {
    id: 'health-low',
    tag: '档案待完善',
    test: (ctx) =>
      ctx.health.score < 60
        ? { tag: '档案待完善', text: `财务健康分 ${ctx.health.score}，资料越完整，方案越贴合，建议补全设置。` }
        : null,
  },
  {
    id: 'no-goal',
    tag: '建议设目标',
    test: (ctx) =>
      (ctx.profile.goals?.length ?? 0) === 0
        ? { tag: '建议设目标', text: '尚未设定任何财务目标，给方案一个明确终点会更好坚持。' }
        : null,
  },
  {
    id: 'surplus-good',
    tag: '现金流健康',
    test: (ctx) =>
      ctx.plan.totalMonthly > 0 && ctx.health.emergencyMultiple >= 3
        ? { tag: '现金流健康', text: '每月有正向结余且应急金达标，可稳步执行该方案。' }
        : null,
  },
];

/**
 * 顺序匹配点评规则，收集非 null 的命中结果。
 * 纯函数：不读全局态、不改 profile/plan。
 */
export function buildReviews(ctx: ReviewContext): ReviewHit[] {
  const hits: ReviewHit[] = [];
  for (const rule of REVIEW_RULES) {
    const hit = rule.test(ctx);
    if (hit) hits.push(hit);
    if (hits.length >= 5) break;
  }
  return hits;
}
