// 现金流瀑布分配（v1.5 / 路线B，用户诉求：法则应结合真实固定/变动支出，而非纯按收入比例硬切）。
// v1.7.1 重构：消费类实际不再读 profile.fixed/variable，改为由调用方传入「消费类实际月额」
//   （= 当前法则各消费桶 RuleActuals 合计；旧档案回退 fixed+variable）。
// 模型：
//   税后月收入 − 消费类实际 − 月负债 = 可自由可支配 D'
//   D' 按所选法则「留存/增值类」桶的相对比例归一化分配（消费/生活类桶用用户真实开销替代）
// 纯函数：不读全局态、不改 profile；仅复用 applyRule。
import type { UserProfile } from '../../@core/domain/user';
import { effectiveIncome, totalMonthlyDebt } from '../../@core/domain/user';
import type { Rule } from '../../@core/domain/rule';
import { applyRule } from './engine';

// 消费/生活类 bucketKey —— 这些桶被「用户逐桶实际金额」替代，不参与可支配再分配。
// 其余桶（储蓄/投资/保险/保本/增值类）视为「留存类」，按比例分配可自由支配额。
export const CONSUMPTION_KEYS: ReadonlySet<string> = new Set([
  'living', // 4321 生活开销
  'need',   // 50/30-20 必需 / 六罐子必需
  'cash',   // 标普象限 要花的钱
  'want',   // 50/30-20 想要
  'play',   // 六罐子玩乐
  'culture',// 文化（通用）
  'surprise',// 突发（通用）
  'edu',    // 六罐子教育
  'give',   // 六罐子捐赠
]);

// 投资/保险/增值类 bucketKey —— 这些钱有独立去处（投资账户 / 保险配置），不进「保命钱三桶」。
const NON_SAVING_KEYS: RegExp = /invest|investment|insurance|insure|grow/i;

export interface WaterfallItem {
  label: string;
  bucketKey: string;
  color: string;
  pctOfDisposable: number; // 归一化后占可支配比例 0-1
  amount: number;          // 实际分配金额（可支配 × pct）
  isSaving: boolean;       // 是否属于「储蓄类」（进三桶），用于区分可攒 vs 投资/保险
}

export interface Waterfall {
  income: number;            // 税后月收入
  consumption: number;       // 消费类实际月额（你为各桶填写的合计）
  debt: number;              // 月负债
  disposable: number;        // 可自由支配 = 税后收入 − 消费类实际 − 负债（下限 0）
  livingActual: number;      // 实际生活开销 = 消费类实际（展示用）
  ruleLivingSuggest: number; // 法则建议的生活/消费配额合计（诊断对比用；投资级法则为 0）
  hasSuggest: boolean;       // 该法则是否含消费类桶（收入级法则 true，纯投资级 false）
  items: WaterfallItem[];    // 法则留存/增值桶按比例分配可支配的结果
  savingAmount: number;      // 进「保命钱三桶」的钱（留存类排除投资/保险后，按可支配缩放；无法则时=可支配）
}

/**
 * 构建现金流瀑布（路线 B 核心）。
 * @param profile 用户档案（提供税后收入 / 负债）
 * @param rule    所选法则（可选；未选时仅返回瀑布顶层，items 为空，savingAmount=可支配）
 * @param consumptionActual 消费类实际月额（v1.7.1：来自当前法则 RuleActuals 合计；不传则回退旧字段）
 */
export function buildWaterfall(profile: UserProfile, rule?: Rule, consumptionActual?: number): Waterfall {
  const income = effectiveIncome(profile);
  const debt = totalMonthlyDebt(profile);
  const consumption = consumptionActual ?? ((profile.fixedExpenses || 0) + (profile.variableExpenses || 0));
  const disposable = Math.max(0, income - consumption - debt);

  let items: WaterfallItem[] = [];
  let ruleLivingSuggest = 0;
  let hasSuggest = false;
  let savingAmount = 0;

  if (rule && rule.scope !== 'withdraw') {
    // 收入级法则：applyRule 基数=整月收入；投资级法则：基数=投资池(可支配)
    const raw = applyRule(profile, rule);

    const consumptionBuckets = raw.filter((b) => CONSUMPTION_KEYS.has(b.bucketKey ?? ''));
    hasSuggest = consumptionBuckets.length > 0;
    ruleLivingSuggest = consumptionBuckets.reduce((s, b) => s + b.monthlyAmount, 0);

    // 留存/增值类桶：参与可支配再分配（生活消费已用真实支出替代）
    const keep = raw.filter((b) => !CONSUMPTION_KEYS.has(b.bucketKey ?? ''));
    const keepTotal = keep.reduce((s, b) => s + b.monthlyAmount, 0);

    // 进「保命钱三桶」的钱 = 留存类中排除投资/保险/增值类后的部分（如 4321 的「储蓄」）
    const savingRaw = keep
      .filter((b) => !NON_SAVING_KEYS.test(b.bucketKey ?? ''))
      .reduce((s, b) => s + b.monthlyAmount, 0);
    if (keepTotal > 0 && disposable > 0) {
      savingAmount = disposable * (savingRaw / keepTotal);
    }

    if (keepTotal > 0 && disposable > 0) {
      items = keep.map((b) => {
        const pct = b.monthlyAmount / keepTotal;
        return {
          label: b.name,
          bucketKey: b.bucketKey ?? '',
          color: b.color,
          pctOfDisposable: pct,
          amount: Math.round(disposable * pct),
          isSaving: !NON_SAVING_KEYS.test(b.bucketKey ?? ''),
        };
      });
    }
  }

  // 无法则时：整个可支配皆可视为「储蓄池」兜底
  if (!rule) savingAmount = disposable;

  return {
    income: Math.round(income),
    consumption: Math.round(consumption),
    debt: Math.round(debt),
    disposable: Math.round(disposable),
    livingActual: Math.round(consumption),
    ruleLivingSuggest: Math.round(ruleLivingSuggest),
    hasSuggest,
    items,
    savingAmount: Math.round(savingAmount),
  };
}
