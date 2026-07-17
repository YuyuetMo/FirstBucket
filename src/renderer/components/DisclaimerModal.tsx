import React, { useEffect, useRef } from 'react';

/* ── Pear Logo for disclaimer ── */
const SmallPear = () => (
  <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 6C32 6 28 2 26 4C24 6 27 10 27 10C18 12 10 22 10 36C10 50 20 58 32 58C44 58 54 50 54 36C54 22 46 12 37 10C37 10 40 6 38 4C36 2 32 6 32 6Z"
          fill="#D4A857" stroke="#B8923F" strokeWidth="1.5"/>
    <path d="M30 4C30 4 31 1 32 1C33 1 34 4 34 4" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

interface Props {
  onAck: () => void;
}

export function DisclaimerModal({ onAck }: Props) {
  const [count, setCount] = React.useState(3);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          setTimeout(onAck, 300); // small delay so user sees "0"
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [onAck]);

  return (
    <div className="modal-mask">
      <div className="modal" style={{ maxWidth: '440px', padding: '0' }}>
        {/* Header */}
        <div className="modal-header" style={{ flexDirection: 'column', alignItems: 'center', padding: '28px 26px 18px', borderBottom: 'none' }}>
          <div style={{ marginBottom: '12px' }}><SmallPear /></div>
          <h2 className="modal-title" style={{ textAlign: 'center' }}>免责声明</h2>
          <p style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            请仔细阅读以下内容
          </p>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ paddingTop: '4px' }}>
          <div style={{
            background: 'var(--color-bg-page)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            padding: '16px',
            fontSize: '13px',
            lineHeight: '1.75',
            color: 'var(--color-text-secondary)',
          }}>
            <p><strong style={{ color: 'var(--color-text)' }}>⚠️ 重要提示：</strong></p>
            <ul style={{ paddingLeft: '18px', marginTop: '8px', marginBottom: '12px' }}>
              <li>本应用为<strong>教育用途的理财规划工具</strong>，不构成任何投资建议。</li>
              <li>不推荐、不引导购买任何特定金融产品或个股。</li>
              <li>所有数据（包括模拟收益）仅供演示参考，不代表真实市场表现。</li>
              <li>投资有风险，决策需谨慎。如有需要请咨询持牌专业人士。</li>
              <li>您的财务数据<strong style={{ color: 'var(--accent-green)' }}>100% 存储在本机</strong>，我们无法访问。</li>
            </ul>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              继续使用即表示您已理解并同意以上声明。
            </p>
          </div>
        </div>

        {/* Footer with countdown */}
        <div style={{
          padding: '16px 26px 22px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span className="agreement-countdown">
            将在 <strong>{count}</strong> 秒后自动进入...
          </span>
          <button
            className="btn btn-primary"
            onClick={onAck}
            style={{ minWidth: '160px' }}
          >
            我已了解
          </button>
        </div>
      </div>
    </div>
  );
}
