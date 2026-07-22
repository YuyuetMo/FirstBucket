// 法则桶 ↔ 用户真实资料 对比映射（v1.6，设计文档 §3.x）。
// 零资料改动：固定支出=必需桶、变动支出=想要桶、可自由可支配=储蓄投资桶。
// 纯函数，不读全局态、不改 profile。

import type { UserProfile } from '../../@core/domain/user';
import { monthlyDisposable } from '../../@core/domain/user';
import type { Rule } from '../../@core/domain/rule';
import { isInvestmentKey } from './investmentBuckets';

/** 必需消费类 bucketKey（你填的「固定支出」映射这里） */
const NEED_KEYS = new Set(['living', 'need', 'cash', 'withdraw']);
/** 想要/弹性消费类 bucketKey（你填的「变动支出」映射这里） */
const WANT_KEYS = new Set(['want', 'play', 'edu', 'give', 'surprise', 'culture']);
/** 保本/保命类 bucketKey（配置类，非消费非增值） */
const PROTECT_KEYS = new Set(['protect', 'safe']);

export type BucketKind = 'need' | 'want' | 'protect' | 'invest';

/** 判定某桶性质 */
export function bucketKind(key?: string): BucketKind {
  if (!key) return 'invest';
  if (NEED_KEYS.has(key)) return 'need';
  if (WANT_KEYS.has(key)) return 'want';
  if (PROTECT_KEYS.has(key)) return 'protect';
  if (isInvestmentKey(key)) return 'invest';
  return 'need';
}

/**
 * 某桶「你的真实支出」金额。
 * - need 桶：若法则含想要桶，则映射固定支出；否则（单一消费桶，如 4321 生活）映射固定+变动合计
 * - want 桶：映射变动支出
 * - protect/invest（配置类）：返回 null，由 applyRule 基于可自由可支配自动分配
 */
export function actualForBucket(rule: Rule, bucketKey: string | undefined, profile: UserProfile): number | null {
  const kind = bucketKind(bucketKey);
  if (kind === 'need') {
    const hasWant = rule.allocations.some((a) => WANT_KEYS.has(a.bucketKey));
    return hasWant ? profile.fixedExpenses || 0 : (profile.fixedExpenses || 0) + (profile.variableExpenses || 0);
  }
  if (kind === 'want') return profile.variableExpenses || 0;
  return null;
}

/** 配置类桶（保本/投资）的说明文案 */
export function configNote(kind: BucketKind, disposable: number): string {
  const d = `¥${Math.round(disposable).toLocaleString()}`;
  return kind === 'protect'
    ? `保本 / 保命配置 · 按你的可自由可支配 ${d} 自动分配`
    : `储蓄投资 · 基于你的可自由可支配 ${d}`;
}

/** 可自由可支配（复用既有纯函数） */
export function disposableOf(p: UserProfile): number {
  return monthlyDisposable(p);
}
