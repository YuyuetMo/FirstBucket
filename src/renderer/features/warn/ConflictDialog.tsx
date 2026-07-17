import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { ConflictWarning } from './conflict';
import type { DeviationWarning } from './deviation';

type Warning = ConflictWarning | DeviationWarning;

interface ConflictDialogProps {
  warnings: Warning[];
  onClose: () => void;
  onDismissAll: () => void;
}

/**
 * 冲突 / 偏离详情 Dialog。
 * 「去调整方案」跳转到法则页；「仍要使用」关闭并写入忽略记忆（不重复弹）。
 */
export function ConflictDialog({ warnings, onClose, onDismissAll }: ConflictDialogProps) {
  const navigate = useNavigate();

  return (
    <div className="modal-mask">
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">配置预警</span>
          <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginBottom: 14 }}>
            以下配置可能存在风险，请确认是否继续使用当前方案。
          </p>
          {warnings.map((w) => {
            const danger = w.severity === 'danger';
            return (
              <div
                key={w.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '12px 14px',
                  marginBottom: 10,
                  borderRadius: 'var(--radius-md)',
                  background: danger ? 'var(--color-danger-soft, rgba(239,68,68,0.08))' : 'var(--color-warning-soft, rgba(245,158,11,0.08))',
                  border: `1px solid ${danger ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1.4 }}>{danger ? '⛔' : '⚠️'}</span>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text)' }}>{w.title}</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: 3 }}>
                    {w.message}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={() => { onClose(); navigate('/rules'); }}>
            去调整方案
          </button>
          <button className="btn btn-primary btn-sm" onClick={onDismissAll}>
            仍要使用
          </button>
        </div>
      </div>
    </div>
  );
}
