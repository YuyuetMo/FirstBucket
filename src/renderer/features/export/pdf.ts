import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import type { UserProfile } from '../../@core/domain/user';
import { totalMonthlyIncome, totalMonthlyDebt } from '../../@core/domain/user';
import type { Bucket } from '../../@core/domain/bucket';
import { buildReportHtml, buildReportContext, type ReportContext } from '../report/planReport';

function renderHtml(p: UserProfile, buckets: Bucket[]): string {
  const rows = buckets
    .map(
      (b) =>
        `<tr><td>${b.name}</td><td>¥${b.monthlyAmount.toLocaleString()}</td><td>${b.note ?? ''}</td></tr>`,
    )
    .join('');
  return `
  <div class="fb-print">
    <h1>FirstBucket 理财方案</h1>
    <p class="muted">导出时间：${new Date().toLocaleString()}</p>
    <table>
      <tr><th>月总收入</th><td>¥${Math.round(totalMonthlyIncome(p)).toLocaleString()}</td></tr>
      <tr><th>现有储蓄</th><td>¥${p.currentSavings.toLocaleString()}</td></tr>
      <tr><th>月负债还款</th><td>¥${Math.round(totalMonthlyDebt(p)).toLocaleString()}</td></tr>
      <tr><th>风险偏好</th><td>${p.riskProfile}</td></tr>
    </table>
    <h2>分桶配置</h2>
    <table><thead><tr><th>分桶</th><th>月金额</th><th>说明</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="disclaimer">免责声明：本工具为教育用途，不构成投资建议。</p>
  </div>`;
}

// 通过隐藏打印区 + window.print() 导出 PDF（整合版 PRD §5）
export function exportProfilePdf(p: UserProfile, buckets: Bucket[]): void {
  const host = document.createElement('div');
  host.className = 'fb-print-host';
  host.innerHTML = `<style>
    .fb-print-host{position:fixed;left:-9999px;top:0;}
    .fb-print h1{font-family:var(--font-heading);color:#B8860B;}
    .fb-print table{width:100%;border-collapse:collapse;margin:12px 0;font-family:var(--font-body);}
    .fb-print th,.fb-print td{border:1px solid #ccc;padding:6px 10px;text-align:left;}
    .fb-print .muted{color:#888;font-size:12px;}
    .fb-print .disclaimer{margin-top:24px;font-size:12px;color:#666;}
    @media print{.fb-print-host{position:static;}}
  </style>${renderHtml(p, buckets)}`;
  document.body.appendChild(host);
  const cleanup = () => {
    document.body.removeChild(host);
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}

/* ════════════════════════════════════════════════════════════════
   v1.1 规划书 PDF 通道 —— 复用同一打印出口，新增图表转图能力
   ════════════════════════════════════════════════════════════════ */

/**
 * 图表转图（离屏 ECharts → dataURL）。所有报告图表统一走此通道（设计文档 §7.8）。
 */
export function renderChartToImage(option: EChartsOption): string {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = '600px';
  container.style.height = '360px';
  document.body.appendChild(container);
  const chart = echarts.init(container);
  chart.setOption(option);
  const url = chart.getDataURL({ pixelRatio: 2, backgroundColor: '#ffffff' });
  chart.dispose();
  document.body.removeChild(container);
  return url;
}

/** 将 HTML 注入隐藏区并触发打印（与 exportProfilePdf 同机制） */
function printHtmlDocument(html: string): void {
  const host = document.createElement('div');
  host.className = 'fb-print-host';
  host.innerHTML = `<style>@media print{.fb-print-host{position:static;}}</style>${html}`;
  document.body.appendChild(host);
  const cleanup = () => {
    document.body.removeChild(host);
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}

/**
 * 一键生成规划书 PDF。
 * @param ctx 由 planReport.buildReportContext 聚合的上下文
 */
export function renderReportPdf(ctx: ReportContext): void {
  const html = buildReportHtml(ctx, renderChartToImage);
  printHtmlDocument(html);
}
