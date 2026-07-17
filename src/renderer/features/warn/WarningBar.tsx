import React, { useMemo, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { getRule } from '../../@core/domain/rule';
import { detectConflict, type ConflictWarning } from './conflict';
import { detectDeviation, detectOverspend, type DeviationWarning } from './deviation';
import { ConflictDialog } from './ConflictDialog';

/** 统一预警类型（冲突 / 偏离 共用渲染） */
type Warning = ConflictWarning | DeviationWarning;

/**
 * 顶部红色警示条 + 各桶红点汇总。
 * 读取 store 的 profile / selectedRuleId / tempProfile / dismissedWarnings，
 * 计算冲突与偏离，过滤已忽略项后渲染。点击「查看」打开 ConflictDialog。
 */
export function WarningBar() {
  const profile = useAppStore((s) => s.profile);
  const selectedRuleId = useAppStore((s) => s.selectedRuleId);
  const tempProfile = useAppStore((s) => s.tempProfile);
  const dismissed = useAppStore((s) => s.dismissedWarnings);
  const dismissWarning = useAppStore((s) => s.dismissWarning);

  const [dialogOpen, setDialogOpen] = useState(false);

  // 以 What-if 临时态优先（不影响已保存档案）
  const effective = tempProfile ?? profile;

  const { warnings, flaggedBuckets } = useMemo(() => {
    if (!effective) return { warnings: [] as Warning[], flaggedBuckets: [] as string[] };
    const list: Warning[] = [];
    const over = detectOverspend(effective);
    if (over) list.push(over);
    const rule = selectedRuleId ? getRule(selectedRuleId) : undefined;
    if (rule) {
      const c = detectConflict(effective, rule);
      if (c) list.push(c);
      const devs = detectDeviation(effective, rule);
      list.push(...devs);
    }
    const visible = list.filter((w) => !dismissed.includes(w.id));
    const flagged = list
      .filter((w): w is DeviationWarning => 'bucketKey' in w && !!w.bucketKey)
      .map((w) => w.bucketKey as string);
    return { warnings: visible, flaggedBuckets: Array.from(new Set(flagged)) };
  }, [effective, selectedRuleId, dismissed]);

  if (warnings.length === 0) return null;

  const dismissAll = () => {
    warnings.forEach((w) => dismissWarning(w.id));
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          marginBottom: 18,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-danger-soft, rgba(239,68,68,0.08))',
          border: '1px solid rgba(239,68,68,0.35)',
          color: 'var(--color-danger)',
        }}
      >
        <span style={{ fontSize: 18 }}>⚠️</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13.5px', fontWeight: 600 }}>
            发现 {warnings.length} 项配置预警
          </div>
          {flaggedBuckets.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11.5px', opacity: 0.85 }}>标红分桶：</span>
              {flaggedBuckets.map((k) => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '11.5px' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-danger)' }} />
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
        <button className="btn btn-sm" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', background: 'transparent' }} onClick={() => setDialogOpen(true)}>
          查看
        </button>
        <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={dismissAll}>
          忽略全部
        </button>
      </div>

      {dialogOpen && (
        <ConflictDialog
          warnings={warnings}
          onClose={() => setDialogOpen(false)}
          onDismissAll={() => {
            dismissAll();
            setDialogOpen(false);
          }}
        />
      )}
    </>
  );
}
