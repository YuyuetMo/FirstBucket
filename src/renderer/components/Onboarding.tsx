import React, { useMemo, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import type { ExpenseCategory, ExpenseItem, UserProfile } from '../@core/domain/user';
import { allocateThreeBuckets, type ThreeBuckets } from '../features/budget/threeBuckets';
import {
  normalize,
  toMonthlyAmount,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from '../features/classify/classifier';
import { KEYWORD_MAP } from '../features/classify/keywordMap';
import { rememberOverride } from '../features/classify/memory';

/** 固定支出字段（Step2，按月） */
const FIXED_FIELDS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: 'rent', label: '房租 / 房贷', placeholder: '如 3000' },
  { key: 'food', label: '伙食', placeholder: '如 2000' },
  { key: 'transport', label: '交通通勤', placeholder: '如 600' },
  { key: 'utility', label: '水电物业网费', placeholder: '如 400' },
  { key: 'insurance', label: '保险', placeholder: '如 500' },
  { key: 'edu', label: '子女教育 / 赡养', placeholder: '如 800' },
];

/** 取 label 命中的关键词（用于偏好记忆） */
function matchedKeyword(label: string): string {
  for (const kw of Object.keys(KEYWORD_MAP)) {
    if (label.includes(kw)) return kw;
  }
  return label;
}

function effectiveCategory(it: ExpenseItem): ExpenseCategory {
  return it.userCategory ?? it.systemCategory;
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const updateProfile = useAppStore((s) => s.updateProfile);

  const [step, setStep] = useState(0);
  const total = 5;

  // Step1 收入
  const [gross, setGross] = useState('');
  const [social, setSocial] = useState('');
  const [otherInc, setOtherInc] = useState('');
  const [otherDed, setOtherDed] = useState('');

  // Step2 固定支出（key -> 金额字符串）
  const [fixed, setFixed] = useState<Record<string, string>>({});

  // Step3 弹性支出
  const [varText, setVarText] = useState('');
  const [varAmount, setVarAmount] = useState('');
  const [varFreq, setVarFreq] = useState<ExpenseItem['frequency']>('monthly');
  const [varItems, setVarItems] = useState<ExpenseItem[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  // —— 派生指标 ——
  const monthlyIncome = Math.max(
    0,
    (Number(gross) || 0) - (Number(social) || 0) - (Number(otherDed) || 0) + (Number(otherInc) || 0),
  );
  const fixedExpenses = FIXED_FIELDS.reduce((s, f) => s + (Number(fixed[f.key]) || 0), 0);
  const variableExpenses = varItems.reduce((s, it) => s + toMonthlyAmount(it), 0);
  const disposable = monthlyIncome - fixedExpenses - variableExpenses;

  const three: ThreeBuckets = useMemo(() => {
    const temp: UserProfile = {
      ...({
        id: 'tmp',
        age: 0,
        monthlyIncome: 0,
        incomeAnnualBonus: 0,
        incomeOther: 0,
        currentSavings: 0,
        debts: [],
        fixedExpenses: 0,
        variableExpenses: 0,
        goals: [],
        riskProfile: 'balanced',
        insurance: { hasBasic: false, hasCriticalIllness: false, hasAccident: false },
        investHorizonMonths: 120,
        createdAt: '',
        updatedAt: '',
        fixedExpenseItems: [],
        variableExpenseItems: [],
      } as UserProfile),
      monthlyIncome,
      fixedExpenses,
      variableExpenses,
    };
    return allocateThreeBuckets(temp);
  }, [monthlyIncome, fixedExpenses, variableExpenses]);

  // —— 校验 ——
  const canNext =
    step === 0
      ? (Number(gross) || 0) > 0
      : true;

  // —— Step3 增删/改类别 ——
  const addVar = () => {
    const amount = Number(varAmount);
    if (!varText.trim() || !(amount > 0)) return;
    const item = normalize({ text: varText.trim(), amount, frequency: varFreq });
    setVarItems((prev) => [...prev, item]);
    setVarText('');
    setVarAmount('');
    setVarFreq('monthly');
  };
  const removeVar = (id: string) => setVarItems((prev) => prev.filter((it) => it.id !== id));
  const changeCategory = (id: string, cat: ExpenseCategory) => {
    setVarItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, userCategory: cat, remembered: true } : it)),
    );
    const it = varItems.find((x) => x.id === id);
    if (it) rememberOverride(matchedKeyword(it.label), cat);
  };

  const finish = async () => {
    const fixedExpenseItems: ExpenseItem[] = FIXED_FIELDS.filter((f) => (Number(fixed[f.key]) || 0) > 0).map(
      (f) => ({
        id: `fixed-${f.key}`,
        label: f.label,
        amount: Number(fixed[f.key]) || 0,
        frequency: 'monthly',
        systemCategory: 'other',
      }),
    );
    await updateProfile({
      monthlyIncome,
      grossMonthlyIncome: Number(gross) || 0,
      socialInsuranceDeduction: Number(social) || 0,
      otherDeductions: Number(otherDed) || 0,
      otherIncome: Number(otherInc) || 0,
      fixedExpenses,
      fixedExpenseItems,
      variableExpenses,
      variableExpenseItems: varItems,
    });
    onDone();
  };

  const next = () => (step < total - 1 ? setStep(step + 1) : finish());
  const back = () => step > 0 && setStep(step - 1);

  return (
    <div className="modal-mask onb-mask">
      <div className="onb-card">
        {/* Progress */}
        <div className="onb-progress">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={`onb-dot${i <= step ? ' on' : ''}`} />
          ))}
        </div>

        <div key={step} className="onb-anim">
          {/* ── Step1 收入 ── */}
          {step === 0 && (
            <>
              <h2 className="onb-title">💰 第一步 · 你的月收入</h2>
              <p className="onb-sub">录入税前月薪与扣除项，自动算出「到手月薪」</p>
              <div className="wiz-field">
                <label>税前月薪（元）</label>
                <input className="form-input" type="number" min={0} placeholder="如 15000" value={gross} onChange={(e) => setGross(e.target.value)} autoFocus />
              </div>
              <div className="wiz-grid">
                <div className="wiz-field">
                  <label>社保 / 公积金扣除</label>
                  <input className="form-input" type="number" min={0} placeholder="如 3000" value={social} onChange={(e) => setSocial(e.target.value)} />
                </div>
                <div className="wiz-field">
                  <label>其他收入</label>
                  <input className="form-input" type="number" min={0} placeholder="如 1000" value={otherInc} onChange={(e) => setOtherInc(e.target.value)} />
                </div>
                <div className="wiz-field">
                  <label>其他扣除</label>
                  <input className="form-input" type="number" min={0} placeholder="如 0" value={otherDed} onChange={(e) => setOtherDed(e.target.value)} />
                </div>
              </div>
              <div className="wiz-summary-row wiz-hl">
                <span>到手月薪（预估）</span>
                <b>¥{monthlyIncome.toLocaleString()}</b>
              </div>
            </>
          )}

          {/* ── Step2 固定支出 ── */}
          {step === 1 && (
            <>
              <h2 className="onb-title">🧾 第二步 · 固定支出</h2>
              <p className="onb-sub">每月基本固定开销，越精确画像越准</p>
              <div className="wiz-grid">
                {FIXED_FIELDS.map((f) => (
                  <div className="wiz-field" key={f.key}>
                    <label>{f.label}</label>
                    <input className="form-input" type="number" min={0} placeholder={f.placeholder} value={fixed[f.key] ?? ''} onChange={(e) => setFixed((p) => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="wiz-summary-row wiz-hl">
                <span>固定支出小计</span>
                <b>¥{fixedExpenses.toLocaleString()}/月</b>
              </div>
            </>
          )}

          {/* ── Step3 弹性支出 + 分类 ── */}
          {step === 2 && (
            <>
              <h2 className="onb-title">🏷️ 第三步 · 弹性支出与分类</h2>
              <p className="onb-sub">输入弹性开支（如「生病 800」「演唱会 500」），系统自动归类，可拖拽改类</p>
              <div className="wiz-add-row">
                <input className="form-input" placeholder="描述，如 演唱会 500" value={varText} onChange={(e) => setVarText(e.target.value)} />
                <input className="form-input wiz-amt" type="number" min={0} placeholder="金额" value={varAmount} onChange={(e) => setVarAmount(e.target.value)} />
                <select className="form-select wiz-freq" value={varFreq} onChange={(e) => setVarFreq(e.target.value as ExpenseItem['frequency'])}>
                  <option value="monthly">月度</option>
                  <option value="once">一次性</option>
                  <option value="annual">年度</option>
                </select>
                <button className="btn btn-primary btn-sm" onClick={addVar}>添加</button>
              </div>

              <div className="wiz-body">
                <div className="wiz-item-list">
                  {varItems.length === 0 && <p className="muted-hint">还没有弹性支出，可直接下一步</p>}
                  {varItems.map((it) => (
                    <div
                      key={it.id}
                      className={`wiz-item${dragId === it.id ? ' dragging' : ''}`}
                      draggable
                      onDragStart={(e) => { setDragId(it.id); e.dataTransfer.setData('text/plain', it.id); }}
                      onDragEnd={() => setDragId(null)}
                    >
                      <div className="wiz-item-main">
                        <span className="wiz-item-label">{it.label}</span>
                        <span className="wiz-item-amt">¥{it.amount.toLocaleString()}{it.frequency === 'once' ? '（一次性）' : it.frequency === 'annual' ? '（年度）' : '/月'}</span>
                      </div>
                      <div className="wiz-item-foot">
                        <span className="wiz-item-cat">类：{CATEGORY_LABELS[effectiveCategory(it)]}（月均 ¥{Math.round(toMonthlyAmount(it)).toLocaleString()}）</span>
                        <button className="wiz-item-del" onClick={() => removeVar(it.id)}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="wiz-cat-bins">
                  {CATEGORY_ORDER.map((cat) => (
                    <div
                      key={cat}
                      className="wiz-cat-bin"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData('text/plain');
                        if (id) changeCategory(id, cat);
                        setDragId(null);
                      }}
                    >
                      {CATEGORY_LABELS[cat]}
                    </div>
                  ))}
                </div>
              </div>
              <div className="wiz-summary-row wiz-hl">
                <span>弹性支出月均小计</span>
                <b>¥{Math.round(variableExpenses).toLocaleString()}/月</b>
              </div>
            </>
          )}

          {/* ── Step4 财务画像 ── */}
          {step === 3 && (
            <>
              <h2 className="onb-title">📊 第四步 · 你的财务画像</h2>
              <p className="onb-sub">到手 − 固定 − 弹性 = 可支配余额</p>
              <div className="wiz-summary">
                <div className="wiz-summary-row"><span>到手月薪</span><b>¥{monthlyIncome.toLocaleString()}</b></div>
                <div className="wiz-summary-row"><span>固定支出</span><b>− ¥{fixedExpenses.toLocaleString()}</b></div>
                <div className="wiz-summary-row"><span>弹性支出（月均）</span><b>− ¥{Math.round(variableExpenses).toLocaleString()}</b></div>
                <div className="wiz-summary-row onb-hl"><span>可支配余额</span><b>¥{Math.round(disposable).toLocaleString()}/月</b></div>
              </div>
            </>
          )}

          {/* ── Step5 三桶分配 ── */}
          {step === 4 && (
            <>
              <h2 className="onb-title">🪣 第五步 · 三桶分配</h2>
              <p className="onb-sub">把可支配余额分成保命钱 / 灵活钱 / 自由钱</p>
              <div className="wiz-three">
                <div className="wiz-bucket bucket-reserve">
                  <span className="wiz-bucket-label">备用金（固定不动）</span>
                  <span className="wiz-bucket-val">¥{three.reserve.toLocaleString()}</span>
                  <span className="wiz-bucket-sub">目标 3×月支出 ¥{three.reserveTarget.toLocaleString()}{three.reserveMet ? ' · 已达标 ✓' : ' · 未达标'}</span>
                </div>
                <div className="wiz-bucket bucket-flexible">
                  <span className="wiz-bucket-label">灵活应急金</span>
                  <span className="wiz-bucket-val">¥{three.flexible.toLocaleString()}</span>
                  <span className="wiz-bucket-sub">补弹性缺口，不用于娱乐</span>
                </div>
                <div className="wiz-bucket bucket-free">
                  <span className="wiz-bucket-label">自由支配</span>
                  <span className="wiz-bucket-val">¥{three.free.toLocaleString()}</span>
                  <span className="wiz-bucket-sub">储蓄 / 投资 / 消费自由</span>
                </div>
              </div>
              <p className="muted-hint">三桶仅为画像洞察，进入 Dashboard 后可随时调整。完成即生成你的专属方案。</p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="onb-footer">
          {step > 0 ? <button className="btn btn-secondary btn-sm" onClick={back}>上一步</button> : <span />}
          <button className="btn btn-primary btn-sm" disabled={!canNext} onClick={next}>
            {step === total - 1 ? '完成 ✓' : '下一步 →'}
          </button>
        </div>
      </div>
    </div>
  );
}
