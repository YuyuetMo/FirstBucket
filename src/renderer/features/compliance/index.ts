// 合规引擎（整合版 PRD §8）—— 所有用户可见文本渲染前必须过检

const SENSITIVE_WORDS = ['必买', '稳赚', ' guaranteed', '保证收益', '内部消息', '牛股', '代码', '明天必涨', '包赚'];

const IMPERATIVE_WORDS = ['必须', '一定', '肯定', '绝对', ' guaranteed', '抓紧'];

export function checkSensitiveWords(text: string): string[] {
  return SENSITIVE_WORDS.filter((w) => text.includes(w));
}

export function checkImperativeLanguage(text: string): string[] {
  return IMPERATIVE_WORDS.filter((w) => text.includes(w));
}

export interface ComplianceResult {
  ok: boolean;
  issues: string[];
}

export function checkAllTexts(texts: string[]): ComplianceResult {
  const issues: string[] = [];
  for (const t of texts) {
    const s = checkSensitiveWords(t);
    const i = checkImperativeLanguage(t);
    if (s.length) issues.push(`敏感词: ${s.join('、')}`);
    if (i.length) issues.push(`指令性措辞: ${i.join('、')}`);
  }
  return { ok: issues.length === 0, issues };
}

// ETF / 基金处必须含「非投资建议」提示
export const ETF_DISCLAIMER = '非投资建议';
export function requiresEtfTooltip(text: string): boolean {
  return /ETF|基金|指数/.test(text);
}
