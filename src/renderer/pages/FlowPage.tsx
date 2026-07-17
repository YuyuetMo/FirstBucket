import { useState } from 'react';
import type { FlowGraph } from '../@core/domain/flow';
import { runFlow } from '../features/flow/flowEngine';

const SAMPLE: FlowGraph = {
  nodes: [
    { id: 'inc', type: 'income', label: '月收入', amount: 8000 },
    { id: 'alloc', type: 'allocation', label: '分配' },
    { id: 'exp', type: 'expense', label: '生活支出' },
    { id: 'sum', type: 'summary', label: '结余' },
  ],
  edges: [
    { from: 'inc', to: 'alloc' },
    { from: 'alloc', to: 'exp' },
    { from: 'alloc', to: 'sum' },
  ],
};

export function FlowPage() {
  const [text, setText] = useState(JSON.stringify(SAMPLE, null, 2));
  const [result, setResult] = useState<string>('');

  const run = () => {
    try {
      const g = JSON.parse(text) as FlowGraph;
      const r = runFlow(g);
      setResult(r.ok ? '执行顺序:\n' + r.order.map((n) => `${n.type}: ${n.label}`).join('\n') : `错误: ${r.error}`);
    } catch (e) {
      setResult('JSON 解析失败: ' + (e as Error).message);
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
          流编辑器 <span className="badge badge-gold" style={{ fontSize: '11px', marginLeft: '8px' }}>实验</span>
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
          X1 · 节点式资金流编排（feature flag 隐藏，不在主导航）
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
        <div className="card">
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '14px' }}>
            FlowGraph (JSON)
          </h3>
          <textarea
            style={{
              width: '100%', height: '300px',
              background: 'var(--color-bg-page)', color: 'var(--color-text)',
              fontFamily: 'var(--font-mono)', fontSize: '12.5px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', padding: '12px',
              resize: 'vertical',
            }}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={run}>
            运行拓扑排序
          </button>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '14px' }}>
            结果
          </h3>
          <pre style={{
            whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-secondary)', fontSize: '13px',
            lineHeight: 1.6, background: 'var(--color-bg-page)',
            padding: '14px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}>{result}</pre>
        </div>
      </div>
    </div>
  );
}
