import React, { useMemo } from 'react';
import type { UserProfile } from '../../@core/domain/user';
import type { Rule } from '../../@core/domain/rule';
import { computeHealthScore, computeBadges, emergencyMultiple } from '../profile/health';
import { buildPlanView, type PlanView } from '../plan/metrics';
import { buildReviews } from './reviewRules';

interface ReviewListProps {
  profile: UserProfile;
  /** 单法则模式传入；组合模式为 undefined */
  rule?: Rule;
  /** 方案视图：组合模式由外部传入（applyRules 结果）；单法则模式可省略，内部用 rule 构建 */
  plan?: PlanView;
}

/**
 * 方案点评列表：基于当前档案 + 方案视图构建 ReviewContext，
 * 调用纯函数 buildReviews 渲染命中评语（设计文档 §2.3 / §4.3）。
 * v1.5：支持组合模式——外部传入 plan（applyRules 结果），rule 可缺省。
 * 无副作用，不读全局态。
 */
export function ReviewList({ profile, rule, plan }: ReviewListProps) {
  const hits = useMemo(() => {
    const view: PlanView | null = plan ?? (rule ? buildPlanView(profile, rule) : null);
    if (!view) return [];
    const score = computeHealthScore(profile);
    const badges = computeBadges(profile, { hasPlan: true });
    const em = emergencyMultiple(profile);
    return buildReviews({ profile, plan: view, health: { score, badges, emergencyMultiple: em }, rule });
  }, [profile, rule, plan]);

  if (hits.length === 0) {
    return (
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-header"><span className="card-title">方案点评</span></div>
        <div className="empty-state" style={{ padding: '30px 10px' }}>
          <p>暂无点评，当前方案看起来不错 👍</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="card-header"><span className="card-title">方案点评</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {hits.map((h, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-page)',
              border: '1px solid var(--color-border)',
            }}
          >
            <span className="badge badge-warning" style={{ flexShrink: 0 }}>{h.tag}</span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{h.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
