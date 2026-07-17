import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';

interface ExpenseWizardProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = ['固定支出', '变动支出', '确认写入'];

/**
 * 支出估算向导（模态步进 3 步）。
 * 仅做「估算填数」并写回 profile（updateProfile），不生成方案、不触引擎。
 * 真实计算链路仍以后续方案页为准（设计文档 §2.2 / T02）。
 */
export function ExpenseWizard({ open, onClose }: ExpenseWizardProps) {
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);

  const [step, setStep] = useState(0);
  const [fixed, setFixed] = useState('');
  const [variable, setVariable] = useState('');
  const [saved, setSaved] = useState(false);

  // 每次打开时用当前档案值初始化
  useEffect(() => {
    if (open && profile) {
      setStep(0);
      setFixed(String(profile.fixedExpenses || ''));
      setVariable(String(profile.variableExpenses || ''));
      setSaved(false);
    }
  }, [open, profile]);

  if (!open || !profile) return null;

  const num = (s: string) => (s === '' ? 0 : Math.max(0, Number(s) || 0));
  const canNext = step === 0 ? num(fixed) >= 0 : step === 1 ? num(variable) >= 0 : true;

  const finish = async () => {
    await updateProfile({ fixedExpenses: num(fixed), variableExpenses: num(variable) });
    setSaved(true);
    setTimeout(onClose, 700);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };
  const back = () => step > 0 && setStep(step - 1);

  return (
    <div className="modal-mask">
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">估算每月支出</span>
          <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>

        <div className="modal-body">
          {/* Progress */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {STEPS.map((_, i) => (
              <span
                key={i}
                style={{
                  height: 4,
                  flex: 1,
                  borderRadius: 2,
                  background: i <= step ? 'var(--color-primary)' : 'var(--color-border)',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>

          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
            {step === 0 && '① 固定支出有哪些？'}
            {step === 1 && '② 变动支出大概多少？'}
            {step === 2 && '③ 确认写入档案'}
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginBottom: 18, lineHeight: 1.6 }}>
            {step === 0 && '几乎每月固定发生的金额，如房租/房贷、水电燃气、保险、订阅等。'}
            {step === 1 && '每月波动较大的开销，如餐饮、购物、娱乐、出行、人情等。'}
            {step === 2 && '以下数值将写入你的财务档案，之后可随时在「设置」修改。'}
          </p>

          {step === 0 && (
            <div>
              <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>
                固定支出合计（元/月）
              </label>
              <input
                className="form-input"
                type="number"
                min={0}
                autoFocus
                value={fixed}
                onChange={(e) => setFixed(e.target.value)}
                placeholder="例如 6000"
              />
            </div>
          )}

          {step === 1 && (
            <div>
              <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>
                变动支出合计（元/月）
              </label>
              <input
                className="form-input"
                type="number"
                min={0}
                autoFocus
                value={variable}
                onChange={(e) => setVariable(e.target.value)}
                placeholder="例如 3000"
              />
            </div>
          )}

          {step === 2 && (
            <div style={{ background: 'var(--color-bg-page)', borderRadius: 'var(--radius-md)', padding: 16, fontSize: '13.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>固定支出</span>
                <b style={{ color: 'var(--color-text)' }}>¥{num(fixed).toLocaleString()}/月</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>变动支出</span>
                <b style={{ color: 'var(--color-text)' }}>¥{num(variable).toLocaleString()}/月</b>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step > 0 ? (
            <button className="btn btn-secondary btn-sm" onClick={back}>上一步</button>
          ) : (
            <span />
          )}
          {saved ? (
            <span className="badge badge-success">已写入 ✓</span>
          ) : (
            <button className="btn btn-primary btn-sm" disabled={!canNext} onClick={next}>
              {step === STEPS.length - 1 ? '写入档案 ✓' : '下一步 →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
