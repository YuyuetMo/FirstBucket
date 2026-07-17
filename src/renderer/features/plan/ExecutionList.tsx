// 本月执行清单（R6 / T07；v1.5 路线B 重构 + 组合模式接入）。
// 结构（自上而下）：
//   1) 现金流瀑布：月收入 − 实际固定 − 实际变动 − 负债 = 可自由支配（用用户真实数字，单/组合通用）
//   2) 诊断对比：实际生活开销 vs 所选/组合收入级法则建议配额
//   3) 可自由支配分配：单法则按法则留存类桶比例落地；组合模式直接展示 applyRules 的资产桶真实金额
//   4) 保命钱三桶洞察（基于可支配再分配，与法则无关）
// 全部纯函数派生（buildWaterfall + allocateThreeBuckets），切换法则/改档案即时重算。
import { useState } from 'react';
import type { UserProfile } from '../../@core/domain/user';
import type { Rule } from '../../@core/domain/rule';
import type { Bucket } from '../../@core/domain/bucket';
import { allocateThreeBuckets } from '../budget/threeBuckets';
import { buildWaterfall } from '../budget/waterfall';

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

  // 备用金存满后，每月余量优先转入哪类（用户决策入口，F2）
  const [surplusToFlexible, setSurplusToFlexible] = useState(true);

  // 顶层现金流瀑布（通用，所有模式一致）
  const wf = buildWaterfall(profile, rule ?? comboIncomeRule);
  // 备用金月数：取自法则（不同法则不同，如 4321=3、标普=6、Coast FIRE=6），默认 3
  const reserveMonths = rule?.reserveTargetMonths ?? comboIncomeRule?.reserveTargetMonths ?? 3;
  // 三桶入水流 = 法则储蓄额（如 4321 的 ¥2,150），而非整个可自由支配；无法则时兜底用可支配
  const tb = allocateThreeBuckets(profile, wf.savingAmount > 0 ? wf.savingAmount : undefined, reserveMonths);

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
    allocTitle = rule ? `可自由支配分配（按「${rule.name}」比例）` : '可自由支配分配';
    items = wf.items.map((it) => ({ label: it.label, color: it.color, pct: it.pctOfDisposable, amount: it.amount }));
  }

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
        <span className="execution-label">月收入</span>
        <span className="execution-amt">{yuan(wf.income)}</span>
      </div>
      <div className="execution-row">
        <span className="execution-label" style={{ color: 'var(--color-text-secondary)' }}>− 固定支出（你填）</span>
        <span className="execution-amt" style={{ color: 'var(--color-text-secondary)' }}>−{yuan(wf.fixed)}</span>
      </div>
      <div className="execution-row">
        <span className="execution-label" style={{ color: 'var(--color-text-secondary)' }}>− 变动支出（你填）</span>
        <span className="execution-amt" style={{ color: 'var(--color-text-secondary)' }}>−{yuan(wf.variable)}</span>
      </div>
      {wf.debt > 0 && (
        <div className="execution-row">
          <span className="execution-label" style={{ color: 'var(--color-text-secondary)' }}>− 月负债还款</span>
          <span className="execution-amt" style={{ color: 'var(--color-text-secondary)' }}>−{yuan(wf.debt)}</span>
        </div>
      )}
      <div className="execution-row" style={{ borderTop: '1px solid var(--color-border)', marginTop: 4, paddingTop: 10 }}>
        <span className="execution-label" style={{ fontWeight: 700 }}>= 可自由支配</span>
        <span className="execution-amt" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{yuan(wf.disposable)}</span>
      </div>

      {/* 2) 诊断对比：实际生活 vs 法则建议 */}
      {wf.hasSuggest && (
        <div className="execution-note" style={gap > 0 ? { color: 'var(--color-danger)' } : undefined}>
          {gap > 0
            ? `⚠️ 你的实际生活开销 ${yuan(wf.livingActual)}，高于「${(rule ?? comboIncomeRule)?.name}」建议的 ${yuan(wf.ruleLivingSuggest)}（超 ${yuan(gap)}）。可对照法则适当压缩，或接受现状——本方案已按你的真实开销分配剩余的钱。`
            : `✅ 你的实际生活开销 ${yuan(wf.livingActual)}，低于「${(rule ?? comboIncomeRule)?.name}」建议的 ${yuan(wf.ruleLivingSuggest)}，省下的 ${yuan(-gap)} 已并入可自由支配，自动流向储蓄/投资。`}
        </div>
      )}

      {/* 3) 分配：单法则按比例 / 组合直接展示资产桶真实金额 */}
      {items.length > 0 && (
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
      )}

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
        备用金需覆盖 <b>{tb.reserveTargetMonths}</b> 个月基础生活支出（固定 {yuan(wf.fixed)} + 变动 {yuan(wf.variable)} = {yuan(wf.fixed + wf.variable)}/月）。
        这笔钱用于失业、突发疾病、意外开支等极端情况，确保 {tb.reserveTargetMonths} 个月内生活质量不受冲击，是家庭的“安全垫”。
      </div>
      <div className="execution-note" style={{ marginBottom: 8 }}>
        每月入水 <b>{yuan(tb.inflow)}</b>
        {rule ? `（来自「${rule.name}」储蓄额）` : `（来自可自由支配）`}
        ，优先填满备用金桶，目标 {yuan(tb.reserveTarget)}（3×月支出）。
        {tb.monthsToFull > 1 && <> 预计约 <b>{tb.monthsToFull.toFixed(1)}</b> 个月存满。</>}
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
      {!tb.reserveMet ? (
        <div className="execution-note">
          ⚠️ 备用金未满：当前每月入水 {yuan(tb.inflow)}，约 {tb.monthsToFull.toFixed(1)} 个月存满。存满后，每月的 {yuan(tb.inflow)} 按你的选择改投：
          <span style={{ marginLeft: 8, display: 'inline-flex', gap: 6, verticalAlign: 'middle' }}>
            <button
              onClick={() => setSurplusToFlexible(true)}
              style={{ cursor: 'pointer', border: '1px solid var(--color-border)', borderRadius: 999, padding: '2px 10px', fontSize: '12px', background: surplusToFlexible ? 'var(--color-primary)' : 'transparent', color: surplusToFlexible ? '#fff' : 'var(--color-text-secondary)' }}
            >灵活应急金</button>
            <button
              onClick={() => setSurplusToFlexible(false)}
              style={{ cursor: 'pointer', border: '1px solid var(--color-border)', borderRadius: 999, padding: '2px 10px', fontSize: '12px', background: !surplusToFlexible ? 'var(--color-primary)' : 'transparent', color: !surplusToFlexible ? '#fff' : 'var(--color-text-secondary)' }}
            >自由支配</button>
          </span>
          {surplusToFlexible ? '（突发/医疗优先）' : '（娱乐/提升优先）'}
        </div>
      ) : (
        <div className="execution-note">✅ 备用金已存满（每月入水 ≥ 目标），后续每月 {yuan(tb.inflow)} 已按你的选择进入
          {surplusToFlexible ? '灵活应急金' : '自由支配'}。</div>
      )}
    </div>
  );
}
