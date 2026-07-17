// 自定义法则持久化（R8 / T09，设计文档 §3.2）。
// 沿用 fb_* localStorage 模式，独立键 fb_custom_rules，不新增 store 持久化层。
// 与 Rule 类型兼容：allocations 同结构；scope 仅 income/invest；lifeStages 默认 []（不参与阶段筛选，O5）。
import type { Rule, Allocation } from '../../@core/domain/rule';
import type { PresetId } from '../preset/presets';

const LS_CUSTOM = 'fb_custom_rules';

export interface CustomRuleInput {
  name: string;
  scope: 'income' | 'invest';
  allocations: { label: string; pct: number; bucketKey: string; color: string }[];
}

function readAll(): Rule[] {
  try {
    const raw = localStorage.getItem(LS_CUSTOM);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as Rule[]) : [];
  } catch {
    return [];
  }
}

function writeAll(rules: Rule[]): void {
  localStorage.setItem(LS_CUSTOM, JSON.stringify(rules));
}

/** 读取全部自定义法则（空返回 []），供 RulesPage 合并渲染与 getRule 解析 */
export function loadCustomRules(): Rule[] {
  return readAll();
}

/** 新增自定义法则：生成 id、补 custom 标记 / 常量 applicability / 空 lifeStages */
export function saveCustomRule(input: CustomRuleInput): Rule {
  const rule: Rule = {
    id: `custom-${Date.now()}`,
    name: input.name.trim() || '自定义法则',
    description: `自定义法则（${input.scope === 'income' ? '收入级' : '投资级'}）`,
    tags: ['自定义'],
    scope: input.scope,
    allocations: input.allocations as Allocation[],
    applicability: () => 60, // O5：归「适合」档，非推荐
    lifeStages: [] as PresetId[], // O5：不参与阶段筛选
    custom: true,
  };
  const all = readAll();
  all.push(rule);
  writeAll(all);
  return rule;
}

/** 编辑已存在自定义法则（按 id 定位） */
export function updateCustomRule(id: string, input: CustomRuleInput): Rule {
  const all = readAll();
  const idx = all.findIndex((r) => r.id === id);
  const updated: Rule = {
    id,
    name: input.name.trim() || '自定义法则',
    description: `自定义法则（${input.scope === 'income' ? '收入级' : '投资级'}）`,
    tags: ['自定义'],
    scope: input.scope,
    allocations: input.allocations as Allocation[],
    applicability: () => 60,
    lifeStages: [] as PresetId[],
    custom: true,
  };
  if (idx >= 0) all[idx] = updated;
  else all.push(updated);
  writeAll(all);
  return updated;
}

/** 删除自定义法则（仅移除本机记录，不影响内置 12 法则） */
export function deleteCustomRule(id: string): void {
  writeAll(readAll().filter((r) => r.id !== id));
}
