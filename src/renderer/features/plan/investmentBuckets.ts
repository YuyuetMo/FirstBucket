// 投资/增值类 bucketKey 完整集合（设计文档 §3.2 O2）。
// 用于复利末值计算：凡落在「投资/增值类」集合的桶月额参与 compoundSeries；
// 明确排除 cash/safe/protect（保本/保命非增值）。

export const INVESTMENT_BUCKET_KEYS: ReadonlySet<string> = new Set([
  // 投资/增值类（计入复利）
  'invest',
  'save',
  'saving',
  'grow',
  'equity',
  'stock',
  'index',
  'core',
  'satellite',
  'bond',
  'ltbond',
  'mtbond',
  'commodity',
  'gold',     // 永久组合（Permanent Portfolio）黄金
  'tbill',
  'principal',
  'sprint',
]);

/** 判定某 bucketKey 是否属于投资/增值类 */
export function isInvestmentKey(k: string | undefined): boolean {
  return !!k && INVESTMENT_BUCKET_KEYS.has(k);
}
