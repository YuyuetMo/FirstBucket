// 实验模块 FlowEditor 的领域模型（决议 D3：feature flag 隐藏）
export type FlowNodeType = 'income' | 'allocation' | 'expense' | 'summary';

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  amount?: number;
}

export interface FlowEdge {
  from: string;
  to: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}
