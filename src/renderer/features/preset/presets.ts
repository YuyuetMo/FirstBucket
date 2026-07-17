// 人群预设权重映射 —— 仅影响推荐排序，计算引擎忽略（设计文档 §3.5 / §7.6）
import type { UserProfile } from '../../@core/domain/user';
import type { RuleId } from '../../@core/domain/rule';
import { recommend, type RuleScore } from '../rules/recommend';

/** 6 类人群预设 id */
export type PresetId = 'student' | 'newgrad' | 'single' | 'dualincome' | 'family' | 'preretire';

/** 预设定义：展示层推荐权重，叠加到 recommend() 结果影响排序 */
export interface PresetDef {
  id: PresetId;
  label: string;
  desc: string;
  icon: string;
  /** 推荐高分的法则 id（仅影响排序展示） */
  recommendRules: RuleId[];
  /** 法则 id -> 推荐权重加成（叠加到 applicability 分数上） */
  weights: Partial<Record<RuleId, number>>;
}

/** 6 类人群预设（数值由产品经理拍板，架构师落表） */
export const PRESETS: PresetDef[] = [
  {
    id: 'student',
    label: '学生',
    desc: '收入有限、无负债压力，重在养成储蓄与记账习惯',
    icon: '🎓',
    recommendRules: ['50-30-20', 'six-jars', 'kakeibo'],
    weights: { '50-30-20': 16, 'six-jars': 12, kakeibo: 12 },
  },
  {
    id: 'newgrad',
    label: '职场新人',
    desc: '刚工作、收入起步，建立应急金与基础投资',
    icon: '🌱',
    recommendRules: ['4321', '50-30-20', 'core-satellite'],
    weights: { '4321': 16, '50-30-20': 12, 'core-satellite': 10 },
  },
  {
    id: 'single',
    label: '单身白领',
    desc: '收入稳定、责任较轻，可适度进取增值',
    icon: '💼',
    recommendRules: ['4321', '50-30-20', 'buffett-90-10'],
    weights: { '4321': 14, '50-30-20': 12, 'buffett-90-10': 12 },
  },
  {
    id: 'dualincome',
    label: '已婚双职工',
    desc: '双收入、现金流充裕，重视稳健与长期配置',
    icon: '👫',
    recommendRules: ['50-30-20', '60-40', 'buffett-90-10'],
    weights: { '50-30-20': 14, '60-40': 12, 'buffett-90-10': 12 },
  },
  {
    id: 'family',
    label: '三口之家',
    desc: '有育儿与保障需求，强调安全垫与分散',
    icon: '🏠',
    recommendRules: ['50-30-20', 'sp-quadrant', 'all-weather'],
    weights: { '50-30-20': 14, 'sp-quadrant': 12, 'all-weather': 10 },
  },
  {
    id: 'preretire',
    label: '临退休',
    desc: '临近退休，降低波动、保本金与现金流',
    icon: '🌅',
    recommendRules: ['four-percent', 'coast-fire', '100-age'],
    weights: { 'four-percent': 16, 'coast-fire': 14, '100-age': 12 },
  },
];

/** 按 id 取预设定义 */
export function getPreset(id: PresetId | null | undefined): PresetDef | undefined {
  if (!id) return undefined;
  return PRESETS.find((p) => p.id === id);
}

/**
 * 在 recommend(profile) 结果上叠加预设权重，影响排序（不影响引擎计算）。
 * 纯函数：不读全局态、不改 profile。
 */
export function recommendWithPreset(profile: UserProfile, presetId?: PresetId | null): RuleScore[] {
  const base = recommend(profile);
  const preset = getPreset(presetId);
  if (!preset) return base;
  const boosted = base.map((rs) => {
    const w = preset.weights[rs.rule.id as RuleId] ?? 0;
    return { rule: rs.rule, score: Math.min(100, Math.round(rs.score + w)) };
  });
  boosted.sort((a, b) => b.score - a.score);
  return boosted;
}
