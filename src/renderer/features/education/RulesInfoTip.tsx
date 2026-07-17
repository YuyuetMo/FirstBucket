// 法则 hover 小 tooltip（R3 / T03，设计文档 §3.2）。
// 深底白字、≤280px / ≤90px，含 1-2 行 short 摘要 + 一条分配比例条；不遮挡其他卡片。
import type { TermDef } from './terms';
import type { Rule } from '../../@core/domain/rule';

export function RulesInfoTip({ term, rule }: { term: TermDef; rule?: Rule }) {
  return (
    <span className="rule-info-tip" role="tooltip">
      <div className="rule-info-tip-title">{term.label}</div>
      <div className="rule-info-tip-text">{term.short}</div>
      {rule && rule.allocations.length > 0 && (
        <div className="rule-info-bar" aria-hidden>
          {rule.allocations.map((a) => (
            <span
              key={a.bucketKey}
              className="rule-info-seg"
              title={`${a.label} ${a.pct}%`}
              style={{ width: `${a.pct}%`, background: a.color }}
            />
          ))}
        </div>
      )}
    </span>
  );
}
