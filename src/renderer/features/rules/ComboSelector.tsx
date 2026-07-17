import React from 'react';
import { getRulesByScope } from '../../@core/domain/rule';

interface ComboSelectorProps {
  income: string | null;
  invest: string[];
  onChange: (income: string | null, invest: string[]) => void;
  /** 紧凑模式（用于 A/B 对比卡片内） */
  compact?: boolean;
}

const MAX_INVEST = 2;

/**
 * 组合方案选择器（D11 / T10，设计文档 §3.9 O6）。
 * 收入级最多选 1 个，投资级最多选 2 个；提领法则（withdraw）不出现。
 */
export function ComboSelector({ income, invest, onChange, compact }: ComboSelectorProps) {
  const incomeRules = getRulesByScope('income');
  const investRules = getRulesByScope('invest');

  const pickIncome = (id: string) => onChange(income === id ? null : id, invest);
  const toggleInvest = (id: string) => {
    let next = invest.includes(id)
      ? invest.filter((x) => x !== id)
      : [...invest, id];
    if (next.length > MAX_INVEST) next = next.slice(next.length - MAX_INVEST); // 仅保留最近 2 个
    onChange(income, next);
  };

  return (
    <div className={`combo-selector${compact ? ' compact' : ''}`}>
      <div className="combo-group">
        <div className="combo-group-label">收入级（最多 1 个）</div>
        <div className="combo-chips">
          {incomeRules.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`combo-chip${income === r.id ? ' active' : ''}`}
              onClick={() => pickIncome(r.id)}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>
      <div className="combo-group">
        <div className="combo-group-label">投资级（最多 2 个）</div>
        <div className="combo-chips">
          {investRules.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`combo-chip${invest.includes(r.id) ? ' active' : ''}`}
              onClick={() => toggleInvest(r.id)}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
