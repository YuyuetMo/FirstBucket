import React from 'react';
import { PRESETS, type PresetId } from './presets';

interface PresetPickerProps {
  selected: PresetId | null | undefined;
  onSelect: (id: PresetId) => void;
}

/**
 * 6 类人群单选卡。选中后仅写入 profile.preset（由父级调用 onSelect）。
 * 不影响引擎计算，仅用于 RulesPage 推荐排序高亮（设计文档 §2.2 / §7.6）。
 */
export function PresetPicker({ selected, onSelect }: PresetPickerProps) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div className="section-label" style={{ marginBottom: 10 }}>我当前的人生阶段</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 10,
        }}
      >
        {PRESETS.map((p) => {
          const active = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={`preset-card${active ? ' active' : ''}`}
              onClick={() => onSelect(p.id)}
            >
              <div className="preset-card-head">
                <span className="preset-icon">{p.icon}</span>
                <span className="preset-label">{p.label}</span>
                {active && <span className="preset-check">✓</span>}
              </div>
              <span className="preset-desc">{p.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
