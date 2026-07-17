// 规划书聚合层 —— 封面 + 目录 + 图表分页（设计文档 §2.5 / §8 Q1）
// 注意：与导出通道解耦——本文件不依赖 export/pdf.ts；
// 图表转图能力通过 buildReportHtml(ctx, toImage) 的 toImage 参数注入（设计文档 §7.8）。
import type { EChartsOption } from 'echarts';
import type { UserProfile } from '../../@core/domain/user';
import { totalMonthlyIncome, totalMonthlyDebt, monthlyDisposable } from '../../@core/domain/user';
import type { Rule } from '../../@core/domain/rule';
import type { Bucket } from '../../@core/domain/bucket';
import { computeHealthScore, computeBadges, emergencyMultiple, type Badge } from '../profile/health';
import { buildPlanView, type PlanView } from '../plan/metrics';
import { compoundSeries } from '../budget/engine';

/** 规划书上下文（不含点评，遵循 §8 Q1） */
export interface ReportContext {
  profile: UserProfile;
  rule: Rule;
  buckets: Bucket[];
  plan: PlanView;
  healthScore: number;
  badges: Badge[];
  emergencyMultiple: number;
}

/** 汇总构建规划书上下文（纯函数，复用既有引擎） */
export function buildReportContext(
  profile: UserProfile,
  rule: Rule,
  buckets: Bucket[],
): ReportContext {
  const plan = buildPlanView(profile, rule);
  const healthScore = computeHealthScore(profile);
  const badges = computeBadges(profile, { hasPlan: true });
  const em = emergencyMultiple(profile);
  return { profile, rule, buckets, plan, healthScore, badges, emergencyMultiple: em };
}

function escapeHtml(s: string | number): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rateForRisk(risk: UserProfile['riskProfile']): number {
  if (risk === 'aggressive') return 0.07;
  if (risk === 'conservative') return 0.03;
  return 0.05;
}

function fmtMoney(n: number): string {
  return `¥${Math.round(n).toLocaleString()}`;
}

/**
 * 构建规划书 HTML（含封面/目录/图表分页）。
 * toImage: 接收 echarts option，返回 dataURL 字符串（由 export/pdf.ts 注入）。
 * 纯函数（DOM 无关），便于测试与复用。
 */
export function buildReportHtml(ctx: ReportContext, toImage: (option: EChartsOption) => string): string {
  const { profile, rule, buckets, plan, healthScore, badges, emergencyMultiple: em } = ctx;
  const now = new Date().toLocaleString();

  // —— 图表：分桶饼图 ——
  const pieOption: EChartsOption = {
    backgroundColor: '#ffffff',
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        data: buckets.map((b) => ({ name: b.name, value: b.monthlyAmount, itemStyle: { color: b.color } })),
        label: { formatter: '{b}\n{d}%', fontSize: 11 },
      },
    ],
  };
  const pieImg = buckets.length ? toImage(pieOption) : '';

  // —— 图表：复利推演折线 ——
  const monthlySave = Math.max(0, monthlyDisposable(profile));
  const months = Math.max(1, profile.investHorizonMonths || 120);
  const series = compoundSeries(monthlySave, rateForRisk(profile.riskProfile), months);
  const lineOption: EChartsOption = {
    backgroundColor: '#ffffff',
    grid: { left: 60, right: 20, top: 30, bottom: 40 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', name: '月', data: series.map((p) => p.month), axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10, formatter: (v: number) => `${Math.round(v / 1000)}k` } },
    series: [
      {
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: series.map((p) => p.value),
        areaStyle: { opacity: 0.15 },
        lineStyle: { width: 2 },
      },
    ],
  };
  const lineImg = toImage(lineOption);

  const income = totalMonthlyIncome(profile);
  const debt = totalMonthlyDebt(profile);
  const reachText = !isFinite(plan.reachMonths)
    ? '暂无正结余，无法估算'
    : plan.reachMonths <= 0
      ? '已达标'
      : `${plan.reachMonths} 个月`;

  const bucketRows = buckets
    .map((b) => `<tr><td>${escapeHtml(b.name)}</td><td>${fmtMoney(b.monthlyAmount)}</td><td>${escapeHtml(b.note ?? '')}</td></tr>`)
    .join('');
  const badgeItems = badges
    .map(
      (b) =>
        `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:12px;background:${b.earned ? 'rgba(16,185,129,0.12)' : 'var(--color-bg-page, #F0F2F5)'};color:${b.earned ? '#10B981' : '#95A0B0'};margin:3px;">${b.earned ? '✓' : '○'} ${escapeHtml(b.label)}</span>`,
    )
    .join(' ');

  return `
  <div class="fb-report">
    <style>
      .fb-report{font-family:var(--font-body,'Inter',sans-serif);color:#1F2733;max-width:760px;margin:0 auto;padding:8px 4px;}
      .fb-report h1{font-size:26px;color:#5B8DEF;margin-bottom:6px;}
      .fb-report h2{font-size:16px;color:#1F2733;border-left:3px solid #5B8DEF;padding-left:10px;margin:26px 0 12px;}
      .fb-report table{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0;}
      .fb-report th,.fb-report td{border:1px solid #e3e8ef;padding:8px 10px;text-align:left;}
      .fb-report th{background:#F5F7FA;color:#5A6678;}
      .fb-report .cover{text-align:center;padding:40px 0 30px;border-bottom:2px solid #5B8DEF;margin-bottom:10px;}
      .fb-report .toc{background:#F5F7FA;border-radius:10px;padding:16px 20px;font-size:13px;}
      .fb-report .toc li{margin:4px 0;}
      .fb-report .muted{color:#95A0B0;font-size:12px;}
      .fb-report img{max-width:100%;border:1px solid #e3e8ef;border-radius:10px;margin:8px 0;}
      .fb-report .disclaimer{margin-top:28px;font-size:12px;color:#666;border-top:1px dashed #ccc;padding-top:12px;}
      @media print{.fb-report{padding:0;}}
    </style>

    <div class="cover">
      <h1>FirstBucket 理财规划书</h1>
      <p class="muted">致 ${escapeHtml(profile.name || '理财者')} · 生成时间：${escapeHtml(now)}</p>
    </div>

    <div class="toc">
      <b>目录</b>
      <ol>
        <li>档案概览</li>
        <li>推荐法则</li>
        <li>分桶方案</li>
        <li>复利推演</li>
        <li>健康分与徽章</li>
      </ol>
    </div>

    <h2>一、档案概览</h2>
    <table>
      <tr><th>月总收入</th><td>${fmtMoney(income)}</td><th>当前储蓄</th><td>${fmtMoney(profile.currentSavings)}</td></tr>
      <tr><th>固定支出</th><td>${fmtMoney(profile.fixedExpenses)}</td><th>变动支出</th><td>${fmtMoney(profile.variableExpenses)}</td></tr>
      <tr><th>月负债还款</th><td>${fmtMoney(debt)}</td><th>风险偏好</th><td>${escapeHtml(profile.riskProfile)}</td></tr>
      <tr><th>应急金倍数</th><td>${em} 倍</td><th>投资期限</th><td>${profile.investHorizonMonths} 个月</td></tr>
    </table>

    <h2>二、推荐法则</h2>
    <p><b>${escapeHtml(rule.name)}</b> — ${escapeHtml(rule.description)}</p>

    <h2>三、分桶方案</h2>
    ${pieImg ? `<img src="${pieImg}" alt="分桶占比" />` : ''}
    <table><thead><tr><th>分桶</th><th>月金额</th><th>说明</th></tr></thead><tbody>${bucketRows}</tbody></table>

    <h2>四、复利推演</h2>
    <p class="muted">以每月可投 ${fmtMoney(monthlySave)}、假设年化 ${Math.round(rateForRisk(profile.riskProfile) * 100)}%、期限 ${months} 个月测算</p>
    <img src="${lineImg}" alt="复利推演" />
    <table>
      <tr><th>复利末值</th><td>${fmtMoney(plan.futureValue)}</td></tr>
      <tr><th>应急金达成</th><td>${escapeHtml(reachText)}</td></tr>
    </table>

    <h2>五、健康分与徽章</h2>
    <p>财务健康分：<b style="font-size:18px;color:#5B8DEF;">${healthScore}</b> / 100</p>
    <div>${badgeItems}</div>

    <p class="disclaimer">免责声明：本规划书为教育用途，所有数据均为本机模拟示例，不构成投资建议。请根据自身情况独立判断或咨询持牌理财顾问。</p>
  </div>`;
}
