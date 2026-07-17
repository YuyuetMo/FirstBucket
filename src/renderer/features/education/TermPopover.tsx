import React, { useEffect, useRef, useState } from 'react';
import { getTerm } from './terms';
import type { Rule } from '../../@core/domain/rule';
import { RulesInfoTip } from './RulesInfoTip';
import { RuleOriginModal } from './RuleOriginModal';

interface TermPopoverProps {
  /** FINANCIAL_TERMS 或 RULE_TERMS 中的 id */
  termId: string;
  /** 提供则启用「比例条 + 右键起源故事 + 键盘兜底」的法则卡片模式（R3 / T03） */
  rule?: Rule;
  /** 触发按钮尺寸 */
  size?: 'sm' | 'md';
  /** 额外样式（如 margin） */
  style?: React.CSSProperties;
}

/**
 * 术语/法则触发组件。
 * - 法则卡片（传 rule）：hover → 小 tooltip（short + 比例条）；右键 → 上下文菜单「了解更多」→ 起源故事 modal；键盘聚焦 Enter → 打开 modal（触屏/键盘兜底）。
 * - 财务字段（不传 rule）：hover → 小 tooltip（short）；点击 → 内联 popover（short + origin）。
 * 内容只从 education/terms.ts 取用（设计文档 §7.1），不硬编码。
 */
export function TermPopover({ termId, rule, size = 'sm', style }: TermPopoverProps) {
  const term = getTerm(termId);
  const [hover, setHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [fieldOpen, setFieldOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen && !modalOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (wrapRef.current?.contains(t)) return;
      setMenuOpen(false);
      setModalOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setModalOpen(false);
        setFieldOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, modalOpen]);

  if (!term) return null;

  const btnSize = size === 'md' ? 18 : 15;

  const openDetail = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (rule) setModalOpen(true);
    else setFieldOpen((v) => !v);
  };

  return (
    <span ref={wrapRef} style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle', ...style }}>
      <button
        type="button"
        aria-label={`查看「${term.label}」释义`}
        title={term.label}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={openDetail}
        onContextMenu={(e) => {
          if (!rule) return;
          e.preventDefault();
          setMenuOpen(true);
        }}
        onKeyDown={(e) => {
          if (rule && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setModalOpen(true);
          }
        }}
        style={{
          width: btnSize + 8,
          height: btnSize + 8,
          borderRadius: '50%',
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg-card)',
          color: 'var(--color-primary)',
          cursor: 'pointer',
          fontSize: btnSize,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          marginLeft: 6,
        }}
      >
        ?
      </button>

      {/* hover 小 tooltip（深底白字 + 比例条），不遮挡其他卡片 */}
      {hover && <RulesInfoTip term={term} rule={rule} />}

      {/* 右键菜单：了解更多（仅法则卡片） */}
      {menuOpen && rule && (
        <div ref={menuRef} className="rule-context-menu">
          <button className="rule-context-item" onClick={() => { setMenuOpen(false); setModalOpen(true); }}>
            了解更多
          </button>
        </div>
      )}

      {/* 起源故事详情（点击 / Enter / 右键「了解更多」） */}
      {modalOpen && rule && <RuleOriginModal termId={rule.id} open={modalOpen} onClose={() => setModalOpen(false)} />}

      {/* 财务字段内联 popover（short + origin） */}
      {fieldOpen && !rule && (
        <span className="rule-field-popover" role="tooltip">
          <div className="rule-info-tip-title">{term.label}</div>
          <div className="rule-info-tip-text">{term.short}</div>
          {term.origin && <div className="rule-origin-text">{term.origin}</div>}
        </span>
      )}
    </span>
  );
}
