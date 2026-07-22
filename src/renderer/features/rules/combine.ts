// 组合引擎（D11 / T10，设计文档 §3.7）。
// 走「收入层加权 → 投资池 → 投资层加权拆分」两层流水线，绝不对跨层百分比求平均。
// 纯函数：不读全局态、不改 profile；仅加法复用 applyRule / compoundSeries。
import type { UserProfile } from '../../@core/domain/user';
import { monthlyDisposable, totalMonthlyIncome } from '../../@core/domain/user';
import type { Rule } from '../../@core/domain/rule';
import { getRule } from '../../@core/domain/rule';
import type { Bucket } from '../../@core/domain/bucket';
import { applyRule, compoundSeries } from '../budget/engine';
import type { PlanView } from '../plan/metrics';

// ── 统一类目字典（收入层）──
type Cat = 'essentials' | 'flexible' | 'save' | 'invest' | 'insurance' | 'eduplay';
const CATEGORY_MAP: Record<string, Cat> = {
  living: 'essentials',
  need: 'essentials',
  food: 'essentials',
  want: 'flexible',
  play: 'flexible',
  give: 'flexible',
  culture: 'flexible',
  surprise: 'flexible',
  saving: 'save',
  save: 'save',
  invest: 'invest',
  grow: 'invest',
  sprint: 'invest',
  equity: 'invest',
  stock: 'invest',
  index: 'invest',
  core: 'invest',
  satellite: 'invest',
  bond: 'invest',
  ltbond: 'invest',
  mtbond: 'invest',
  commodity: 'invest',
  tbill: 'invest',
  principal: 'invest',
  insurance: 'insurance',
  protect: 'insurance',
  safe: 'insurance',
  edu: 'eduplay',
};

// ── 统一资产字典（投资层）──
type Asset = 'equity' | 'bond' | 'commodity' | 'cash';
const ASSET_MAP: Record<string, Asset> = {
  equity: 'equity',
  stock: 'equity',
  index: 'equity',
  core: 'equity',
  satellite: 'equity',
  bond: 'bond',
  ltbond: 'bond',
  mtbond: 'bond',
  tbill: 'bond',
  commodity: 'commodity',
  cash: 'cash',
  safe: 'cash',
};
const ASSET_META: Record<Asset, { name: string; color: string }> = {
  equity: { name: '权益类', color: '#C97B63' },
  bond: { name: '固收类', color: '#5BA3A8' },
  commodity: { name: '商品', color: '#D4A857' },
  cash: { name: '现金 / 货基', color: '#8E7CC3' },
};
const ASSET_ORDER: Asset[] = ['equity', 'bond', 'commodity', 'cash'];

function annualRateFor(profile: UserProfile): number {
  if (typeof profile.compoundAnnualRate === 'number') return profile.compoundAnnualRate;
  if (profile.riskProfile === 'aggressive') return 0.07;
  if (profile.riskProfile === 'conservative') return 0.03;
  return 0.05;
}

function reachMonthsFor(profile: UserProfile): number {
  const target = 3 * (profile.fixedExpenses || 0);
  const remaining = Math.max(0, target - (profile.currentSavings || 0));
  if (remaining <= 0) return 0;
  const save = monthlyDisposable(profile);
  if (save <= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil(remaining / save);
}

/**
 * 组合方案：收入级法则在收入层加权（同层等权），投资级法则在投资层拆分投资池。
 * 末值 = 投资层全部资产桶月额之和做 compoundSeries（O5 默认等权；opts.weights 为预留扩展点）。
 * 提领法则（withdraw）被忽略（PRD R3）。
 */
export function applyRules(
  ruleIds: string[],
  profile: UserProfile,
  _opts?: { weights?: Partial<Record<string, number>> },
): PlanView {
  const rules = ruleIds
    .map((id) => getRule(id))
    .filter((r): r is Rule => !!r && r.scope !== 'withdraw');

  const incomeRules = rules.filter((r) => r.scope === 'income');
  const investRules = rules.filter((r) => r.scope === 'invest');

  // 层1 收入层：各 income 法则 applyRule(基数=整月收入) → 归一化到统一类目 → 等权平均
  const cats: Record<Cat, number> = {
    essentials: 0,
    flexible: 0,
    save: 0,
    invest: 0,
    insurance: 0,
    eduplay: 0,
  };
  const totalIncome = totalMonthlyIncome(profile);
  const nInc = Math.max(1, incomeRules.length);
  for (const r of incomeRules) {
    for (const b of applyRule(profile, r, totalIncome)) {
      const cat = CATEGORY_MAP[b.bucketKey ?? ''] ?? 'essentials';
      cats[cat] += (b.monthlyAmount || 0) / nInc;
    }
  }
  // 投资池 = 储蓄类目月额 + 投资类目月额；无 income 法则则回退 monthlyDisposable
  const investmentPool = incomeRules.length ? cats.save + cats.invest : monthlyDisposable(profile);

  // 层2 投资层：各 invest 法则 applyRule(基数=投资池) → 归一化到统一资产 → 等权平均
  const assetSums: Record<Asset, number> = { equity: 0, bond: 0, commodity: 0, cash: 0 };
  const nInv = Math.max(1, investRules.length);
  for (const r of investRules) {
    for (const b of applyRule(profile, r, investmentPool)) {
      const asset = ASSET_MAP[b.bucketKey ?? ''] ?? 'cash';
      assetSums[asset] += (b.monthlyAmount || 0) / nInv;
    }
  }

  // F1 修复：仅选收入级法则（investRules 为空）但投资池 > 0 时，
  // 回退一个默认资产桶（equity / 投资），使末值与单法则视图连续，避免产出 ¥0 空方案。
  if (investRules.length === 0 && investmentPool > 0) {
    assetSums.equity = investmentPool;
  }

  const buckets: Bucket[] = ASSET_ORDER.filter((a) => Math.round(assetSums[a]) > 0).map((a) => ({
    id: `combo-${a}`,
    ruleId: investRules.map((r) => r.id).join('+') || 'combo',
    name: ASSET_META[a].name,
    color: ASSET_META[a].color,
    monthlyAmount: Math.round(assetSums[a]),
    bucketKey: a,
    note: '组合方案',
  }));

  const investMonthly = buckets.reduce((s, b) => s + b.monthlyAmount, 0);
  const months = Math.max(1, profile.investHorizonMonths || 120);
  const equityRatio = investMonthly > 0 ? Math.round((assetSums.equity / investMonthly) * 100) / 100 : 0;

  // F2 修复：组合复利利率关联到所选投资级法则的加权 equityRatio；
  // 用户手动设了年化（profile.compoundAnnualRate）则优先用之；无投资级法则（回退默认桶）时沿用 riskProfile 口径。
  const rate =
    investRules.length > 0
      ? (typeof profile.compoundAnnualRate === 'number' ? profile.compoundAnnualRate : 0.03 + equityRatio * 0.07)
      : annualRateFor(profile);

  const series = compoundSeries(investMonthly, rate, months);
  const futureValue = series.length ? series[series.length - 1].value : 0;

  return {
    buckets,
    totalMonthly: Math.round(investMonthly),
    futureValue,
    reachMonths: reachMonthsFor(profile),
    equityRatio,
  };
}
