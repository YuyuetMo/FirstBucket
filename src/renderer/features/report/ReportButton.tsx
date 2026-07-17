import React, { useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { getRule } from '../../@core/domain/rule';
import { buildReportContext } from './planReport';
import { renderReportPdf } from '../export/pdf';

/**
 * 一键生成规划书按钮 + 进度提示。
 * 读取当前档案 + 选定法则，聚合上下文后调用 renderReportPdf（设计文档 §2.5 / T05）。
 */
export function ReportButton() {
  const profile = useAppStore((s) => s.profile);
  const selectedRuleId = useAppStore((s) => s.selectedRuleId);
  const buckets = useAppStore((s) => s.buckets);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const handleClick = () => {
    if (!profile) {
      setToast('请先完善财务档案');
      setTimeout(() => setToast(''), 2500);
      return;
    }
    const rule = selectedRuleId ? getRule(selectedRuleId) : undefined;
    if (!rule) {
      setToast('请先在方案页选择一条法则');
      setTimeout(() => setToast(''), 2500);
      return;
    }
    setLoading(true);
    // 让按钮先渲染「生成中」，再执行（图表转图为同步重操作）
    setTimeout(() => {
      try {
        const ctx = buildReportContext(profile, rule, buckets);
        renderReportPdf(ctx);
      } finally {
        setLoading(false);
      }
    }, 50);
  };

  return (
    <>
      <button className="btn btn-secondary btn-sm" onClick={handleClick} disabled={loading}>
        {loading ? '生成中…' : '📄 生成规划书'}
      </button>
      {toast && (
        <div className="toast info" style={{ position: 'fixed' }}>{toast}</div>
      )}
    </>
  );
}
