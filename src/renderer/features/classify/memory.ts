// 分类偏好记忆（C7 / T07）。
// 与现有 fb_* 模式一致：存本机 localStorage（key = fb_classify_memory），
// 记录「关键词 → 用户修正后的类别」，下次含该关键词的支出自动采用。
import type { ExpenseCategory } from '../../@core/domain/user';
import { KEYWORD_MAP } from './keywordMap';

const MEM_KEY = 'fb_classify_memory';
type Memory = Record<string, ExpenseCategory>;

function loadMem(): Memory {
  try {
    const raw = localStorage.getItem(MEM_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? (obj as Memory) : {};
  } catch {
    return {};
  }
}

function saveMem(mem: Memory): void {
  try {
    localStorage.setItem(MEM_KEY, JSON.stringify(mem));
  } catch {
    /* 忽略写入失败（如隐私模式） */
  }
}

/** 读取某文本对应的记忆分类（按命中关键词匹配） */
export function loadOverride(text: string): ExpenseCategory | undefined {
  const mem = loadMem();
  for (const kw of Object.keys(KEYWORD_MAP)) {
    if (text.includes(kw) && mem[kw]) return mem[kw];
  }
  return undefined;
}

/** 记住「关键词 → 类别」覆盖（用户拖拽修正后调用） */
export function rememberOverride(keyword: string, category: ExpenseCategory): void {
  const mem = loadMem();
  mem[keyword] = category;
  saveMem(mem);
}
