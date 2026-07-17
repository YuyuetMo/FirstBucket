// FirstBucket v1.1 纯函数逻辑冒烟测试（零新增依赖，esbuild 打包后 node 运行）
// 运行：npx esbuild tests/v1_1_smoke.test.ts --bundle --platform=node --format=esm --outfile=tests/.tmp/v1_1_smoke.mjs && node tests/.tmp/v1_1_smoke.mjs

import { WARN_THRESHOLDS } from '../src/renderer/features/warn/thresholds';
import { getEquityRatio, detectConflict } from '../src/renderer/features/warn/conflict';
import { detectDeviation, detectOverspend } from '../src/renderer/features/warn/deviation';
import {
  computeEmergencyFundReachMonths,
  buildPlanView,
} from '../src/renderer/features/plan/metrics';
import { buildReviews } from '../src/renderer/features/review/reviewRules';
import { getPreset, recommendWithPreset, PRESETS } from '../src/renderer/features/preset/presets';
import { FINANCIAL_TERMS, RULE_TERMS } from '../src/renderer/features/education/terms';
import { createEmptyProfile } from '../src/renderer/@core/domain/user';
import { RULES, getRule } from '../src/renderer/@core/domain/rule';
import type { UserProfile } from '../src/renderer/@core/domain/user';
import type { Rule } from '../src/renderer/@core/domain/rule';
import type { PlanView } from '../src/renderer/features/plan/metrics';

// —— mini runner ——
let passed = 0;
let failed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log('  ✓ PASS', name);
  } else {
    failed++;
    failures.push(name + (detail ? ' :: ' + detail : ''));
    console.log('  ✗ FAIL', name, detail ? ':: ' + detail : '');
  }
}
function eq<T>(name: string, actual: T, expected: T) {
  check(name, actual === expected, `expected ${String(expected)}, got ${String(actual)}`);
}
function approx(name: string, actual: number, expected: number) {
  check(name, Math.abs(actual - expected) < 1e-9, `expected ${expected}, got ${actual}`);
}

// —— 测试数据构造 ——
function makeProfile(over: Partial<UserProfile>): UserProfile {
  return { ...createEmptyProfile('test'), ...over };
}

console.log('\n[1] WARN_THRESHOLDS 常量（设计文档 §3.2）');
eq('conflict.ageMin === 55', WARN_THRESHOLDS.conflict.ageMin, 55);
approx('conflict.equityRatioMax === 0.4', WARN_THRESHOLDS.conflict.equityRatioMax, 0.4);
approx('deviation.totalExpenseRatioMax === 1.0', WARN_THRESHOLDS.deviation.totalExpenseRatioMax, 1.0);
approx('deviation.bucketRatioTolerance === 0.1', WARN_THRESHOLDS.deviation.bucketRatioTolerance, 0.1);

console.log('\n[2] computeEmergencyFundReachMonths（设计文档 §3.7）');
{
  // 目标 = 3×固定支出 = 9000；当前储蓄 0；月存 900 → ceil(9000/900)=10
  const p = makeProfile({ fixedExpenses: 3000, currentSavings: 0 });
  eq('缺口存在时月数=10', computeEmergencyFundReachMonths(p, 900), 10);
  check('月数 > 0 且合理', computeEmergencyFundReachMonths(p, 900) > 0);

  // 当前储蓄已达标 → 0 个月
  const p2 = makeProfile({ fixedExpenses: 3000, currentSavings: 10000 });
  eq('已达标月数=0', computeEmergencyFundReachMonths(p2, 900), 0);

  // 有缺口但月存 <= 0 → Infinity（UI 展示「—」）
  const p3 = makeProfile({ fixedExpenses: 3000, currentSavings: 0 });
  check('无月储蓄且缺口>0 → Infinity', computeEmergencyFundReachMonths(p3, 0) === Number.POSITIVE_INFINITY);

  // 固定支出为 0 时 target=0 → 0 个月（无缺口）
  const p4 = makeProfile({ fixedExpenses: 0, currentSavings: 0 });
  eq('固定支出0 → 0 个月', computeEmergencyFundReachMonths(p4, 500), 0);
}

console.log('\n[3] getEquityRatio（设计文档 §3.7）');
{
  const r100_30 = getRule('100-age')!; // 权益桶 60 / 固收 40
  approx('100-age, age=30 → 0.7', getEquityRatio(makeProfile({ age: 30 }), r100_30), 0.7);
  approx('100-age, age=70 → 0.3', getEquityRatio(makeProfile({ age: 70 }), r100_30), 0.3);

  // 普通法则按 allocation 中权益类桶占比：4321 无权益桶 → 0
  const r4321 = getRule('4321')!;
  approx('4321 无权益桶 → 0', getEquityRatio(makeProfile({ age: 30 }), r4321), 0);

  // all-weather：stock(权益)30 / total100 → 0.3
  const rAll = getRule('all-weather')!;
  approx('all-weather stock 30 → 0.3', getEquityRatio(makeProfile({ age: 30 }), rAll), 0.3);

  // sp-quadrant：grow(权益)30 / total100 → 0.3
  const rSp = getRule('sp-quadrant')!;
  approx('sp-quadrant grow 30 → 0.3', getEquityRatio(makeProfile({ age: 30 }), rSp), 0.3);

  // buffett-90-10：index(权益)90 / total100 → 0.9
  const rBuffett = getRule('buffett-90-10')!;
  approx('buffett index 90 → 0.9', getEquityRatio(makeProfile({ age: 30 }), rBuffett), 0.9);

  // 所有返回值均在 [0,1]
  const rules: Rule[] = [r100_30, r4321, rAll, rSp, rBuffett];
  const ages = [20, 40, 60, 80];
  let allInRange = true;
  for (const r of rules) {
    for (const a of ages) {
      const v = getEquityRatio(makeProfile({ age: a }), r);
      if (v < 0 || v > 1) allInRange = false;
    }
  }
  check('所有 getEquityRatio 结果 ∈ [0,1]', allInRange);

  // detectConflict：age≥55 且 ratio>0.4 → 冲突
  const oldProfile = makeProfile({ age: 65 });
  const conflict = detectConflict(oldProfile, rBuffett); // ratio 0.9 > 0.4
  check('65 岁 + 高权益 → 冲突预警', !!conflict && conflict.severity === 'danger');
  const young = detectConflict(makeProfile({ age: 30 }), rBuffett);
  check('30 岁 → 不冲突（年龄未到）', young === null);
}

console.log('\n[4] detectDeviation / detectOverspend（设计文档 §3.7）');
{
  // 超支：收入 10000，固定 6000 + 变动 5000 = 11000 > 10000
  const overProfile = makeProfile({
    monthlyIncome: 10000,
    incomeAnnualBonus: 0,
    incomeOther: 0,
    fixedExpenses: 6000,
    variableExpenses: 5000,
  });
  const over = detectOverspend(overProfile);
  check('超支时返回 deviation-overspend', !!over && over.id === 'deviation-overspend');

  // 不超支：支出 5000 < 10000
  const okProfile = makeProfile({
    monthlyIncome: 10000,
    fixedExpenses: 3000,
    variableExpenses: 2000,
  });
  check('未超支返回 null', detectOverspend(okProfile) === null);

  // detectDeviation：超支 + buffett 单桶 concentration(90>70) → 2 条
  const dev = detectDeviation(overProfile, getRule('buffett-90-10')!);
  eq('detectDeviation 命中数 = 2', dev.length, 2);
  check(
    '含超支 + 单桶集中预警',
    dev.some((d) => d.id === 'deviation-overspend') &&
      dev.some((d) => d.id === 'deviation-concentration-index'),
  );

  // 不超支但仍有 concentration（buffett index 90）
  const dev2 = detectDeviation(okProfile, getRule('buffett-90-10')!);
  eq('仅 concentration → 1 条', dev2.length, 1);
  check('仅单桶集中预警', dev2[0]?.id === 'deviation-concentration-index');

  // 无问题：4321（最大 pct 40）+ 未超支 → 0 条
  const dev3 = detectDeviation(okProfile, getRule('4321')!);
  eq('无偏离 → 0 条', dev3.length, 0);
}

console.log('\n[5] buildReviews（设计文档 §3.4，纯函数）');
{
  const profile = makeProfile({
    monthlyIncome: 8000,
    fixedExpenses: 3000,
    variableExpenses: 3000,
    currentSavings: 0,
    riskProfile: 'conservative',
    goals: [],
    age: 30,
    investHorizonMonths: 120,
  });
  const plan: PlanView = {
    buckets: [],
    totalMonthly: 2000,
    futureValue: 100000,
    reachMonths: 10,
    equityRatio: 0.5, // >0.4 且 conservative → 权益偏高命中
  };
  const ctx = {
    profile,
    plan,
    health: { score: 50, badges: [], emergencyMultiple: 0 },
    rule: getRule('4321')!,
  };

  const hits = buildReviews(ctx);
  check('产出 3-5 条 ReviewHit', hits.length >= 3 && hits.length <= 5, `got ${hits.length}`);
  check(
    '每条含非空 tag + text',
    hits.every((h) => typeof h.tag === 'string' && h.tag.length > 0 && typeof h.text === 'string' && h.text.length > 0),
  );
  // 预期命中：应急金不足 / 权益占比偏高 / 档案待完善 / 建议设目标 = 4 条
  const tags = hits.map((h) => h.tag);
  check('含「应急金不足」', tags.includes('应急金不足'));
  check('含「权益占比偏高」', tags.includes('权益占比偏高'));
  check('含「档案待完善」', tags.includes('档案待完善'));
  check('含「建议设目标」', tags.includes('建议设目标'));

  // 纯函数：同输入同输出
  const hitsAgain = buildReviews(ctx);
  check('同输入同输出（纯函数）', JSON.stringify(hits) === JSON.stringify(hitsAgain));
  // 纯函数：不修改入参
  const ctxSnapshot = JSON.stringify(ctx);
  buildReviews(ctx);
  check('不修改入参 ctx', JSON.stringify(ctx) === ctxSnapshot);

  // 上限 5 条：构造全命中的极端 ctx
  const allHitCtx = {
    profile: makeProfile({
      monthlyIncome: 5000,
      fixedExpenses: 6000,
      variableExpenses: 0,
      currentSavings: 0,
      riskProfile: 'conservative',
      goals: [],
      age: 30,
    }),
    plan: { buckets: [], totalMonthly: 5000, futureValue: 0, reachMonths: 0, equityRatio: 0.9 },
    health: { score: 10, badges: [], emergencyMultiple: 0 },
    rule: getRule('100-age')!,
  };
  const allHits = buildReviews(allHitCtx);
  check('极端全命中仍 ≤5 条（上限）', allHits.length <= 5, `got ${allHits.length}`);
}

console.log('\n[6] getPreset / recommendWithPreset（设计文档 §3.5）');
{
  const family = getPreset('family');
  check('getPreset(family) 定义存在', !!family);
  eq('family label', family!.label, '三口之家');
  check(
    'family.recommendRules 含 50-30-20/sp-quadrant/all-weather',
    ['50-30-20', 'sp-quadrant', 'all-weather'].every((id) => family!.recommendRules.includes(id as any)),
  );
  check('getPreset(null) → undefined', getPreset(null) === undefined);
  check('getPreset(undefined) → undefined', getPreset(undefined) === undefined);

  // 全部 6 类预设 id 均可取
  const allIds = ['student', 'newgrad', 'single', 'dualincome', 'family', 'preretire'] as const;
  check('6 类预设均存在', allIds.every((id) => !!getPreset(id)));
  eq('PRESETS 长度 = 6', PRESETS.length, 6);

  // recommendWithPreset：conservative 画像 + family 预设
  const profile = makeProfile({
    monthlyIncome: 8000,
    fixedExpenses: 3000,
    variableExpenses: 2000,
    currentSavings: 0,
    riskProfile: 'conservative',
    age: 30,
    investHorizonMonths: 120,
  });
  const ranked = recommendWithPreset(profile, 'family');
  eq('返回 12 条（全部法则）', ranked.length, 12);
  check('top1 属于 family.recommendRules', family!.recommendRules.includes(ranked[0].rule.id));
  // 权重叠加 + 上限 100：sp-quadrant base 92 + weight 12 → 100
  const sp = ranked.find((r) => r.rule.id === 'sp-quadrant');
  eq('sp-quadrant 加权后=100（capped）', sp!.score, 100);
  // 不含预设时等于 recommend 基线（长度 12）
  const baseline = recommendWithPreset(profile, null);
  eq('无预设返回 12 条', baseline.length, 12);
  check('排序降序', ranked.every((r, i) => i === 0 || ranked[i - 1].score >= r.score));
}

console.log('\n[7] FINANCIAL_TERMS / RULE_TERMS（设计文档 §3.3）');
{
  const finKeys = Object.keys(FINANCIAL_TERMS);
  check('FINANCIAL_TERMS ≥6 个字段', finKeys.length >= 6, `got ${finKeys.length}`);
  check(
    'FINANCIAL_TERMS 每条含 id/label/short',
    finKeys.every((k) => {
      const t = FINANCIAL_TERMS[k];
      return !!t.id && !!t.label && !!t.short;
    }),
  );

  const ruleKeys = Object.keys(RULE_TERMS);
  eq('RULE_TERMS 覆盖全部 12 个内置法则', ruleKeys.length, 12);
  // 与 RULES 一一对应且 origin 非空
  const allCovered = RULES.every((r) => {
    const t = RULE_TERMS[r.id];
    return !!t && typeof t.origin === 'string' && t.origin.length > 0;
  });
  check('RULE_TERMS 覆盖 RULES 全部且 origin 非空', allCovered);
  check(
    'RULE_TERMS 每条含 id/label/short/origin',
    ruleKeys.every((k) => {
      const t = RULE_TERMS[k];
      return !!t.id && !!t.label && !!t.short && !!t.origin;
    }),
  );
}

console.log('\n[8] buildPlanView 派生（设计文档 §3.7，冒烟）');
{
  const profile = makeProfile({
    monthlyIncome: 10000,
    fixedExpenses: 3000,
    variableExpenses: 2000,
    currentSavings: 9000,
    riskProfile: 'balanced',
    age: 30,
    investHorizonMonths: 120,
  });
  const view = buildPlanView(profile, getRule('4321')!);
  check('buckets 非空', view.buckets.length > 0);
  check('totalMonthly > 0', view.totalMonthly > 0);
  check('futureValue > 0', view.futureValue > 0);
  check('reachMonths 为有限数', Number.isFinite(view.reachMonths));
  check('equityRatio ∈ [0,1]', view.equityRatio >= 0 && view.equityRatio <= 1);
}

// —— 汇总 ——
console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.log('Failures:\n' + failures.map((f) => '  - ' + f).join('\n'));
  // eslint-disable-next-line no-undef
  (globalThis as any).process && (globalThis as any).process.exit(1);
} else {
  console.log('ALL PASS ✅');
}
