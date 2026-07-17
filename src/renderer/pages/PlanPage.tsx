import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';
import { getRule } from '../@core/domain/rule';
import { applyRule } from '../features/budget/engine';
import { buildPlanView, investmentMonthlyOf } from '../features/plan/metrics';
import { applyRules } from '../features/rules/combine';
import { ComboSelector } from '../features/rules/ComboSelector';
import { ETF_DISCLAIMER, requiresEtfTooltip } from '../features/compliance';
import { WarningBar } from '../features/warn/WarningBar';
import { ReviewList } from '../features/review/ReviewList';
import { WhatIfPanel } from '../features/simulate/WhatIfPanel';
import { ComparePanel } from '../features/compare/ComparePanel';
import { ExecutionList } from '../features/plan/ExecutionList';
import { detectDeviation } from '../features/warn/deviation';
import type { UserProfile, RiskProfile } from '../@core/domain/user';
import type { Bucket } from '../@core/domain/bucket';

type PlanTab = 'scheme' | 'compare' | 'whatif';
const RATE: Record<string, number> = { conservative: 0.03, balanced: 0.05, aggressive: 0.07 };

export function PlanPage() {
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const selectedRuleId = useAppStore((s) => s.selectedRuleId);
  const buckets = useAppStore((s) => s.buckets);
  const saveBuckets = useAppStore((s) => s.saveBuckets);
  const tempProfile = useAppStore((s) => s.tempProfile);
  const setTempProfile = useAppStore((s) => s.setTempProfile);
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [showReview, setShowReview] = useState(false);

  // A: 可折叠财务资料面板
  const [financeOpen, setFinanceOpen] = useState(false);
  // A: 面板内编辑态
  const [editIncome, setEditIncome] = useState('');
  const [editFixed, setEditFixed] = useState('');
  const [editVariable, setEditVariable] = useState('');
  const [editSavings, setEditSavings] = useState('');
  const [editRisk, setEditRisk] = useState<RiskProfile>('balanced');

  // 同步 profile 到编辑态（仅当编辑态为空时，避免编辑中覆盖）
  useEffect(() => {
    if (profile && !editIncome) {
      setEditIncome(String(profile.monthlyIncome || ''));
      setEditFixed(String(profile.fixedExpenses || ''));
      setEditVariable(String(profile.variableExpenses || ''));
      setEditSavings(String(profile.currentSavings || ''));
      setEditRisk(profile.riskProfile || 'balanced');
    }
  }, [profile]);

  // E: 空 profile 快速录入态
  const [quickIncome, setQuickIncome] = useState('');
  const [quickFixed, setQuickFixed] = useState('');
  const [quickVariable, setQuickVariable] = useState('');
  const [quickRisk, setQuickRisk] = useState<RiskProfile>('balanced');

  // T10 组合模式
  const [mode, setMode] = useState<'single' | 'combo'>('single');
  const [comboIncome, setComboIncome] = useState<string | null>(null);
  const [comboInvest, setComboInvest] = useState<string[]>([]);

  // T04：三平级 Tab（组件内 useState，不进全局 store）
  const [tab, setTab] = useState<PlanTab>('scheme');
  const appliedNavRef = useRef(false);
  const prevTab = useRef<PlanTab>('scheme');
  // 切走 What-if Tab 时清空 tempProfile（应用导航除外，避免清空已"应用到方案"的结果）
  useEffect(() => {
    if (prevTab.current === 'whatif' && tab !== 'whatif' && !appliedNavRef.current) {
      setTempProfile(null);
    }
    appliedNavRef.current = false;
    prevTab.current = tab;
  }, [tab, setTempProfile]);

  const rule = selectedRuleId ? getRule(selectedRuleId) : undefined;
  // What-if 临时态优先（不污染已保存档案）
  const effective: UserProfile | null = tempProfile ?? profile;

  // 单法则视图用 buildPlanView；组合视图用 applyRules（两层流水线）
  const plan = useMemo(() => {
    if (!effective) return null;
    if (mode === 'combo') {
      if (!comboIncome && comboInvest.length === 0) return null;
      const ids = [...(comboIncome ? [comboIncome] : []), ...comboInvest];
      return applyRules(ids, effective);
    }
    if (!rule) return null;
    return buildPlanView(effective, rule);
  }, [effective, mode, comboIncome, comboInvest, rule]);

  const generated = plan?.buckets ?? [];
  const max = Math.max(1, ...generated.map((b) => b.monthlyAmount));

  // 标红分桶：偏离判定中「单桶占比偏高」的 bucketKey 集合（仅单法则视图）
  const flaggedKeys = useMemo(() => {
    if (mode !== 'single' || !effective || !rule) return new Set<string>();
    return new Set(
      detectDeviation(effective, rule)
        .filter((d) => d.bucketKey)
        .map((d) => d.bucketKey as string),
    );
  }, [mode, effective, rule]);

  // 合规：含 ETF/基金 文案需提示「非投资建议」
  const needsTip = rule && mode === 'single' ? requiresEtfTooltip(rule.description) : false;

  // R5：图旁说明用投资桶月额 + 年化利率
  const investMonthly = rule && effective ? investmentMonthlyOf(rule, effective) : 0;
  const annualRate = effective ? RATE[effective.riskProfile] ?? 0.05 : 0.05;

  useEffect(() => {
    setSaved(false);
  }, [selectedRuleId, tempProfile, mode, comboIncome, comboInvest]);

  if (!profile) {
    return (
      <div className="page-wrapper">
        <div style={{ marginBottom: '18px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
            我的方案
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
            先填写你的财务资料，即可生成专属方案
          </p>
        </div>

        <div className="settings-group">
          <div className="settings-group-header">财务资料</div>
          <div className="settings-group-body">
            <div className="settings-row">
              <div><div className="settings-label">月收入（元）</div></div>
              <input className="form-input" style={{ width: '220px' }} type="number" min={0} value={quickIncome} onChange={e => setQuickIncome(e.target.value)} placeholder="如 15000" />
            </div>
            <div className="settings-row">
              <div><div className="settings-label">固定支出（元/月）</div></div>
              <input className="form-input" style={{ width: '220px' }} type="number" min={0} value={quickFixed} onChange={e => setQuickFixed(e.target.value)} placeholder="如 8000" />
            </div>
            <div className="settings-row">
              <div><div className="settings-label">变动支出（元/月）</div></div>
              <input className="form-input" style={{ width: '220px' }} type="number" min={0} value={quickVariable} onChange={e => setQuickVariable(e.target.value)} placeholder="如 2000" />
            </div>
            <div className="settings-row">
              <div><div className="settings-label">风险偏好</div></div>
              <select className="form-select" style={{ width: '220px' }} value={quickRisk} onChange={e => setQuickRisk(e.target.value as RiskProfile)}>
                <option value="conservative">保守型</option>
                <option value="balanced">稳健型</option>
                <option value="aggressive">积极型</option>
              </select>
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary"
          disabled={!quickIncome || Number(quickIncome) <= 0}
          onClick={() => {
            updateProfile({
              monthlyIncome: Number(quickIncome) || 0,
              fixedExpenses: Number(quickFixed) || 0,
              variableExpenses: Number(quickVariable) || 0,
              riskProfile: quickRisk as RiskProfile,
            });
          }}
          style={{ marginTop: 16 }}
        >
          生成我的方案 →
        </button>
      </div>
    );
  }

  const handleApply = (derived: UserProfile) => {
    appliedNavRef.current = true; // 防止切 Tab 时清空
    setTab('scheme'); // 注入后回到方案 Tab 查看
    void derived;
  };

  return (
    <div className="page-wrapper">
      <WarningBar />

      {/* A: 可折叠财务资料快捷面板 */}
      {profile && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div
            onClick={() => setFinanceOpen(!financeOpen)}
            style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              📊 ¥{profile.monthlyIncome?.toLocaleString() ?? 0}/月 收入
              {' · '}固定 ¥{profile.fixedExpenses?.toLocaleString() ?? 0}
              {' · '}弹性 ¥{profile.variableExpenses?.toLocaleString() ?? 0}
              {' · '}{profile.riskProfile === 'conservative' ? '保守型' : profile.riskProfile === 'aggressive' ? '积极型' : '稳健型'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{financeOpen ? '收起 ▲' : '调整资料 ▼'}</span>
          </div>
          {financeOpen && (
            <div className="settings-group-body" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
              <div className="settings-row">
                <div><div className="settings-label">月收入（元）</div></div>
                <input
                  className="form-input" style={{ width: '200px' }} type="number" min={0}
                  value={editIncome} onChange={e => setEditIncome(e.target.value)}
                  onBlur={() => updateProfile({ monthlyIncome: Number(editIncome) || 0 })}
                />
              </div>
              <div className="settings-row">
                <div><div className="settings-label">固定支出（元/月）</div></div>
                <input
                  className="form-input" style={{ width: '200px' }} type="number" min={0}
                  value={editFixed} onChange={e => setEditFixed(e.target.value)}
                  onBlur={() => updateProfile({ fixedExpenses: Number(editFixed) || 0 })}
                />
              </div>
              <div className="settings-row">
                <div><div className="settings-label">变动支出（元/月）</div></div>
                <input
                  className="form-input" style={{ width: '200px' }} type="number" min={0}
                  value={editVariable} onChange={e => setEditVariable(e.target.value)}
                  onBlur={() => updateProfile({ variableExpenses: Number(editVariable) || 0 })}
                />
              </div>
              <div className="settings-row">
                <div><div className="settings-label">当前储蓄（元）</div></div>
                <input
                  className="form-input" style={{ width: '200px' }} type="number" min={0}
                  value={editSavings} onChange={e => setEditSavings(e.target.value)}
                  onBlur={() => updateProfile({ currentSavings: Number(editSavings) || 0 })}
                />
              </div>
              <div className="settings-row">
                <div><div className="settings-label">风险偏好</div></div>
                <select
                  className="form-select" style={{ width: '200px' }}
                  value={editRisk} onChange={e => setEditRisk(e.target.value as RiskProfile)}
                  onBlur={() => updateProfile({ riskProfile: editRisk })}
                >
                  <option value="conservative">保守型</option>
                  <option value="balanced">稳健型</option>
                  <option value="aggressive">积极型</option>
                </select>
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', margin: '8px 0 0' }}>
                离开输入框后自动保存，方案会即时重新计算
              </p>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
          我的方案
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
          {mode === 'combo'
            ? '组合方案：收入层加权 + 投资层拆分'
            : `已应用「${rule?.name}」生成分桶配置${tempProfile ? '（假设推演预览）' : ''}`}
        </p>
      </div>

      {/* T04：三平级 Tab */}
      <div className="plan-tab-bar">
        <button className={`plan-tab${tab === 'scheme' ? ' active' : ''}`} onClick={() => setTab('scheme')}>方案</button>
        <button className={`plan-tab${tab === 'compare' ? ' active' : ''}`} onClick={() => setTab('compare')}>A·B 对比</button>
        <button className={`plan-tab${tab === 'whatif' ? ' active' : ''}`} onClick={() => setTab('whatif')}>What-if 推演</button>
      </div>

      {/* ── 方案 Tab ── */}
      {tab === 'scheme' && (
        <SchemeTab
          mode={mode}
          setMode={setMode}
          comboIncome={comboIncome}
          comboInvest={comboInvest}
          setCombo={(i, v) => { setComboIncome(i); setComboInvest(v); }}
          rule={rule}
          effective={effective}
          plan={plan}
          generated={generated}
          max={max}
          flaggedKeys={flaggedKeys}
          needsTip={needsTip}
          investMonthly={investMonthly}
          annualRate={annualRate}
          tempProfile={!!tempProfile}
          saved={saved}
          setSaved={setSaved}
          saveBuckets={saveBuckets}
          navigate={navigate}
          showReview={showReview}
          setShowReview={setShowReview}
        />
      )}

      {/* ── A·B 对比 Tab（从 RulesPage 迁入） ── */}
      {tab === 'compare' && profile && <ComparePanel profile={profile} />}

      {/* ── What-if 推演 Tab ── */}
      {tab === 'whatif' && profile && <WhatIfPanel onApply={handleApply} />}
    </div>
  );
}

interface SchemeTabProps {
  mode: 'single' | 'combo';
  setMode: (m: 'single' | 'combo') => void;
  comboIncome: string | null;
  comboInvest: string[];
  setCombo: (i: string | null, v: string[]) => void;
  rule: ReturnType<typeof getRule>;
  effective: UserProfile | null;
  plan: ReturnType<typeof buildPlanView> | null;
  generated: ReturnType<typeof buildPlanView>['buckets'];
  max: number;
  flaggedKeys: Set<string>;
  needsTip: boolean;
  investMonthly: number;
  annualRate: number;
  tempProfile: boolean;
  saved: boolean;
  setSaved: (v: boolean) => void;
  saveBuckets: (bs: Bucket[]) => Promise<void>;
  navigate: (p: string) => void;
  showReview: boolean;
  setShowReview: (v: boolean) => void;
}

function SchemeTab(props: SchemeTabProps) {
  const {
    mode, setMode, comboIncome, comboInvest, setCombo, rule, effective,
    plan, generated, max, flaggedKeys, needsTip, investMonthly, annualRate,
    tempProfile, saved, setSaved, saveBuckets, navigate, showReview, setShowReview,
  } = props;

  // 单法则模式未选法则
  if (mode === 'single' && !rule) {
    return (
      <>
        <ModeToggle mode={mode} setMode={setMode} />
        <div className="empty-state">
          <h3>请先选择理财法则</h3>
          <p>在「法则选择器」中选择一个适用的法则，或切换到「组合方案」</p>
        </div>
      </>
    );
  }

  // 组合模式未选任何法则
  if (mode === 'combo' && !plan) {
    return (
      <>
        <ModeToggle mode={mode} setMode={setMode} />
        <div className="empty-state">
          <h3>选择组合法则</h3>
          <p>下方选择一个收入级法则（最多 1 个）与一至两个投资级法则</p>
        </div>
        <ComboSelector income={comboIncome} invest={comboInvest} onChange={setCombo} />
      </>
    );
  }

  if (!plan || !effective) return null;

  return (
    <>
      <ModeToggle mode={mode} setMode={setMode} />

      {mode === 'combo' && (
        <ComboSelector income={comboIncome} invest={comboInvest} onChange={setCombo} />
      )}

      {/* F1 温和提示：仅选了收入级法则、未搭配投资级法则时，建议补一个以获得更细的资产构成 */}
      {mode === 'combo' && comboIncome && comboInvest.length === 0 && (
        <div style={{
          fontSize: '13px', color: 'var(--color-text-secondary)',
          marginBottom: '16px', padding: '10px 12px',
          background: 'var(--color-bg-page)', borderRadius: 'var(--radius-sm)',
          border: '1px dashed var(--color-border)',
        }}>
          已生成基础方案（默认归入投资桶）。建议再搭配一个投资级法则（如 60/40、全天候），以获得更细的资产构成与更贴合风险偏好的收益假设。
        </div>
      )}

      {/* R5：图旁说明行（投资桶月额 + 年化） */}
      <div className="chart-caption">
        基于「{rule?.name}」法则的投资桶月额 ¥{Math.round(investMonthly).toLocaleString()}，按 {(annualRate * 100).toFixed(0)}% 年化复利计算。每一点代表当年年末资产总额。切换法则时数据自动重算。
      </div>

      {/* 末值 / 权益占比 速览（随法则 / 组合变化） */}
      <div className="plan-summary">
        <div className="plan-summary-item">
          <span className="plan-summary-label">复利末值（{effective.investHorizonMonths} 月）</span>
          <span className="plan-summary-value">¥{plan.futureValue.toLocaleString()}</span>
        </div>
        <div className="plan-summary-item">
          <span className="plan-summary-label">权益类占比</span>
          <span className="plan-summary-value">{Math.round(plan.equityRatio * 100)}%</span>
        </div>
        <div className="plan-summary-item">
          <span className="plan-summary-label">应急金达成</span>
          <span className="plan-summary-value">
            {!isFinite(plan.reachMonths) ? '—' : plan.reachMonths <= 0 ? '已达标' : `${plan.reachMonths} 个月`}
          </span>
        </div>
      </div>

      {/* Compliance tip */}
      {needsTip && (
        <div className="card" style={{ marginBottom: '16px', borderColor: 'var(--color-primary-border)', borderLeft: '3px solid var(--color-primary)' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 500 }}>
            ⚠️ 本方案含基金/指数分配，仅为教育示例，{ETF_DISCLAIMER}。
          </span>
        </div>
      )}

      {/* Bucket cards */}
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', marginBottom: '20px' }}>
        {generated.map((b) => {
          const alloc = mode === 'single' && rule ? rule.allocations.find((a) => a.label === b.name) : undefined;
          const flagged = alloc ? flaggedKeys.has(alloc.bucketKey) : false;
          return (
            <div className="card" key={b.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <strong style={{ fontSize: '14.5px', color: 'var(--color-text)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {flagged && <span title="该桶占比偏高" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-danger)', display: 'inline-block' }} />}
                  {b.name}
                </strong>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700,
                  color: b.color || 'var(--color-primary)',
                }}>
                  ¥{b.monthlyAmount.toLocaleString()}<span style={{ fontSize: '12', fontWeight: 400, color: 'var(--color-text-muted)' }}>/月</span>
                </span>
              </div>
              <div style={{
                height: '6px', background: 'var(--color-bg-page)', borderRadius: '3px',
                overflow: 'hidden', marginBottom: '10px',
              }}>
                <span style={{
                  display: 'block', height: '100%',
                  width: `${(b.monthlyAmount / max) * 100}%`,
                  background: flagged ? 'var(--color-danger)' : b.color || 'var(--color-primary)',
                  borderRadius: '3px',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>{b.note}</span>
            </div>
          );
        })}
      </div>

      {/* R6：本月执行清单（路线B 现金流瀑布 + 组合模式接入） */}
      <ExecutionList
        profile={effective}
        rule={mode === 'single' ? rule ?? undefined : undefined}
        comboBuckets={mode === 'combo' && plan ? plan.buckets : undefined}
        comboIncomeRule={mode === 'combo' && comboIncome ? getRule(comboIncome) : undefined}
      />

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className="btn btn-primary"
          onClick={() => { saveBuckets(generated); setSaved(true); }}
        >
          保存方案
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/visualizer')}>
          查看复利 →
        </button>
        <button className="btn btn-secondary" onClick={() => setShowReview(!showReview)}>
          💡 方案点评
        </button>
        {saved && (
          <span className="badge badge-success" style={{ alignSelf: 'center' }}>已保存 ✓</span>
        )}
      </div>

      {showReview && plan && <ReviewList profile={effective} rule={mode === 'single' ? rule ?? undefined : undefined} plan={plan} />}
    </>
  );
}

function ModeToggle({ mode, setMode }: { mode: 'single' | 'combo'; setMode: (m: 'single' | 'combo') => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
      <button
        className="btn btn-sm"
        style={{
          background: mode === 'single' ? 'var(--color-primary)' : 'var(--color-bg-card)',
          color: mode === 'single' ? '#fff' : 'var(--color-text)',
          border: '1px solid var(--color-border)',
        }}
        onClick={() => setMode('single')}
      >
        单法则方案
      </button>
      <button
        className="btn btn-sm"
        style={{
          background: mode === 'combo' ? 'var(--color-primary)' : 'var(--color-bg-card)',
          color: mode === 'combo' ? '#fff' : 'var(--color-text)',
          border: '1px solid var(--color-border)',
        }}
        onClick={() => setMode('combo')}
      >
        组合方案
      </button>
    </div>
  );
}
