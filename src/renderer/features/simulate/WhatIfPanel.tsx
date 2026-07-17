import React, { useMemo, useState } from 'react';
import type { UserProfile } from '../../@core/domain/user';
import { useAppStore } from '../../stores/useAppStore';
import { getRule } from '../../@core/domain/rule';
import { monthlyDisposable, totalMonthlyIncome } from '../../@core/domain/user';
import { investmentMonthlyOf, buildPlanView } from '../plan/metrics';
import { deriveScenarioProfile, type WhatIfScenario } from './scenario';

interface WhatIfPanelProps {
  /** 应用到方案：把派生档案写入 tempProfile 并切到「方案」Tab */
  onApply: (derived: UserProfile) => void;
}

/**
 * What-if 推演面板（R4 / T05，设计文档 §3.2 / O3）。
 * 参数仅本组件内 useState（场景杠杆），经 deriveScenarioProfile 纯函数派生，
 * 不污染已保存档案（绝不调 updateProfile/saveProfile）。
 * 「应用到方案」才把派生结果经 setTempProfile 注入「方案」Tab 预览。
 */
export function WhatIfPanel({ onApply }: WhatIfPanelProps) {
  const profile = useAppStore((s) => s.profile);
  const selectedRuleId = useAppStore((s) => s.selectedRuleId);
  const setTempProfile = useAppStore((s) => s.setTempProfile);

  const [salaryRaisePct, setSalaryRaisePct] = useState(0);
  const [inflationPct, setInflationPct] = useState(0);
  const [lumpExpense, setLumpExpense] = useState(0);
  const [lumpMonth, setLumpMonth] = useState(12);
  const [unemploymentMonths, setUnemploymentMonths] = useState(0);

  const rule = selectedRuleId ? getRule(selectedRuleId) : undefined;
  const months = Math.max(1, profile?.investHorizonMonths || 120);

  const scenario: WhatIfScenario = { salaryRaisePct, inflationPct, lumpExpense, lumpMonth, unemploymentMonths };

  const derived = useMemo(
    () => (profile ? deriveScenarioProfile(profile, scenario) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, salaryRaisePct, inflationPct, lumpExpense, lumpMonth, unemploymentMonths],
  );

  const preview = useMemo(() => {
    if (!derived) return null;
    const monthlyDisp = monthlyDisposable(derived);
    const investMonthly = rule ? investmentMonthlyOf(rule, derived) : 0;
    const plan = rule ? buildPlanView(derived, rule) : null;
    return {
      income: totalMonthlyIncome(derived),
      monthlyDisp,
      investMonthly,
      futureValue: plan?.futureValue ?? 0,
    };
  }, [derived, rule]);

  if (!profile) return null;

  const apply = () => {
    if (!derived) return;
    setTempProfile(derived);
    onApply(derived);
  };
  const reset = () => {
    setTempProfile(null);
    setSalaryRaisePct(0);
    setInflationPct(0);
    setLumpExpense(0);
    setLumpMonth(12);
    setUnemploymentMonths(0);
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">What-if 推演（假设杠杆，不保存）</span>
        {rule && (
          <span className="badge badge-gold">基于「{rule.name}」</span>
        )}
      </div>

      <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
        调整下方杠杆实时预览推演结果；点「应用到方案」才把派生结果注入「方案」Tab。通胀率为单场景临时杠杆，非全局持久化开关。
      </p>

      <Field label={`年薪涨幅 ${salaryRaisePct > 0 ? '+' : ''}${salaryRaisePct}%`} min={-20} max={50} step={1}
        value={salaryRaisePct} onChange={setSalaryRaisePct} />
      <Field label={`通胀率 ${inflationPct > 0 ? '+' : ''}${inflationPct}%`} min={-5} max={15} step={1}
        value={inflationPct} onChange={setInflationPct} />
      <Field label={`大额支出 ¥${lumpExpense.toLocaleString()}（第 ${lumpMonth} 月）`} min={0} max={500000} step={1000}
        value={lumpExpense} onChange={setLumpExpense} />
      <Field label={`大额支出发生月 ${lumpMonth}`} min={1} max={months} step={1}
        value={lumpMonth} onChange={setLumpMonth} />
      <Field label={`失业月份 ${unemploymentMonths} 月`} min={0} max={24} step={1}
        value={unemploymentMonths} onChange={setUnemploymentMonths} />

      {preview && (
        <div className="whatif-preview">
          <PreviewRow label="衍生月收入" value={`¥${Math.round(preview.income).toLocaleString()}`} />
          <PreviewRow label="衍生每月可支配" value={`¥${Math.round(preview.monthlyDisp).toLocaleString()}`} />
          {rule && <PreviewRow label="投资桶月额" value={`¥${Math.round(preview.investMonthly).toLocaleString()}`} />}
          {rule && <PreviewRow label="复利末值（推演）" value={`¥${preview.futureValue.toLocaleString()}`} />}
        </div>
      )}

      {!rule && (
        <p className="muted-hint" style={{ marginBottom: 12 }}>
          提示：先在「法则选择器」选一条法则，可查看投资桶与复利末值推演。
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={reset}>恢复真实档案</button>
        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={apply}>应用到方案</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, min, max, step }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>{label}</span>
      </div>
      <input
        className="form-input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ padding: 0 }}
      />
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
      <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
}
