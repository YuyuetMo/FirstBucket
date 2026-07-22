import { useMemo } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { monthlyDisposable } from '../@core/domain/user';
import { getRule } from '../@core/domain/rule';
import { investmentMonthlyOf } from '../features/plan/metrics';
import { compoundSeries } from '../features/budget/engine';
import { EChart } from '../components/EChart';
import { RateSelector } from '../components/RateSelector';
import type { EChartsOption } from 'echarts';

// F3 修复：与方案页口径统一（metrics.ts / combine.ts）：平衡 0.05、稳健 0.03、进取 0.07。
const RATE: Record<string, number> = { conservative: 0.03, balanced: 0.05, aggressive: 0.07 };

export function VisualizerPage() {
  const profile = useAppStore((s) => s.profile);
  const theme = useAppStore((s) => s.theme);
  const selectedRuleId = useAppStore((s) => s.selectedRuleId);
  const dark = theme === 'dark';

  const model = useMemo(() => {
    if (!profile) return null;
    // R5/T06：基数对齐 investmentMonthlyOf(rule)；未选法则时回退每月可支配，避免说明行崩
    const rule = selectedRuleId ? getRule(selectedRuleId) : undefined;
    const monthly = rule ? investmentMonthlyOf(rule, profile) : monthlyDisposable(profile);
    if (monthly <= 0) return null;
    const rate = profile.compoundAnnualRate ?? RATE[profile.riskProfile] ?? 0.05;
    const months = Math.max(1, profile.investHorizonMonths);
    const series = compoundSeries(monthly, rate, months);
    const final = series[series.length - 1].value;
    const invested = monthly * months;
    return { rule, monthly, rate, months, series, final, invested };
  }, [profile, selectedRuleId]);

  if (!profile || !model) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18" /><path d="M18 9l-5 5-4-4-3 3" /></svg>
        <h3>请先完善收入与支出</h3>
        <p>前往 Dashboard 设置你的月收入与支出，生成有效的复利曲线</p>
      </div>
    );
  }

  // Theme-aware chart colors (flat style)
  const axisColor = dark ? '#6B7890' : '#95A0B0';
  const splitColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(31,39,51,0.08)';
  const lineColor = dark ? '#D4A857' : '#5B8DEF';     /* Blue for light, gold for dark */
  const areaColor = dark ? 'rgba(212,168,87,0.12)' : 'rgba(91,141,239,0.08)';

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    grid: { left: 60, right: 24, top: 30, bottom: 40 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: model.series.filter((_, i) => i % Math.ceil(model.series.length / 12) === 0).map((p) => `${p.month}m`),
      axisLine: { lineStyle: { color: axisColor } },
      axisLabel: { color: axisColor },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: axisColor, formatter: (v: number) => `¥${(v / 1000).toFixed(0)}k` },
      splitLine: { lineStyle: { color: splitColor } },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: model.series.map((p) => p.value),
        lineStyle: { color: lineColor, width: 2.5 },
        areaStyle: { color: areaColor },
      },
    ],
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
          复利可视器
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
          {model.rule
            ? `基于「${model.rule.name}」法则的投资桶月额 ¥${model.monthly.toLocaleString()} · 年化 ${(model.rate * 100).toFixed(0)}% · ${model.months} 个月`
            : `基于每月可支配 ¥${model.monthly.toLocaleString()} · 年化 ${(model.rate * 100).toFixed(0)}% · ${model.months} 个月`}
        </p>
      </div>

      <RateSelector />

      {/* R5：图旁说明行（投资桶月额 + 年化 + 年序列含义） */}
      <div className="chart-caption">
        {model.rule
          ? `基于「${model.rule.name}」法则的投资桶月额 ¥${model.monthly.toLocaleString()}，按 ${(model.rate * 100).toFixed(0)}% 年化复利计算。每一点代表当年年末资产总额。切换法则时曲线自动重算。`
          : `基于每月可支配 ¥${model.monthly.toLocaleString()}（未选法则，建议先在「法则」页选择）。每一点代表当年年末资产总额。`}
      </div>

      {/* KPI Cards */}
      <div className="metric-grid" style={{ marginBottom: '20px' }}>
        <div className="metric-card accent-blue">
          <span className="metric-label">预计期末总值</span>
          <span className="metric-value">¥{model.final.toLocaleString()}</span>
          <div className="metric-meta">
            <span className="metric-trend up">
              <ArrowUp /> +{(model.final > model.invested ? (((model.final - model.invested) / model.invested) * 100).toFixed(1) : '0')}%
            </span>
          </div>
        </div>
        <div className="metric-card accent-green">
          <span className="metric-label">累计投入</span>
          <span className="metric-value">¥{model.invested.toLocaleString()}</span>
          <div className="metric-meta">
            <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
              共 {model.months} 期
            </span>
          </div>
        </div>
        <div className="metric-card accent-gold">
          <span className="metric-label">复利收益</span>
          <span className="metric-value" style={{ color: 'var(--accent-green)' }}>¥{(model.final - model.invested).toLocaleString()}</span>
          <div className="metric-meta">
            <span className="metric-trend up">
              <ArrowUp /> +{((model.final - model.invested) / model.invested * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="chart-card">
        <div className="chart-card-header">
          <span className="chart-card-title">复利增长曲线</span>
        </div>
        <EChart key={theme} option={option} style={{ height: '300px' }} />
        <p style={{
          fontSize: '12px', color: 'var(--color-text-muted)',
          marginTop: '14px', padding: '10px', background: 'var(--color-bg-page)',
          borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-border)',
        }}>
          * 示意图，未计入通胀与税费。<strong style={{ color: 'var(--color-danger)' }}>不构成投资建议。</strong>
        </p>
      </div>
    </div>
  );
}

/* ── Arrow icon component ── */
function ArrowUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}
