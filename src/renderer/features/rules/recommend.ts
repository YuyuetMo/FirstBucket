import type { UserProfile } from '../../@core/domain/user';
import { RULES, type Rule } from '../../@core/domain/rule';

export interface RuleScore {
  rule: Rule;
  score: number;
}

// 按画像为 12 法则打分排序（M2 推荐）
export function recommend(profile: UserProfile): RuleScore[] {
  return RULES.map((rule) => ({ rule, score: Math.round(rule.applicability(profile)) })).sort(
    (a, b) => b.score - a.score,
  );
}
