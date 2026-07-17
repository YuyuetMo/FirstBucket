import React, { useMemo, useState } from 'react';
import type { UserProfile } from '../../@core/domain/user';
import { RULES, getRule, type Rule, type RuleId } from '../../@core/domain/rule';
import { recommend } from '../rules/recommend';
import { buildPlanView } from '../plan/metrics';
import { applyRules } from '../rules/combine';
import { ComboSelector } from '../rules/ComboSelector';

interface ComparePanelProps {
  profile: UserProfile;
}

function fmtMonths(m: number): string {
  if (!isFinite(m)) return '—';
  if (m <= 0) return '已达标';
  return `${m} 个月`;
}

function fmtPct(r: number): string {
  return `${Math.round(r * 100)}%`;
}

/**
 * A/B 方案对比面板：勾选两条法则并排双卡，比较末值 / 应急金达成月数 / 权益占比。
 * 纯展示，不写档案（设计文档 §2.4 / §4.2）。
 */
export function ComparePanel({ profile }: ComparePanelProps) {
  const top2 = useMemo(() => recommend(profile).slice(0, 2).map((r) => r.rule.id), [profile]);
  const [ruleA, setRuleA] = useState<RuleId>((top2[0] as RuleId) ?? '4321');
  const [ruleB, setRuleB] = useState<RuleId>((top2[1] as RuleId) ?? '50-30-20');

  const a = getRule(ruleA);
  const b = getRule(ruleB);
  const planA = a ? buildPlanView(profile, a) : null;
  const planB = b ? buildPlanView(profile, b) : null;

  // T10 组合引擎试算（A/B 对比页也可选组合）
  const [comboIncome, setComboIncome] = useState<string | null>(null);
  const [comboInvest, setComboInvest] = useState<string[]>([]);
  const comboPlan = useMemo(() => {
    if (!comboIncome && comboInvest.length === 0) return null;
    const ids = [...(comboIncome ? [comboIncome] : []), ...comboInvest];
    return applyRules(ids, profile);
  }, [comboIncome, comboInvest, profile]);

  const maxFv = Math.max(planA?.futureValue ?? 0, planB?.futureValue ?? 0, 1);
  const better = (planA?.futureValue ?? 0) === (planB?.futureValue ?? 0)
    ? null
    : (planA?.futureValue ?? 0) > (planB?.futureValue ?? 0)
      ? 'A'
      : 'B';

  const renderCard = (rule: Rule | undefined, plan: typeof planA, side: 'A' | 'B') => (
    <div className="card" style={{ flex: 1, minWidth: 0 }}>
      <div className="card-header">
        <span className="card-title">{side} · {rule?.name ?? '—'}</span>
        {better === side && <span className="badge badge-success">末值更高</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Metric label="复利末值" value={plan ? `¥${plan.futureValue.toLocaleString()}` : '—'} />
        <Metric label="应急金达成" value={plan ? fmtMonths(plan.reachMonths) : '—'} />
        <Metric label="权益类占比" value={plan ? fmtPct(plan.equityRatio) : '—'} />
        {/* 末值对比条 */}
        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: 4 }}>末值对比</div>
          <div style={{ height: 8, background: 'var(--color-bg-page)', borderRadius: 4, overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: `${((plan?.futureValue ?? 0) / maxFv) * 100}%`, background: side === 'A' ? 'var(--color-primary)' : 'var(--accent-purple)', borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="card-header">
        <span className="card-title">A/B 方案对比</span>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="form-select" style={{ flex: 1, minWidth: 160 }} value={ruleA} onChange={(e) => setRuleA(e.target.value as RuleId)}>
          {RULES.filter((r) => r.scope !== 'withdraw').map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <span style={{ alignSelf: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>vs</span>
        <select className="form-select" style={{ flex: 1, minWidth: 160 }} value={ruleB} onChange={(e) => setRuleB(e.target.value as RuleId)}>
          {RULES.filter((r) => r.scope !== 'withdraw').map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {renderCard(a, planA, 'A')}
        {renderCard(b, planB, 'B')}
      </div>

      {/* T10 组合引擎试算 */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <span className="card-title">组合方案试算（收入层加权 + 投资层拆分）</span>
        </div>
        <ComboSelector
          income={comboIncome}
          invest={comboInvest}
          onChange={(i, v) => { setComboIncome(i); setComboInvest(v); }}
        />
        {comboPlan ? (
          <div style={{ marginTop: 14, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <Metric label="复利末值" value={`¥${comboPlan.futureValue.toLocaleString()}`} />
            <Metric label="权益类占比" value={`${Math.round(comboPlan.equityRatio * 100)}%`} />
            <Metric
              label="应急金达成"
              value={!isFinite(comboPlan.reachMonths) ? '—' : comboPlan.reachMonths <= 0 ? '已达标' : `${comboPlan.reachMonths} 个月`}
            />
          </div>
        ) : (
          <p className="muted-hint" style={{ marginTop: 12 }}>选择一个收入级法则（最多 1 个）与一至两个投资级法则查看组合末值</p>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>{value}</span>
    </div>
  );
}
