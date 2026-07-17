import type { UserProfile } from '../../@core/domain/user';
import { totalMonthlyIncome, totalMonthlyDebt } from '../../@core/domain/user';
import type { Bucket } from '../../@core/domain/bucket';

function escapeCsv(v: string | number): string {
  const s = String(v);
  // 防注入/破坏：含逗号、引号、换行则包裹并转义引号
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function buildProfileCsv(p: UserProfile, buckets: Bucket[]): string {
  const rows: (string | number)[][] = [];
  rows.push(['FirstBucket 导出', new Date().toISOString()]);
  rows.push([]);
  rows.push(['档案字段', '值']);
  rows.push(['月收入', p.monthlyIncome]);
  rows.push(['年终奖(年)', p.incomeAnnualBonus]);
  rows.push(['其他收入(月)', p.incomeOther]);
  rows.push(['月总收入', Math.round(totalMonthlyIncome(p))]);
  rows.push(['现有储蓄', p.currentSavings]);
  rows.push(['月负债还款', Math.round(totalMonthlyDebt(p))]);
  rows.push(['固定支出', p.fixedExpenses]);
  rows.push(['变动支出', p.variableExpenses]);
  rows.push(['风险偏好', p.riskProfile]);
  rows.push(['投资期限(月)', p.investHorizonMonths]);
  rows.push(['目标数', p.goals.length]);
  rows.push(['保险', `${p.insurance.hasBasic ? '基础 ' : ''}${p.insurance.hasCriticalIllness ? '重疾 ' : ''}${p.insurance.hasAccident ? '意外' : ''}`]);
  rows.push([]);
  rows.push(['分桶', '月金额', '说明']);
  for (const b of buckets) rows.push([b.name, b.monthlyAmount, b.note ?? '']);
  rows.push([]);
  rows.push(['免责声明', '本工具为教育用途，不构成投资建议']);
  return '﻿' + rows.map((r) => r.map(escapeCsv).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
