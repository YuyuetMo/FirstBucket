import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import type { RiskProfile } from '../@core/domain/user';
import { TermPopover } from '../features/education/TermPopover';
import { ExpenseWizard } from '../features/estimator/ExpenseWizard';

const RISK_OPTIONS: Array<{ value: RiskProfile; label: string }> = [
  { value: 'conservative', label: '保守型' },
  { value: 'balanced', label: '稳健型' },
  { value: 'aggressive', label: '积极型' },
];

export function SettingsPage() {
  const { profile, theme, setTheme, updateProfile } = useAppStore();
  const [saved, setSaved] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [fixedExpenses, setFixedExpenses] = useState('');
  const [variableExpenses, setVariableExpenses] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const [debtPayment, setDebtPayment] = useState('');
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('balanced');

  // 用 profile 初始化（仅当本地 state 尚未被用户编辑）
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAge(profile.age ? String(profile.age) : '');
      setMonthlyIncome(String(profile.monthlyIncome || ''));
      setFixedExpenses(String(profile.fixedExpenses || ''));
      setVariableExpenses(String(profile.variableExpenses || ''));
      setCurrentSavings(String(profile.currentSavings || ''));
      setDebtPayment(String((profile.debts?.[0]?.monthlyPayment) || ''));
      setRiskProfile(profile.riskProfile || 'balanced');
    }
  }, [profile]);

  const num = (s: string) => (s === '' ? 0 : Math.max(0, Number(s) || 0));

  const handleSave = async () => {
    const debtPaymentVal = num(debtPayment);
    await updateProfile({
      name: name.trim(),
      age: num(age),
      monthlyIncome: num(monthlyIncome),
      fixedExpenses: num(fixedExpenses),
      variableExpenses: num(variableExpenses),
      currentSavings: num(currentSavings),
      riskProfile,
      debts:
        debtPaymentVal > 0
          ? [{ id: 'd1', label: '月度负债', monthlyPayment: debtPaymentVal, remaining: 0, interestRate: 0 }]
          : [],
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: '26px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>设置</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>管理你的个人偏好与财务资料</p>
      </div>

      {/* Profile Section */}
      <div className="settings-group">
        <div className="settings-group-header">个人信息</div>
        <div className="settings-group-body">
          <div className="settings-row">
            <div><div className="settings-label">昵称</div><div className="settings-desc">用于界面显示</div></div>
            <input className="form-input" style={{ width: '220px' }} value={name} onChange={(e) => setName(e.target.value)} placeholder="输入昵称" />
          </div>
          <div className="settings-row">
            <div><div className="settings-label">年龄</div><div className="settings-desc">用于方案与风险建议</div></div>
            <input className="form-input" style={{ width: '220px' }} type="number" min={0} max={120} value={age} onChange={(e) => setAge(e.target.value)} placeholder="可选" />
          </div>
        </div>
      </div>

      {/* Financial Section */}
      <div className="settings-group">
        <div className="settings-group-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          财务资料（用于生成方案）
          <button className="btn btn-ghost btn-sm" onClick={() => setWizardOpen(true)}>🧮 估算支出</button>
        </div>
        <div className="settings-group-body">
          <div className="settings-row">
            <div><div className="settings-label">月收入（元）<TermPopover termId="monthlyIncome" /></div></div>
            <input className="form-input" style={{ width: '220px' }} type="number" min={0} value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} placeholder="0" />
          </div>
          <div className="settings-row">
            <div><div className="settings-label">固定支出（元/月）<TermPopover termId="fixedExpenses" /></div></div>
            <input className="form-input" style={{ width: '220px' }} type="number" min={0} value={fixedExpenses} onChange={(e) => setFixedExpenses(e.target.value)} placeholder="0" />
          </div>
          <div className="settings-row">
            <div><div className="settings-label">变动支出（元/月）<TermPopover termId="variableExpenses" /></div></div>
            <input className="form-input" style={{ width: '220px' }} type="number" min={0} value={variableExpenses} onChange={(e) => setVariableExpenses(e.target.value)} placeholder="0" />
          </div>
          <div className="settings-row">
            <div><div className="settings-label">当前储蓄（元）<TermPopover termId="currentSavings" /></div></div>
            <input className="form-input" style={{ width: '220px' }} type="number" min={0} value={currentSavings} onChange={(e) => setCurrentSavings(e.target.value)} placeholder="0" />
          </div>
          <div className="settings-row">
            <div><div className="settings-label">负债月供（元/月）<TermPopover termId="debtPayment" /></div></div>
            <input className="form-input" style={{ width: '220px' }} type="number" min={0} value={debtPayment} onChange={(e) => setDebtPayment(e.target.value)} placeholder="0" />
          </div>
          <div className="settings-row">
            <div><div className="settings-label">风险偏好<TermPopover termId="riskProfile" /></div><div className="settings-desc">决定投资组合的建议风格</div></div>
            <select className="form-select" style={{ width: '220px' }} value={riskProfile} onChange={(e) => setRiskProfile(e.target.value as RiskProfile)}>
              {RISK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="settings-group">
        <div className="settings-group-header">外观</div>
        <div className="settings-group-body">
          <div className="settings-row">
            <div><div className="settings-label">主题模式</div><div className="settings-desc">选择你喜欢的界面配色</div></div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['light', 'dark', 'system'] as const).map((m) => (
                <button key={m} className={`btn ${theme === m ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setTheme(m)}>
                  {m === 'light' ? '☀️ 亮色' : m === 'dark' ? '🌙 暗色' : '💻 跟随系统'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Data Section */}
      <div className="settings-group">
        <div className="settings-group-header">数据管理</div>
        <div className="settings-group-body">
          <div className="settings-row">
            <div><div className="settings-label">数据存储</div><div className="settings-desc">所有数据仅存储在本机 SQLite 数据库中</div></div>
            <span className="badge badge-success">本地安全</span>
          </div>
          <div className="settings-row">
            <div><div className="settings-label">导出全部数据</div><div className="settings-desc">备份你的财务记录为 CSV 或 PDF 文件</div></div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => useAppStore.getState().exportData('csv')}>CSV 格式</button>
              <button className="btn btn-secondary btn-sm" onClick={() => useAppStore.getState().exportData('pdf')}>PDF 格式</button>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="settings-group">
        <div className="settings-group-header">关于</div>
        <div className="settings-group-body">
          <div className="settings-row" style={{ borderBottom: 'none' }}>
            <div>
              <div className="settings-label">FirstBucket v2.1</div>
              <div className="settings-desc">面向年轻人的桌面端理财规划客户端 · 基于 Electron + React + SQLite</div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave}>保存修改</button>
      </div>

      {saved && (
        <div className="toast success" style={{ position: 'fixed' }}>✓ 已保存到本机</div>
      )}

      <ExpenseWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
