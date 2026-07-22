import React, { useState } from 'react';
import { useAppStore } from '../stores/useAppStore';

const PRESETS = [
  { label: '保守', pct: 3, value: 0.03 },
  { label: '稳健', pct: 5, value: 0.05 },
  { label: '进取', pct: 8, value: 0.08 },
];

/**
 * 复利年化利率选择器（v1.6）。
 * 提供保守 3% / 稳健 5% / 进取 8% 三档预设 + 自定义输入（0~20%，步进 0.5%）。
 * 选择即写入 profile.compoundAnnualRate，全应用各处（方案页/复利页/组合/推演/报告）统一复用。
 */
export function RateSelector() {
  const rate = useAppStore((s) => s.profile?.compoundAnnualRate);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const current = typeof rate === 'number' ? rate : 0.05;
  const [custom, setCustom] = useState(false);

  const apply = (v: number) => {
    if (v >= 0 && v <= 0.5) updateProfile({ compoundAnnualRate: v });
  };

  const isPreset = (v: number) => !custom && Math.abs(current - v) < 1e-9;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      marginBottom: 16, padding: '10px 12px',
      background: 'var(--color-bg-page)', borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--color-border)',
    }}>
      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>复利年化</span>
      {PRESETS.map((p) => (
        <button
          key={p.label}
          onClick={() => { setCustom(false); apply(p.value); }}
          style={{
            padding: '4px 12px', borderRadius: 999, fontSize: '12.5px', cursor: 'pointer',
            border: '1px solid var(--color-border)',
            background: isPreset(p.value) ? 'var(--color-primary)' : 'transparent',
            color: isPreset(p.value) ? '#fff' : 'var(--color-text-secondary)',
          }}
        >{p.label} {p.pct}%</button>
      ))}
      <button
        onClick={() => setCustom(true)}
        style={{
          padding: '4px 12px', borderRadius: 999, fontSize: '12.5px', cursor: 'pointer',
          border: '1px solid var(--color-border)',
          background: custom ? 'var(--color-primary)' : 'transparent',
          color: custom ? '#fff' : 'var(--color-text-secondary)',
        }}
      >自定义</button>
      {custom && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input
            className="form-input"
            type="number" min={0} max={20} step={0.5}
            defaultValue={Math.round(current * 100)}
            onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) apply(v / 100); }}
            style={{ width: 72, padding: '4px 8px' }}
          />
          <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>%</span>
        </span>
      )}
      {!custom && (
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
          {(current * 100).toFixed(1)}%
        </span>
      )}
    </div>
  );
}
