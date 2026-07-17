// 实验模块 FlowEditor 执行引擎（决议 D3）
// 纯函数：Kahn 拓扑排序 + 循环检测
import type { FlowGraph, FlowNode } from '../../@core/domain/flow';

export type FlowResult =
  | { ok: true; order: FlowNode[] }
  | { ok: false; error: 'cycle detected' };

export function runFlow(graph: FlowGraph): FlowResult {
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of graph.nodes) {
    indeg.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of graph.edges) {
    if (!indeg.has(e.from) || !indeg.has(e.to)) continue;
    adj.get(e.from)!.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }
  const queue: string[] = [];
  indeg.forEach((d, id) => {
    if (d === 0) queue.push(id);
  });
  const orderIds: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    orderIds.push(id);
    for (const nxt of adj.get(id) ?? []) {
      indeg.set(nxt, (indeg.get(nxt) ?? 0) - 1);
      if (indeg.get(nxt) === 0) queue.push(nxt);
    }
  }
  if (orderIds.length !== graph.nodes.length) {
    return { ok: false, error: 'cycle detected' };
  }
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  return { ok: true, order: orderIds.map((id) => byId.get(id)!) };
}
