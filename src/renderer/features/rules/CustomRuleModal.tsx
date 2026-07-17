// 自定义法则创建/编辑面板（R8 / T10，设计文档 §3.2）。
// 名称 + 动态桶行（桶名 + 比例% + 增/删行）+ scope 单选；实时校验 sum(pct)===100，不符禁用保存并提示差值。
// 零新增依赖：复用既有 .modal / .form-* 类 + 新增少量类（styles.css 先定义后引用）。
import React, { useEffect, useState } from 'react';
import type { Rule } from '../../@core/domain/rule';
import { saveCustomRule, updateCustomRule } from './customRules';

const PALETTE = ['#5BA3A8', '#C97B63', '#D4A857', '#8E7CC3', '#E0A96D', '#A3B86B', '#91C4E8', '#E08A8A'];

interface BucketRow {
  label: string;
  pct: number;
}

interface CustomRuleModalProps {
  open: boolean;
  /** 传入则为编辑模式（R8 编辑） */
  editing?: Rule | null;
  onClose: () => void;
}

function slug(s: string): string {
  const t = s.trim().replace(/\s+/g, '-').replace(/[^\w一-龥-]/g, '');
  return t || 'bucket';
}

export function CustomRuleModal({ open, editing, onClose }: CustomRuleModalProps) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'income' | 'invest'>('income');
  const [rows, setRows] = useState<BucketRow[]>([
    { label: '', pct: 0 },
    { label: '', pct: 0 },
  ]);

  // 编辑模式回填
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setScope(editing.scope === 'invest' ? 'invest' : 'income');
      setRows(
        editing.allocations.length
          ? editing.allocations.map((a) => ({ label: a.label, pct: a.pct }))
          : [{ label: '', pct: 0 }, { label: '', pct: 0 }],
      );
    } else {
      setName('');
      setScope('income');
      setRows([{ label: '', pct: 0 }, { label: '', pct: 0 }]);
    }
  }, [open, editing]);

  if (!open) return null;

  const sum = rows.reduce((s, r) => s + (Number(r.pct) || 0), 0);
  const valid = Math.round(sum) === 100;

  const updateRow = (i: number, patch: Partial<BucketRow>) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows((rs) => [...rs, { label: '', pct: 0 }]);
  const removeRow = (i: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));

  const handleSave = () => {
    const allocations = rows
      .filter((r) => r.label.trim())
      .map((r, i) => ({
        label: r.label.trim(),
        pct: Number(r.pct) || 0,
        bucketKey: slug(r.label),
        color: PALETTE[i % PALETTE.length],
      }));
    if (allocations.length === 0) return;
    const input = { name, scope, allocations };
    if (editing) updateCustomRule(editing.id, input);
    else saveCustomRule(input);
    onClose();
  };

  return (
    <div className="modal-mask" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal custom-rule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{editing ? '编辑自定义法则' : '自定义法则'}</span>
          <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="modal-body">
          <div className="wiz-field">
            <label>法则名称</label>
            <input
              className="form-input"
              value={name}
              placeholder="如：我的 60/20/20"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="wiz-field">
            <label>作用域（决定进入组合引擎的哪一层）</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`combo-chip${scope === 'income' ? ' active' : ''}`}
                onClick={() => setScope('income')}
              >收入级（切整月收入）</button>
              <button
                type="button"
                className={`combo-chip${scope === 'invest' ? ' active' : ''}`}
                onClick={() => setScope('invest')}
              >投资级（切投资池）</button>
            </div>
          </div>

          <div className="wiz-field">
            <label>分配桶（桶名 + 比例%）</label>
            {rows.map((r, i) => (
              <div className="custom-bucket-row" key={i}>
                <span className="custom-bucket-swatch" style={{ background: PALETTE[i % PALETTE.length] }} />
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  value={r.label}
                  placeholder="桶名，如 储蓄"
                  onChange={(e) => updateRow(i, { label: e.target.value })}
                />
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  max={100}
                  style={{ width: 84 }}
                  value={r.pct}
                  onChange={(e) => updateRow(i, { pct: Number(e.target.value) })}
                />
                <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>%</span>
                <button
                  type="button"
                  className="wiz-item-del"
                  onClick={() => removeRow(i)}
                  aria-label="删除该行"
                  disabled={rows.length <= 1}
                >×</button>
              </div>
            ))}
            <div className="custom-add-row">
              <button type="button" className="btn btn-ghost btn-sm" onClick={addRow}>＋ 添加桶</button>
            </div>
          </div>

          <div className={`custom-sum-hint${valid ? ' ok' : ''}`}>
            {valid
              ? '✅ 比例合计 100%，可以保存'
              : sum < 100
                ? `当前合计 ${Math.round(sum)}%，还差 ${100 - Math.round(sum)}%`
                : `当前合计 ${Math.round(sum)}%，超出 ${Math.round(sum) - 100}%`}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button
            className="btn btn-primary"
            disabled={!valid || !name.trim() || !rows.some((r) => r.label.trim())}
            onClick={handleSave}
          >
            {editing ? '保存修改' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
