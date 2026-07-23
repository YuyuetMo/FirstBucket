import React from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';
import { EChart } from '../components/EChart';
import { computeHealthScore, computeBadges } from '../features/profile/health';
import { totalMonthlyDebt, totalMonthlyIncome } from '../@core/domain/user';
import { colors } from '../@design/tokens';
import { WarningBar } from '../features/warn/WarningBar';
import { TermPopover } from '../features/education/TermPopover';
import { ReportButton } from '../features/report/ReportButton';
import { allocateThreeBuckets, getThreeBucketRatios } from '../features/budget/threeBuckets';
import { getRule } from '../@core/domain/rule';
import { buildWaterfall } from '../features/budget/waterfall';
import { consumptionActualOf, allocationActualOf } from '../features/plan/consumption';
import { prevMonthNeedsConfirm, getConfirm, prevYm, currentYm, ymLabel, cumulativeBuckets, confirmedStreak } from '../features/plan/monthlyLedger';

/* ── Trend arrow icons ── */
const ArrowUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
);
const ArrowDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
);
const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
);

const HealthRing = ({ score }: { score: number }) => {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76">
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--color-border)" strokeWidth="7" />
      <circle
        cx="38" cy="38" r={r} fill="none" stroke="var(--color-primary)" strokeWidth="7"
        strokeLinecap="round" strokeDasharray={c}
        strokeDashoffset={c * (1 - score / 100)} transform="rotate(-90 38 38)"
      />
      <text x="38" y="36" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--color-text)">{score}</text>
      <text x="38" y="52" textAnchor="middle" fontSize="9" fill="var(--color-text-muted)">分</text>
    </svg>
  );
};

export function ProfilePage() {
  const profile = useAppStore((s) => s.profile);
  const buckets = useAppStore((s) => s.buckets);
  const selectedRuleId = useAppStore((s) => s.selectedRuleId);

  const hasData = !!profile && (profile.monthlyIncome > 0 || profile.currentSavings > 0);
  const score = profile ? computeHealthScore(profile) : 0;
  const badges = profile ? computeBadges(profile, { hasPlan: buckets.length > 0 }) : [];
  const earned = badges.filter((b) => b.earned);
  const remainingTo80 = Math.max(0, Math.ceil(((80 - score) / 100) * 8));

  const income = profile ? Math.round(totalMonthlyIncome(profile)) : 0;
  // v1.7.3: 可支配收入 + 三桶均基于「选中法则的实际消费」计算，不再跟随旧 fixed/variable
  const selectedRule = selectedRuleId ? getRule(selectedRuleId) : undefined;
  const [dashConsumption] = profile ? consumptionActualOf(profile, selectedRule) : [0];
  const dashWf = profile ? buildWaterfall(profile, selectedRule, dashConsumption) : null;
  // v1.7.4: Dashboard「本月收支」支出 = 方案页填写的消费类实际合计（未填则 0，触发填写引导）
  const expense = dashConsumption;
  const disp = dashWf ? dashWf.disposable : 0;
  const dashRatios = getThreeBucketRatios();
  const three = profile ? allocateThreeBuckets(
    profile,
    dashWf && dashWf.disposable > 0 ? dashWf.disposable : undefined,
    selectedRule?.reserveTargetMonths ?? 3,
    dashConsumption,
    dashRatios.reserve,
    dashRatios.flexible,
  ) : null;

  // v2.2 L2 执行反馈：连续月数 / 累计三桶 / 上月引导 / 上月快照复盘
  const streak = confirmedStreak();
  const cum = cumulativeBuckets();
  const needPrevConfirm = prevMonthNeedsConfirm();
  const prevConfirm = getConfirm(prevYm());
  const thisPlanned = selectedRule ? allocationActualOf(selectedRule).reduce((s, a) => s + a.amount, 0) : 0;
  const dashReservePct = three && three.reserveTarget > 0 ? Math.min(100, Math.round((cum.reserve / three.reserveTarget) * 100)) : 0;

  const metrics = [
    { label: '月收入', termId: 'monthlyIncome', value: `¥${income.toLocaleString()}`, accent: 'accent-blue' as const },
    { label: '可支配收入', value: `¥${Math.round(disp).toLocaleString()}`, accent: 'accent-green' as const },
    { label: '负债月供', termId: 'debtPayment', value: `¥${profile ? Math.round(totalMonthlyDebt(profile)).toLocaleString() : '0'}`, accent: 'accent-red' as const },
    { label: '当前储蓄', termId: 'currentSavings', value: `¥${(profile?.currentSavings || 0).toLocaleString()}`, accent: 'accent-gold' as const },
  ];

  const pieData = buckets.length > 0
    ? buckets.map((b, i) => ({ value: b.monthlyAmount, name: b.name, itemStyle: { color: colors.palette[i % colors.palette.length] } }))
    : [];

  return (
    <div className="page-wrapper">
      <WarningBar />

      {/* ── Welcome Bar ── */}
      <div className="welcome-bar">
        <div className="welcome-text">
          <h1>
            你好，{profile?.name || '理财者'}！
            {streak > 0 && (
              <span style={{ marginLeft: 10, fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', background: 'var(--color-info-soft, #EAF2FB)', borderRadius: 999, padding: '3px 12px', verticalAlign: 'middle' }}>
                🔥 连续执行 {streak} 个月
              </span>
            )}
          </h1>
          <p>以下是你的财务概览</p>
        </div>
        <div className="welcome-actions">
          <Link to="/plan" className="btn btn-primary btn-sm">⚡ 生成方案</Link>
        </div>
      </div>

      {/* ── 上月未确认引导卡（v2.2 L2：跨月触点） ── */}
      {needPrevConfirm && (
        <div className="card" style={{ marginBottom: 18, borderLeft: '3px solid var(--color-warning, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px' }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>📒 {ymLabel(prevYm())}的执行还没确认</div>
            <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
              上月填过实际金额但没点「确认本月完成」——确认后才会计入备用金累计进度和连续执行月数。
            </div>
          </div>
          <Link to="/plan" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>去方案页确认 →</Link>
        </div>
      )}

      {/* ── 月度复盘卡（v2.2 L2：上月快照 vs 本月实时） ── */}
      {prevConfirm && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-header">
            <span className="card-title">月度复盘：{ymLabel(prevYm())} → {ymLabel(currentYm())}</span>
            {cum.months > 0 && <span className="section-label" style={{ margin: 0 }}>已坚持 {cum.months} 个月</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: '消费类实际', prev: prevConfirm.consumption, curr: Math.round(dashConsumption), lowerBetter: true },
              { label: '已规划分配（储蓄/投资/保险）', prev: prevConfirm.planned, curr: Math.round(thisPlanned), lowerBetter: false },
              { label: '可自由可支配', prev: prevConfirm.disposable, curr: Math.round(disp), lowerBetter: false },
            ].map((m) => {
              const delta = m.curr - m.prev;
              const good = m.lowerBetter ? delta <= 0 : delta >= 0;
              return (
                <div key={m.label} style={{ background: 'var(--color-bg-page)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontWeight: 700 }}>¥{m.curr.toLocaleString()}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    上月 ¥{m.prev.toLocaleString()} ·{' '}
                    <b style={{ color: delta === 0 ? 'var(--color-text-muted)' : good ? 'var(--accent-green)' : 'var(--color-danger)' }}>
                      {delta === 0 ? '持平' : `${delta > 0 ? '+' : '−'}¥${Math.abs(delta).toLocaleString()}`}
                    </b>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="muted-hint" style={{ marginTop: 10 }}>
            本月数字为方案页实时填写值；月底在方案页点「确认本月完成」即可锁定为下月复盘基准。
          </p>
        </div>
      )}

      {/* ── Health Score + Metrics ── */}
      <div className="dash-top">
        <div className="health-card">
          <HealthRing score={score} />
          <div className="health-info">
            <div className="health-title">财务健康分</div>
            <div className="health-sub">
              {score >= 80 ? '资料已较完整，继续保持 🎉' : `再完善 ${remainingTo80} 项即可达到 80 分`}
            </div>
            <Link to="/plan" className="metric-link">去补全资料 →</Link>
          </div>
        </div>

        <div className="metric-grid">
          {metrics.map((m) => (
            <div key={m.label} className={`metric-card ${m.accent}`}>
              <span className="metric-label">
                {m.label}
                {m.termId && <TermPopover termId={m.termId} />}
              </span>
              <span className="metric-value">{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Badges ── */}
      <div className="badge-section">
        <span className="section-label">成就徽章</span>
        <div className="badge-grid">
          {badges.map((b) => (
            <div key={b.id} className={`badge-item${b.earned ? ' earned' : ''}`} title={b.desc}>
              <span className="badge-icon">{b.icon}</span>
              <div className="badge-meta">
                <span className="badge-name">{b.label}</span>
                <span className="badge-desc">{b.desc}</span>
              </div>
              {b.earned && <span className="badge-check">✓</span>}
            </div>
          ))}
        </div>
        {earned.length === 0 && <p className="muted-hint">录入收入支出、生成方案、完成分类即可解锁徽章 🏅</p>}
      </div>

      {/* ── Three Buckets (C8 / T08) ── */}
      {three && (
        <div className="card three-bucket-card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">三桶分配</span>
            <span className="section-label" style={{ margin: 0 }}>可支配余额 ¥{three.total.toLocaleString()}/月</span>
          </div>
          <div className="three-bucket-grid">
            <div className="three-bucket bucket-reserve">
              <span className="three-bucket-label">备用金</span>
              <span className="three-bucket-val">¥{three.reserve.toLocaleString()}</span>
              <span className="three-bucket-sub">固定不动 · {three.reserveMet ? '已达标 ✓' : `目标 ¥${three.reserveTarget.toLocaleString()}`}</span>
            </div>
            <div className="three-bucket bucket-flexible">
              <span className="three-bucket-label">灵活应急金</span>
              <span className="three-bucket-val">¥{three.flexible.toLocaleString()}</span>
              <span className="three-bucket-sub">补弹性缺口，不娱乐</span>
            </div>
            <div className="three-bucket bucket-free">
              <span className="three-bucket-label">自由支配</span>
              <span className="three-bucket-val">¥{three.free.toLocaleString()}</span>
              <span className="three-bucket-sub">储蓄 / 投资 / 消费自由</span>
            </div>
          </div>
          {cum.months > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: 4 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>备用金累计（已确认 {cum.months} 个月）</span>
                <b>¥{cum.reserve.toLocaleString()} / ¥{three.reserveTarget.toLocaleString()} · {dashReservePct}%</b>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'var(--color-bg-page)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                <div style={{ width: `${dashReservePct}%`, height: '100%', borderRadius: 999, background: dashReservePct >= 100 ? 'var(--accent-green)' : 'var(--color-primary)', transition: 'width .3s' }} />
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                <span>灵活累计 <b style={{ color: 'var(--color-text)' }}>¥{cum.flexible.toLocaleString()}</b></span>
                <span>自由累计 <b style={{ color: 'var(--color-text)' }}>¥{cum.free.toLocaleString()}</b></span>
              </div>
            </div>
          )}
          {!selectedRule && (
            <p className="muted-hint" style={{ marginTop: 10 }}>
              未选择理财法则，此处按全部可支配收入估算；在「方案页」选择法则并填写各桶实际支出后，将显示精确的保命钱三桶分配。
            </p>
          )}
        </div>
      )}

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
        <div className="chart-card">
          <div className="chart-card-header"><span className="chart-card-title">本月收支</span></div>
          {hasData && income > 0 ? (
            expense > 0 ? (
              <EChart option={{
                backgroundColor: 'transparent',
                grid: { left: 50, right: 20, top: 24, bottom: 30 },
                tooltip: { trigger: 'axis' },
                xAxis: { type: 'category', data: ['本月'], axisLine: { lineStyle: { color: 'var(--color-border)' } }, axisLabel: { color: 'var(--color-text-muted)', fontSize: 11 } },
                yAxis: { type: 'value', axisLabel: { color: 'var(--color-text-muted)', fontSize: 11, formatter: (v: number) => `¥${(v / 1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: 'var(--color-border)', type: 'dashed' } } },
                series: [
                  { name: '收入', type: 'bar', data: [income], itemStyle: { color: colors.primary, borderRadius: [4, 4, 0, 0] }, barWidth: '28%' },
                  { name: '支出', type: 'bar', data: [expense], itemStyle: { color: '#E8EDF4', borderRadius: [4, 4, 0, 0] }, barWidth: '28%' },
                ],
              }} style={{ height: '240px' }} />
            ) : (
              <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>💡 请在 <Link to="/plan" style={{ color: 'var(--color-primary)' }}>方案页</Link> 为各法则桶填写实际支出金额</div>
                <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>填写后，支出柱状图将自动显示你的真实消费数据</div>
              </div>
            )
          ) : (
            <div className="empty-state"><p>填写财务资料后，这里会显示你的收支对比</p></div>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-card-header"><span className="chart-card-title">分桶配置</span></div>
          {pieData.length > 0 ? (
            <EChart option={{
              backgroundColor: 'transparent',
              tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
              legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11, color: 'var(--color-text-secondary)' } },
              series: [{
                type: 'pie', radius: ['48%', '72%'], center: ['50%', '46%'],
                avoidLabelOverlap: true,
                itemStyle: { borderRadius: 6, borderColor: 'var(--color-bg-card)', borderWidth: 3 },
                label: { show: true, position: 'center', formatter: () => '{t|分桶}', rich: { t: { fontSize: 13, color: 'var(--color-text-muted)' } } },
                emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
                data: pieData,
              }],
            }} style={{ height: '240px' }} />
          ) : (
            <div className="empty-state">
              <p>还没有分桶方案。</p>
              <Link to="/plan" className="btn btn-primary btn-sm">去生成方案 →</Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="card" style={{ marginTop: '18px' }}>
        <div className="card-header"><span className="card-title">快捷操作</span></div>
        <div className="quick-actions">
          <Link to="/plan" className="quick-action"><span>✏️</span> 填写 / 修改资料</Link>
          <Link to="/plan" className="quick-action"><span>⚡</span> 生成理财方案</Link>
          <Link to="/rules" className="quick-action"><span>📚</span> 浏览理财法则</Link>
          <Link to="/visualizer" className="quick-action"><span>📈</span> 复利可视化</Link>
          <a className="quick-action" href="https://github.com/YuyuetMo/FirstBucket/releases" target="_blank" rel="noopener noreferrer"><span>🔄</span> 检查更新</a>
          <span className="quick-action" style={{ cursor: 'pointer' }}><ReportButton /></span>
        </div>
      </div>

    </div>
  );
}
