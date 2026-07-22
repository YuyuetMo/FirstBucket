// 本月执行清单（R6 / T07；v1.5 路线B 重构 + 组合模式接入 + v1.7.1 接入 RuleActuals）。
// 结构（自上而下）：
//   1) 现金流瀑布：税后收入 − 消费类实际（你为各桶填写）− 负债 = 可自由可支配
//   2) 诊断对比：消费类实际 vs 所选/组合收入级法则建议配额
//   3) 可自由支配分配：单法则按法则留存类桶比例落地；组合模式直接展示 applyRules 的资产桶真实金额
//   4) 保命钱三桶洞察（基于可支配再分配，与法则无关）
// 全部纯函数派生（buildWaterfall + allocateThreeBuckets），切换法则/改档案即时重算。
import { useState } from 'react';
import type { UserProfile } from '../../@core/domain/user';
import type { Rule } from '../../@core/domain/rule';
import type { Bucket } from '../../@core/domain/bucket';
import { allocateThreeBuckets, getThreeBucketRatios, setThreeBucketRatios } from '../budget/threeBuckets';
import { buildWaterfall, CONSUMPTION_KEYS } from '../budget/waterfall';
import { consumptionActualOf, allocationActualOf } from './consumption';

const yuan = (n: number) => `¥${Math.round(n).toLocaleString()}`;

interface ExecutionListProps {
  profile: UserProfile;
  /** 单法则模式：传入单法则，走完整路线B（含诊断 + 留存桶比例分配） */
  rule?: Rule;
  /** 组合模式：applyRules 结果（资产桶，已是真实投资池分配金额） */
  comboBuckets?: Bucket[];
  /** 组合模式的收入级法则（用于"实际 vs 法则建议"诊断，可选） */
  comboIncomeRule?: Rule;
}

export function ExecutionList({ profile, rule, comboBuckets, comboIncomeRule }: ExecutionListProps) {
  const isCombo = !rule && !!comboBuckets && comboBuckets.length > 0;

  // 三桶分配比例（应急金占比、灵活占剩余部分比例），用户可在卡片调节，持久化到 localStorage
  const [ratios, setRatios] = useState(getThreeBucketRatios());

  // 消费类实际月额（v1.7.2：来自当前法则逐桶填写；元组 [值, 是否旧档案回退]）
  const [consumptionActual, isFallback] = consumptionActualOf(profile, rule ?? comboIncomeRule);

  // 顶层现金流瀑布（通用，所有模式一致）
  const wf = buildWaterfall(profile, rule ?? comboIncomeRule, consumptionActual);
  // 备用金月数：取自法则（不同法则不同，如 4321=3、标普=6），默认 3
  const reserveMonths = rule?.reserveTargetMonths ?? comboIncomeRule?.reserveTargetMonths ?? 3;
  // 三桶入水流 = 法则储蓄额（如 4321 的 ¥2,150），而非整个可自由支配；无法则时兜底用可支配
  // 三桶入水流：
  //  - 收入级法则：用「可自由可支配」（= 税后 − 消费类实际），即用户实际可攒的钱整体流入保命钱
  //  - 投资级/无法则：沿用原 savingAmount（投资池分配）
  const isIncomeRule = !!rule && rule.scope === 'income';
  const inflow = isIncomeRule
    ? (wf.disposable > 0 ? wf.disposable : undefined)
    : (wf.savingAmount > 0 ? wf.savingAmount : undefined);
  const tb = allocateThreeBuckets(profile, inflow, reserveMonths, consumptionActual, ratios.reserve, ratios.flexible);

  // 诊断：实际生活开销 vs 法则建议配额（仅含消费桶的收入级法则）
  const gap = wf.livingActual - wf.ruleLivingSuggest;

  // 可自由支配分配条目
  let allocTitle: string;
  let items: { label: string; color: string; pct: number; amount: number }[];
  if (isCombo && comboBuckets) {
    const sum = comboBuckets.reduce((s, b) => s + b.monthlyAmount, 0) || 1;
    allocTitle = '投资池分配（按组合）';
    items = comboBuckets.map((b) => ({
      label: b.name,
      color: b.color,
      pct: b.monthlyAmount / sum,
      amount: b.monthlyAmount,
    }));
  } else {
    allocTitle = rule ? `可自由可支配分配（按「${rule.name}」比例）` : '可自由可支配分配';
    items = wf.items.map((it) => ({ label: it.label, color: it.color, pct: it.pctOfDisposable, amount: it.amount }));
  }

  // 收入级法则：用户在方案页为「储蓄/投资/保险」等分配桶填写的实际金额（不再按比例重算，直接展示）
  const plannedItems = isIncomeRule && rule
    ? allocationActualOf(rule).filter((a) => a.amount > 0)
    : [];
  const plannedTotal = plannedItems.reduce((s, a) => s + a.amount, 0);

  return (
    <div className="execution-list card">
      <div className="card-header">
        <span className="card-title">本月执行清单</span>
        {rule && <span className="badge badge-gold">基于「{rule.name}」</span>}
        {isCombo && <span className="badge badge-gold">组合方案</span>}
      </div>

      {/* 1) 现金流瀑布 —— 用你填的真实数字 */}
      <div className="execution-section-title">现金流瀑布（按你的真实收支）</div>
      <div className="execution-row">
        <span className="execution-label">税后月收入</span>
        <span className="execution-amt">{yuan(wf.income)}</span>
      </div>
      <div className="execution-row">
        <span className="execution-label" style={{ color: 'var(--color-text-secondary)' }}>
          − 消费类实际（你为各桶填写）
          {isFallback && <span style={{ fontSize: '10.5px', color: 'var(--color-danger)', marginLeft: 4 }}>⚠️ 来自旧档案回退，请在方案页各桶填写实际金额</span>}
        </span>
        <span className="execution-amt" style={{ color: 'var(--color-text-secondary)' }}>−{yuan(wf.consumption)}</span>
      </div>
      {wf.debt > 0 && (
        <div className="execution-row">
          <span className="execution-label" style={{ color: 'var(--color-text-secondary)' }}>− 月负债还款</span>
          <span className="execution-amt" style={{ color: 'var(--color-text-secondary)' }}>−{yuan(wf.debt)}</span>
        </div>
      )}
      <div className="execution-row" style={{ borderTop: '1px solid var(--color-border)', marginTop: 4, paddingTop: 10 }}>
        <span className="execution-label" style={{ fontWeight: 700 }}>= 可自由可支配</span>
        <span className="execution-amt" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{yuan(wf.disposable)}</span>
      </div>

      {/* 2) 诊断对比：实际生活 vs 法则建议 */}
      {wf.hasSuggest && (
        <div className="execution-note" style={gap > 0 ? { color: 'var(--color-danger)' } : undefined}>
          {gap > 0
            ? `⚠️ 你的实际消费类支出 ${yuan(wf.livingActual)}，高于「${(rule ?? comboIncomeRule)?.name}」建议的 ${yuan(wf.ruleLivingSuggest)}（超 ${yuan(gap)}）。可对照法则适当压缩，或接受现状——本方案已按你的真实开销分配剩余的钱。`
            : `✅ 你的实际消费类支出 ${yuan(wf.livingActual)}，低于「${(rule ?? comboIncomeRule)?.name}」建议的 ${yuan(wf.ruleLivingSuggest)}，省下的 ${yuan(-gap)} 已并入可自由可支配，自动流向储蓄/投资。`}
        </div>
      )}

      {/* 3) 分配：收入级法则展示「已规划分配」（方案页实际填写）；组合 / 投资级按比例展示 */}
      {isIncomeRule && plannedTotal > 0 ? (
        <>
          <div className="execution-section-title">已规划分配（你在方案页填写的实际金额）</div>
          {plannedItems.map((it, i) => (
            <div className="execution-row" key={i}>
              <span className="execution-label">
                <span className="execution-dot" style={{ background: 'var(--color-primary)' }} />
                {it.label}
              </span>
              <span className="execution-amt">{yuan(it.amount)}/月</span>
            </div>
          ))}
          <div className="execution-row" style={{ borderTop: '1px dashed var(--color-border)', marginTop: 4, paddingTop: 8 }}>
            <span className="execution-label" style={{ fontWeight: 700 }}>小计（储蓄 / 投资 / 保险等）</span>
            <span className="execution-amt" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{yuan(plannedTotal)}/月</span>
          </div>
          <div className="execution-note" style={{ marginTop: 6 }}>
            可自由可支配 {yuan(wf.disposable)} − 已规划 {yuan(plannedTotal)} = <b>{yuan(Math.max(0, wf.disposable - plannedTotal))}</b> 未规划余额，自动进入下方「三桶洞察」的自由支配。
          </div>
        </>
      ) : items.length > 0 ? (
        <>
          <div className="execution-section-title">{allocTitle}</div>
          {items.map((it, i) => (
            <div className="execution-row" key={i}>
              <span className="execution-label">
                <span className="execution-dot" style={{ background: it.color }} />
                {it.label}
                <span style={{ marginLeft: 6, fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                  {Math.round(it.pct * 100)}%
                </span>
              </span>
              <span className="execution-amt">{yuan(it.amount)}/月</span>
            </div>
          ))}
        </>
      ) : null}

      {/* 4) 保命钱三桶洞察（入水流=法则储蓄额，存满前优先填备用金，F1/F2/F3） */}
      <div className="execution-section-title">保命钱（三桶洞察）</div>
      {/* 4.0) 解释：为什么备用金要存到这个数（适应各法则） */}
      <div className="execution-note" style={{ marginBottom: 8, background: 'var(--color-info-soft, #EAF2FB)' }}>
        💡 <b>为什么要存到 {yuan(tb.reserveTarget)}？</b>
        {rule?.reserveRationale ? (
          <>{rule.reserveRationale} </>
        ) : rule ? (
          <>根据「{rule.name}」法则， </>
        ) : isCombo && comboIncomeRule ? (
          <>根据「{comboIncomeRule.name}」法则， </>
        ) : (
          <>家庭理财建议 </>
        )}
        备用金需覆盖 <b>{tb.reserveTargetMonths}</b> 个月基础生活支出（消费类实际 {yuan(wf.consumption)}/月）。
        这笔钱用于失业、突发疾病、意外开支等极端情况，确保 {tb.reserveTargetMonths} 个月内生活质量不受冲击，是家庭的“安全垫”。
      </div>
      <div className="execution-note" style={{ marginBottom: 8 }}>
        每月入水 <b>{yuan(tb.inflow)}</b>
        {isIncomeRule ? '（来自可自由可支配 = 税后收入 − 消费类实际）' : rule ? `（来自「${rule.name}」储蓄额）` : '（来自可自由可支配）'}
        ，按下方比例<b>并行</b>分配：应急金 {yuan(tb.reserve)}/月（占 {Math.round(ratios.reserve * 100)}%）、灵活 {yuan(tb.flexible)}/月、自由 {yuan(tb.free)}/月。
        应急金目标 {yuan(tb.reserveTarget)}（{tb.reserveTargetMonths}×月支出），按此节奏约 <b>{tb.monthsToFull > 0 ? tb.monthsToFull.toFixed(1) : '∞'}</b> 个月存满——期间灵活与自由<b>同步累积</b>，无需先存满应急金。
      </div>
      {/* 4.1) 比例调节：应急金占比 + 灵活占剩余比例（默认 100% = 旧「先攒满」行为） */}
      <div className="three-bucket-controls" style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '4px 0 12px', padding: '10px 12px', background: 'var(--color-bg-page)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
            <span>每月应急金投入比例</span><b style={{ color: 'var(--color-text)' }}>{Math.round(ratios.reserve * 100)}%</b>
          </div>
          <input type="range" min={0} max={100} step={5} value={Math.round(ratios.reserve * 100)}
            onChange={(e) => { const v = Number(e.target.value) / 100; const nr = { ...ratios, reserve: v }; setRatios(nr); setThreeBucketRatios(nr); }}
            style={{ width: '100%', marginTop: 4 }} />
          {ratios.reserve >= 1 && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 2 }}>当前为「先攒满应急金」模式；调低比例后，灵活/自由将从首月起同步累积。</div>}
        </div>
        <div style={{ opacity: ratios.reserve >= 1 ? 0.45 : 1, pointerEvents: ratios.reserve >= 1 ? 'none' : 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
            <span>灵活应急金占「剩余部分」比例</span><b style={{ color: 'var(--color-text)' }}>{Math.round(ratios.flexible * 100)}%</b>
          </div>
          <input type="range" min={0} max={100} step={5} value={Math.round(ratios.flexible * 100)} disabled={ratios.reserve >= 1}
            onChange={(e) => { const v = Number(e.target.value) / 100; const nr = { ...ratios, flexible: v }; setRatios(nr); setThreeBucketRatios(nr); }}
            style={{ width: '100%', marginTop: 4 }} />
        </div>
      </div>
      <div className="three-bucket-grid">
        <div className="three-bucket bucket-reserve">
          <div className="three-bucket-label">备用金桶（每月转入）</div>
          <div className="three-bucket-val">{yuan(tb.reserve)}</div>
          <div className="three-bucket-sub">固定不动 · 目标 {yuan(tb.reserveTarget)}</div>
        </div>
        <div className="three-bucket bucket-flexible">
          <div className="three-bucket-label">灵活应急金（保留）</div>
          <div className="three-bucket-val">{yuan(tb.flexible)}</div>
          <div className="three-bucket-sub">补突发/医疗/人情</div>
        </div>
        <div className="three-bucket bucket-free">
          <div className="three-bucket-label">自由支配</div>
          <div className="three-bucket-val">{yuan(tb.free)}</div>
          <div className="three-bucket-sub">娱乐/自我提升</div>
        </div>
      </div>
      <div className="execution-note">
        {tb.reserveMet
          ? `✅ 应急金已达标（每月入水已 ≥ 目标 ${yuan(tb.reserveTarget)}），灵活应急金与自由支配持续累积。`
          : `📊 应急金进度：每月 ${yuan(tb.reserve)} → 目标 ${yuan(tb.reserveTarget)}，约 ${tb.monthsToFull > 0 ? tb.monthsToFull.toFixed(1) : '∞'} 个月存满；此期间灵活应急金与自由支配同步积累，无需等满再开启。`}
      </div>
    </div>
  );
}
