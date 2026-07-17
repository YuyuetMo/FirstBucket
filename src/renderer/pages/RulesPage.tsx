import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';
import { RULES, type Rule } from '../@core/domain/rule';
import type { PresetId } from '../features/preset/presets';
import { getPreset } from '../features/preset/presets';
import { PresetPicker } from '../features/preset/PresetPicker';
import { TermPopover } from '../features/education/TermPopover';
import { PRINCIPLES } from '../features/education/principles';
import { loadCustomRules, deleteCustomRule } from '../features/rules/customRules';
import { CustomRuleModal } from '../features/rules/CustomRuleModal';

type Tier = 'recommended' | 'suitable' | 'low';
const TIER_ORDER: Record<Tier, number> = { recommended: 0, suitable: 1, low: 2 };

/** 三档派生：与法则/原则走同一条逻辑路径（R1 / T02） */
function tierOf(
  id: string,
  lifeStages: string[],
  custom: boolean | undefined,
  preset: PresetId | null,
  recIds: string[],
): Tier {
  if (custom) return 'suitable'; // O5：自定义法则归「适合」，不参与阶段筛选
  if (!preset) return 'suitable'; // 空预设不灰显
  if (lifeStages.includes(preset) && recIds.includes(id)) return 'recommended';
  if (lifeStages.includes(preset)) return 'suitable';
  return 'low';
}

const LOW_HINT = '与当前人生阶段关联较弱，可参考但非重点推荐。';

export function RulesPage() {
  const { profile, updateProfile, selectedRuleId, setSelectedRule } = useAppStore();
  const preset = (profile?.preset ?? null) as PresetId | null;
  const recommendedRuleIds = preset ? getPreset(preset)?.recommendRules ?? [] : [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [principlesOpen, setPrinciplesOpen] = useState(false);
  const navigate = useNavigate();

  // 自定义法则（R8）：合并进内置 12 法则参与分组与重排
  const customRules = useMemo(() => loadCustomRules(), [selectedRuleId, profile]);

  // T01：选中法则 → 写 store.selectedRuleId（PlanPage 订阅后实时重渲染）
  const handlePick = (id: string, scope: string) => {
    if (scope === 'withdraw') return; // 提领法则不参与方案生成（PRD R3）
    setSelectedRule(selectedRuleId === id ? null : id);
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (r: Rule) => {
    setEditing(r);
    setModalOpen(true);
  };
  const handleDelete = (r: Rule) => {
    if (selectedRuleId === r.id) setSelectedRule(null);
    deleteCustomRule(r.id);
    setEditing(null);
  };

  const renderRuleCard = (r: Rule) => {
    const tier = tierOf(r.id, r.lifeStages, r.custom, preset, recommendedRuleIds);
    const selected = selectedRuleId === r.id;
    const isWithdraw = r.scope === 'withdraw';
    const cls = [
      'rule-card',
      selected ? 'selected' : '',
      isWithdraw ? 'rule-withdraw' : '',
      tier === 'low' ? 'rule-card-low' : '',
    ].join(' ').trim();
    return (
      <div
        key={r.id}
        className={cls}
        onClick={() => handlePick(r.id, r.scope)}
        style={{ cursor: isWithdraw ? 'not-allowed' : 'pointer' }}
        title={isWithdraw ? '提领类法则不参与方案生成' : selected ? '已选择，点击取消' : '点击选择此法则'}
      >
        <div className="rule-header">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="rule-title">{r.name}</span>
              <TermPopover termId={r.id} rule={r} />
              {tier === 'recommended' && <span className="badge badge-success">为你推荐</span>}
              {tier === 'low' && <span className="rule-tier-low-tag">低关联 ▾</span>}
              {selected && <span className="badge badge-primary">已选择</span>}
              {r.custom && <span className="badge badge-custom">自定义</span>}
              <span className={`badge badge-gold rule-scope-badge scope-${r.scope}`}>
                {r.scope === 'income' ? '收入级' : r.scope === 'invest' ? '投资级' : '提领'}
              </span>
              {r.custom && (
                <span style={{ display: 'inline-flex', gap: 6 }}>
                  <button
                    className="rule-mini-btn"
                    onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                  >编辑</button>
                  <button
                    className="rule-mini-btn rule-mini-danger"
                    onClick={(e) => { e.stopPropagation(); handleDelete(r); }}
                  >删除</button>
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="rule-desc">{r.description}</p>
        {tier === 'low' && <p className="rule-low-hint">{LOW_HINT}</p>}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {r.tags.map((t) => (
            <span key={t} className="badge badge-gold">{t}</span>
          ))}
        </div>
      </div>
    );
  };

  const renderPrinciple = (p: (typeof PRINCIPLES)[number]) => {
    const tier = tierOf(p.id, p.lifeStages, undefined, preset, recommendedRuleIds);
    const Icon = p.icon;
    return (
      <div key={p.id} className={`rule-card${tier === 'low' ? ' rule-card-low' : ''}`}>
        <div className="rule-header">
          <div className="rule-icon" style={{ background: p.bg, color: p.color }}>
            <Icon />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="rule-title">{p.title}</span>
              {p.termId && <TermPopover termId={p.termId} rule={RULES.find((x) => x.id === p.termId)} />}
              {tier === 'recommended' && <span className="badge badge-success">为你推荐</span>}
              {tier === 'low' && <span className="rule-tier-low-tag">低关联 ▾</span>}
              <span className={`badge badge-${p.tagType}`}>{p.tag}</span>
            </div>
          </div>
        </div>
        <p className="rule-desc">{p.desc}</p>
        {tier === 'low' && <p className="rule-low-hint">{LOW_HINT}</p>}
      </div>
    );
  };

  // 合并内置 + 自定义，按 scope 分组
  const allRules = [...RULES, ...customRules];
  const incomeRules = allRules.filter((r) => r.scope === 'income');
  const investRules = allRules.filter((r) => r.scope === 'invest');
  const withdrawRules = allRules.filter((r) => r.scope === 'withdraw');

  const sortByTier = (arr: Rule[]) =>
    [...arr].sort((a, b) => {
      const ta = TIER_ORDER[tierOf(a.id, a.lifeStages, a.custom, preset, recommendedRuleIds)];
      const tb = TIER_ORDER[tierOf(b.id, b.lifeStages, b.custom, preset, recommendedRuleIds)];
      return ta - tb;
    });

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
          理财法则
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
          先选择你的人生阶段，我们会在法则库中为你高亮推荐
        </p>
      </div>

      {/* 人群预设（写 profile.preset，仅影响推荐排序） */}
      <PresetPicker selected={preset} onSelect={(id) => updateProfile({ preset: id })} />

      {/* 核心原则（默认折叠，点击展开） */}
      <div
        className="section-label"
        style={{ marginTop: 22, marginBottom: 12, cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setPrinciplesOpen(!principlesOpen)}
      >
        {principlesOpen ? '▼' : '▶'} 通用理财原则（{PRINCIPLES.length} 条核心原则，点击{principlesOpen ? '收起' : '展开'}）
      </div>
      {principlesOpen && PRINCIPLES.map(renderPrinciple)}

      {/* 收入级法则（如何分配月薪） */}
      <div className="rule-section-divider" />
      <div className="rule-scope-group-title">收入级法则（如何分配月薪）</div>
      {sortByTier(incomeRules).map(renderRuleCard)}

      {/* 投资级法则（如何配置投资组合） */}
      <div className="rule-section-divider" />
      <div className="rule-scope-group-title">投资级法则（如何配置投资组合）</div>
      {sortByTier(investRules).map(renderRuleCard)}

      {/* 提领法则：弱化呈现，不参与方案生成 */}
      {withdrawRules.length > 0 && (
        <>
          <div className="rule-section-divider" />
          <div className="rule-scope-group-title rule-scope-group-title-muted">提领法则（不参与方案生成）</div>
          {withdrawRules.map(renderRuleCard)}
        </>
      )}

      {/* 自定义法则入口 */}
      <button className="btn btn-secondary" style={{ marginTop: 18 }} onClick={openCreate}>
        ＋ 自定义法则
      </button>

      {/* Disclaimer */}
      <div className="card" style={{ marginTop: 16, background: 'var(--color-bg-page)', borderStyle: 'dashed' }}>
        <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', lineHeight: 1.65 }}>
          ⚠️ 以上法则仅供参考，不构成专业投资建议。每个人的财务状况不同，
          请根据自身实际情况调整策略。如有需要请咨询持牌理财顾问。
        </p>
      </div>

      {modalOpen && (
        <CustomRuleModal open={modalOpen} editing={editing} onClose={() => { setModalOpen(false); setEditing(null); }} />
      )}

      {/* D: 选法则后浮动引导条 */}
      {selectedRuleId && (() => {
        const selectedName = RULES.find(r => r.id === selectedRuleId)?.name || customRules.find(r => r.id === selectedRuleId)?.name;
        return selectedName ? (
          <div
            style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              zIndex: 100, background: 'var(--color-primary)', color: '#fff',
              padding: '10px 20px', borderRadius: '999px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              fontSize: '14px', fontWeight: 500,
            }}
            onClick={() => navigate('/plan')}
          >
            已选择「{selectedName}」→ 前往查看方案
            <span>→</span>
          </div>
        ) : null;
      })()}
    </div>
  );
}
