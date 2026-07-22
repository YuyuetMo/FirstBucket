import type { UserProfile } from './user';
import { loadCustomRules } from '../../features/rules/customRules';

export type RuleId =
  | '4321'
  | 'sp-quadrant'
  | '100-age'
  | '50-30-20'
  | 'core-satellite'
  | 'all-weather'
  | 'six-jars'
  | 'permanent-portfolio'
  | 'four-percent'
  | 'buffett-90-10'
  | '60-40';

export interface Allocation {
  label: string;
  pct: number; // 占月收入百分比 0-100
  bucketKey: string;
  color: string;
}

export interface Rule {
  /** v1.3：放宽以支持自定义法则（R8，id 形如 custom-<timestamp>） */
  id: RuleId | string;
  name: string;
  description: string;
  tags: string[];
  allocations: Allocation[];
  /** 作用域：income=切整月收入 / invest=切投资池 / withdraw=提领（不参与方案） */
  scope: 'income' | 'invest' | 'withdraw';
  /** 推荐打分 0-100，越高越匹配当前画像 */
  applicability: (p: UserProfile) => number;
  /** v1.3(R1)：适配的人生阶段（六阶段 PresetId）；标注为初稿，待设计师终审（O2） */
  lifeStages: string[];
  /** v1.3(R8)：自定义法则标记（内置为 undefined） */
  custom?: boolean;
  /** v1.5.1：备用金目标月数（收入级法则差异化，默认 3）。用于解释「为什么要存到这个数」。 */
  reserveTargetMonths?: number;
  /** v1.5.1：备用金理念（法则特色解释，可选）。有则优先展示，否则用通用模板。 */
  reserveRationale?: string;
}

// —— 12 个内置理财法则（M2）——
export const RULES: Rule[] = [
  {
    id: '4321',
    name: '4321 法则',
    description: '40% 生活 / 30% 储蓄 / 20% 投资 / 10% 保险',
    tags: ['均衡', '入门'],
    scope: 'income',
    // O2: 待设计师终审
    lifeStages: ['newgrad', 'single', 'dualincome', 'family'],
    reserveTargetMonths: 3,
    reserveRationale: '先保障后增值——3 个月应急金是底线，填满后再谈投资与保险。',
    allocations: [
      { label: '生活开销', pct: 40, bucketKey: 'living', color: '#D4A857' },
      { label: '储蓄', pct: 30, bucketKey: 'saving', color: '#5BA3A8' },
      { label: '投资', pct: 20, bucketKey: 'invest', color: '#C97B63' },
      { label: '保险', pct: 10, bucketKey: 'insurance', color: '#8E7CC3' },
    ],
    applicability: (p) => (p.riskProfile === 'balanced' ? 90 : 70),
  },
  {
    id: 'sp-quadrant',
    name: '标普家庭资产象限',
    description: '要花的钱 / 保命的钱 / 生钱的钱 / 保本的钱',
    tags: ['四象限', '稳健'],
    scope: 'income',
    // O2: 待设计师终审
    lifeStages: ['newgrad', 'single', 'dualincome', 'family', 'preretire'],
    reserveTargetMonths: 6,
    reserveRationale: '「保命的钱」占比高（20%），建议 6 个月更稳健，足以应对较长失业或大病周期。',
    allocations: [
      { label: '要花的钱', pct: 10, bucketKey: 'cash', color: '#D4A857' },
      { label: '保命的钱', pct: 20, bucketKey: 'protect', color: '#8E7CC3' },
      { label: '生钱的钱', pct: 30, bucketKey: 'grow', color: '#C97B63' },
      { label: '保本的钱', pct: 40, bucketKey: 'safe', color: '#5BA3A8' },
    ],
    applicability: (p) => (p.riskProfile === 'conservative' ? 92 : 68),
  },
  {
    id: '100-age',
    name: '100 − 年龄 法则',
    description: '权益类占比 ≈ (100 − 年龄)%',
    tags: ['年龄', '权益'],
    scope: 'invest',
    // O2: 待设计师终审
    lifeStages: ['single', 'dualincome', 'family'],
    allocations: [
      { label: '权益类', pct: 60, bucketKey: 'equity', color: '#C97B63' },
      { label: '固收类', pct: 40, bucketKey: 'bond', color: '#5BA3A8' },
    ],
    applicability: (p) => (p.riskProfile === 'aggressive' ? 88 : 60),
  },
  {
    id: '50-30-20',
    name: '50/30/20 预算法',
    description: '50% 必需 / 30% 想要 / 20% 储蓄投资',
    tags: ['预算', '入门'],
    scope: 'income',
    // O2: 待设计师终审
    lifeStages: ['student', 'newgrad', 'single', 'dualincome', 'family'],
    reserveTargetMonths: 3,
    reserveRationale: '20% 储蓄投资里优先留 3 个月应急金，再考虑增值。',
    allocations: [
      { label: '必需支出', pct: 50, bucketKey: 'need', color: '#D4A857' },
      { label: '想要支出', pct: 30, bucketKey: 'want', color: '#C97B63' },
      { label: '储蓄投资', pct: 20, bucketKey: 'save', color: '#5BA3A8' },
    ],
    applicability: (p) => (p.currentSavings < 50000 ? 85 : 65),
  },
  {
    id: 'core-satellite',
    name: '核心-卫星策略',
    description: '核心 80% 稳健 + 卫星 20% 进取',
    tags: ['组合', '进阶'],
    scope: 'invest',
    // O2: 待设计师终审
    lifeStages: ['single', 'dualincome', 'family'],
    allocations: [
      { label: '核心资产', pct: 80, bucketKey: 'core', color: '#5BA3A8' },
      { label: '卫星资产', pct: 20, bucketKey: 'satellite', color: '#C97B63' },
    ],
    applicability: (p) => (p.riskProfile === 'aggressive' ? 90 : 62),
  },
  {
    id: 'all-weather',
    name: '全天候策略',
    description: '跨资产风险平价，穿越周期',
    tags: ['配置', '进阶'],
    scope: 'invest',
    // O2: 待设计师终审
    lifeStages: ['dualincome', 'family', 'preretire'],
    allocations: [
      { label: '股票', pct: 30, bucketKey: 'stock', color: '#C97B63' },
      { label: '长期国债', pct: 40, bucketKey: 'ltbond', color: '#5BA3A8' },
      { label: '中期国债', pct: 15, bucketKey: 'mtbond', color: '#8E7CC3' },
      { label: '商品', pct: 15, bucketKey: 'commodity', color: '#D4A857' },
    ],
    applicability: (p) => (p.investHorizonMonths > 120 ? 86 : 58),
  },
  {
    id: 'six-jars',
    name: '六罐子理财法',
    description: '六账户分配：必需/投资/储蓄/教育/玩乐/捐赠',
    tags: ['账户', '趣味'],
    scope: 'income',
    // O2: 待设计师终审
    lifeStages: ['student', 'newgrad', 'single', 'family'],
    reserveTargetMonths: 3,
    reserveRationale: '在「财务自由账户」之外，先留 3 个月应急金作为流动性安全垫。',
    allocations: [
      { label: '必需', pct: 55, bucketKey: 'need', color: '#D4A857' },
      { label: '投资', pct: 10, bucketKey: 'invest', color: '#C97B63' },
      { label: '储蓄', pct: 10, bucketKey: 'save', color: '#5BA3A8' },
      { label: '教育', pct: 10, bucketKey: 'edu', color: '#8E7CC3' },
      { label: '玩乐', pct: 10, bucketKey: 'play', color: '#E0A96D' },
      { label: '捐赠', pct: 5, bucketKey: 'give', color: '#A3B86B' },
    ],
    applicability: () => 72,
  },
  {
    id: 'permanent-portfolio',
    name: '永久组合（Permanent Portfolio）',
    description: '股票 / 长期国债 / 黄金 / 短期国债 各 25%',
    tags: ['配置', '防御', '经典'],
    scope: 'invest',
    lifeStages: ['single', 'dualincome', 'family', 'preretire'],
    allocations: [
      { label: '股票', pct: 25, bucketKey: 'equity', color: '#C97B63' },
      { label: '长期国债', pct: 25, bucketKey: 'ltbond', color: '#5BA3A8' },
      { label: '黄金', pct: 25, bucketKey: 'gold', color: '#D4A857' },
      { label: '短期国债', pct: 25, bucketKey: 'tbill', color: '#8E7CC3' },
    ],
    applicability: (p) => (p.riskProfile === 'conservative' ? 88 : 68),
  },
  {
    id: 'four-percent',
    name: '4% 提取法则',
    description: '退休后年提取不超过本金 4%',
    tags: ['退休', '提领'],
    scope: 'withdraw',
    // O2: 待设计师终审
    lifeStages: ['preretire'],
    allocations: [
      { label: '生活提取', pct: 4, bucketKey: 'withdraw', color: '#D4A857' },
      { label: '本金留存', pct: 96, bucketKey: 'principal', color: '#5BA3A8' },
    ],
    applicability: (p) => (p.investHorizonMonths > 240 ? 84 : 50),
  },
  {
    id: 'buffett-90-10',
    name: '巴菲特 90/10',
    description: '90% 低成本指数 + 10% 短期国债',
    tags: ['指数', '经典'],
    scope: 'invest',
    // O2: 待设计师终审
    lifeStages: ['newgrad', 'single', 'dualincome', 'family'],
    allocations: [
      { label: '指数基金', pct: 90, bucketKey: 'index', color: '#C97B63' },
      { label: '短期国债', pct: 10, bucketKey: 'tbill', color: '#5BA3A8' },
    ],
    applicability: (p) => (p.riskProfile !== 'conservative' ? 80 : 55),
  },
  {
    id: '60-40',
    name: '60/40 经典组合',
    description: '60% 股票 + 40% 债券',
    tags: ['组合', '经典'],
    scope: 'invest',
    // O2: 待设计师终审
    lifeStages: ['dualincome', 'family', 'preretire'],
    allocations: [
      { label: '股票', pct: 60, bucketKey: 'stock', color: '#C97B63' },
      { label: '债券', pct: 40, bucketKey: 'bond', color: '#5BA3A8' },
    ],
    applicability: (p) => (p.riskProfile === 'balanced' ? 82 : 64),
  },
];

/**
 * 解析法则：先查内置 RULES，未命中再查自定义法则（localStorage fb_custom_rules）。
 * 纯解析入口扩展，不影响引擎纯函数语义（设计文档 T09 / §3.2）。
 */
export function getRule(id: string): Rule | undefined {
  return RULES.find((r) => r.id === id) ?? loadCustomRules().find((r) => r.id === id);
}

/** 按作用域筛选法则（组合引擎 / UI 分组用，设计文档 T09/T10） */
export function getRulesByScope(scope: Rule['scope']): Rule[] {
  return RULES.filter((r) => r.scope === scope);
}
