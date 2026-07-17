// 现金流瀑布分配（v1.5 / 路线B，用户诉求：法则应结合真实固定/变动支出，而非纯按收入比例硬切）。
// 模型：
//   月收入 − 实际固定支出 − 实际变动支出 − 月负债 = 可自由支配 D'
//   D' 按所选法则「留存/增值类」桶的相对比例归一化分配（消费/生活类桶用用户真实开销替代）
// 纯函数：不读全局态、不改 profile；仅复用 applyRule。
import type { UserProfile } from '../../@core/domain/user';
import { totalMonthlyIncome, totalMonthlyDebt } from '../../@core/domain/user';
import type { Rule } from '../../@core/domain/rule';
import { applyRule } from './engine';

// 消费/生活类 bucketKey —— 这些桶被「用户真实固定+变动支出」替代，不参与可支配再分配。
// 其余桶（储蓄/投资/保险/保本/增值类）视为「留存类」，按比例分配可自由支配额。
const CONSUMPTION_KEYS: ReadonlySet<string> = new Set([
  'living', // 4321 生活开销 / Coast FIRE 日常
  'need',   // 50/30/20 必需 / 六罐子必需 / Kakeibo 需要
  'cash',   // 标普象限 要花的钱
  'want',   // 50/30/20 想要 / Kakeibo 想要
  'play',   // 六罐子玩乐
  'culture',// Kakeibo 文化
  'surprise',// Kakeibo 突发
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
  income: number;            // 总月收入
  fixed: number;             // 实际固定支出（用户填）
  variable: number;          // 实际变动支出（用户填）
  debt: number;              // 月负债
  disposable: number;        // 可自由支配 = income − fixed − variable − debt（下限 0）
  livingActual: number;      // 实际生活开销 = fixed + variable（展示用）
  ruleLivingSuggest: number; // 法则建议的生活/消费配额合计（诊断对比用；投资级法则为 0）
  hasSuggest: boolean;       // 该法则是否含消费类桶（收入级法则 true，纯投资级 false）
  items: WaterfallItem[];    // 法则留存/增值桶按比例分配可支配的结果
  savingAmount: number;      // 进「保命钱三桶」的钱（留存类排除投资/保险后，按可支配缩放；无法则时=可支配）
}

/**
 * 构建现金流瀑布（路线 B 核心）。
 * @param profile 用户档案（提供真实收入/固定/变动/负债）
 * @param rule    所选法则（可选；未选时仅返回瀑布顶层，items 为空，savingAmount=可支配）
 */
export function buildWaterfall(profile: UserProfile, rule?: Rule): Waterfall {
  const income = totalMonthlyIncome(profile);
  const fixed = profile.fixedExpenses || 0;
  const variable = profile.variableExpenses || 0;
  const debt = totalMonthlyDebt(profile);
  const disposable = Math.max(0, income - fixed - variable - debt);

  let items: WaterfallItem[] = [];
  let ruleLivingSuggest = 0;
  let hasSuggest = false;
  let savingAmount = 0;

  if (rule && rule.scope !== 'withdraw') {
    // 收入级法则：applyRule 基数=整月收入；投资级法则：基数=投资池(可支配)
    const raw = applyRule(profile, rule);

    const consumption = raw.filter((b) => CONSUMPTION_KEYS.has(b.bucketKey ?? ''));
    hasSuggest = consumption.length > 0;
    ruleLivingSuggest = consumption.reduce((s, b) => s + b.monthlyAmount, 0);

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
    fixed: Math.round(fixed),
    variable: Math.round(variable),
    debt: Math.round(debt),
    disposable: Math.round(disposable),
    livingActual: Math.round(fixed + variable),
    ruleLivingSuggest: Math.round(ruleLivingSuggest),
    hasSuggest,
    items,
    savingAmount: Math.round(savingAmount),
  };
}
