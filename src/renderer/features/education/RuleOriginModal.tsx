// 法则起源故事详情（R3 / T03，设计文档 §3.2）。
// 右键「了解更多」或点击/Enter 触发；复用既有 .modal / .modal-mask 类（唯一 CSS 文件）。
import { getTerm } from './terms';

interface RuleOriginModalProps {
  termId: string;
  open: boolean;
  onClose: () => void;
}

export function RuleOriginModal({ termId, open, onClose }: RuleOriginModalProps) {
  const term = getTerm(termId);
  if (!open || !term) return null;
  return (
    <div className="modal-mask" onClick={onClose} style={{ zIndex: 500 }} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{term.label}</span>
          <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="modal-body">
          <div className="rule-origin-lead">{term.short}</div>
          {term.origin && <div className="rule-origin-text">{term.origin}</div>}
        </div>
      </div>
    </div>
  );
}
