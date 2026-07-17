// 分类器（C7 / T07，设计文档 §3.4）。
//  · classify(text)：关键词预填 → 命中偏好记忆 → 否则 other
//  · toMonthlyAmount(item)：一次性 ÷12、年度 ÷12、月度不变
//  · normalize(raw)：用户输入 → ExpenseItem
import type { ExpenseCategory, ExpenseItem } from '../../@core/domain/user';
import { KEYWORD_MAP } from './keywordMap';
import { loadOverride } from './memory';

/** 关键词匹配分类（优先用户记忆覆盖） */
export function classify(text: string): ExpenseCategory {
  const override = loadOverride(text);
  if (override) return override;
  for (const [kw, cat] of Object.entries(KEYWORD_MAP)) {
    if (text.includes(kw)) return cat;
  }
  return 'other';
}

/** 频率 → 月均金额（一次性大额摊入 12 个月） */
export function toMonthlyAmount(item: ExpenseItem): number {
  if (item.frequency === 'once' || item.frequency === 'annual') return item.amount / 12;
  return item.amount;
}

/** 原始输入 → ExpenseItem（系统预填类别） */
export function normalize(raw: {
  text: string;
  amount: number;
  frequency: ExpenseItem['frequency'];
}): ExpenseItem {
  const systemCategory = classify(raw.text);
  return {
    id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: raw.text,
    amount: raw.amount,
    frequency: raw.frequency,
    systemCategory,
  };
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  'medical-emergency': '医疗应急',
  entertainment: '娱乐消费',
  social: '社交维系',
  'home-repair': '家居维修',
  other: '其他',
};

export const CATEGORY_ORDER: ExpenseCategory[] = [
  'medical-emergency',
  'entertainment',
  'social',
  'home-repair',
  'other',
];
