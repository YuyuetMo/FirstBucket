import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useAppStore } from './stores/useAppStore';
import { applyTheme } from './@design/tokens';
import { isEnabled } from './@core/featureFlags';
import { Nav } from './components/Nav';
import { DisclaimerModal } from './components/DisclaimerModal';
import { Onboarding } from './components/Onboarding';
import { TitleBar } from './components/TitleBar';
import { ProfilePage } from './pages/ProfilePage';
import { RulesPage } from './pages/RulesPage';
import { PlanPage } from './pages/PlanPage';
import { VisualizerPage } from './pages/VisualizerPage';
import { SettingsPage } from './pages/SettingsPage';
import { FlowPage } from './pages/FlowPage';

/* ── Pear Logo SVG (for agreement screen) ── */
const PearLogo = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 6C32 6 28 2 26 4C24 6 27 10 27 10C18 12 10 22 10 36C10 50 20 58 32 58C44 58 54 50 54 36C54 22 46 12 37 10C37 10 40 6 38 4C36 2 32 6 32 6Z"
          fill="#D4A857" stroke="#B8923F" strokeWidth="1.5"/>
    <path d="M30 4C30 4 31 1 32 1C33 1 34 4 34 4" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="25" cy="35" rx="1.8" ry="2.5" fill="#000" opacity="0.07" transform="rotate(-15 25 35)"/>
    <ellipse cx="38" cy="42" rx="1.3" ry="1.8" fill="#000" opacity="0.05" transform="rotate(10 38 42)"/>
  </svg>
);

/* ── Fixed compliance footer (always visible) ── */
function ComplianceFooter() {
  return (
    <div className="compliance-footer">
      <span>📌 教育用途 · 不构成投资建议 · 数据 100% 存储于本机（不上传云端）</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Agreement Screen — First run welcome (flat style)
   ═══════════════════════════════════════════════════ */
function AgreementScreen({ onAgree }: { onAgree: () => void }) {
  const [privacy, setPrivacy] = useState(false);
  const [agreement, setAgreement] = useState(false);

  return (
    <div className="modal-mask">
      <div className="agreement-container">
        <div className="agreement-logo"><PearLogo /></div>
        <h2 className="agreement-title">欢迎使用 FirstBucket</h2>
        <p className="agreement-subtitle">开始前请阅读并同意以下条款</p>

        <div className="agreement-text">
          <p><strong>🔒 隐私政策</strong></p>
          <p>本应用不要求登录、不云同步，所有财务数据 100% 保存在您本机（SQLite 数据库）。我们不会上传任何个人数据。您对自己的数据拥有完全控制权。</p>

          <p style={{ marginTop: '14px' }}><strong>📋 用户协议</strong></p>
          <p>
            FirstBucket 为教育用途的理财规划工具，<strong style={{ color: 'var(--color-primary)' }}>不构成投资建议</strong>，
            不推荐任何个股。请独立判断，必要时咨询持牌专业人士。
            所有展示的数据均为模拟示例，不代表真实市场表现。
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer', fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
            <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px' }} />
            我已阅读并同意《隐私政策》
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer', fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
            <input type="checkbox" checked={agreement} onChange={(e) => setAgreement(e.target.checked)} style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px' }} />
            我已阅读并同意《用户协议》
          </label>
        </div>

        <button
          className="btn btn-primary"
          disabled={!(privacy && agreement)}
          onClick={onAgree}
          style={{ width: '100%', padding: '12px' }}
        >
          开始使用 →
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Root App Component
   ═══════════════════════════════════════════════════ */

export default function App() {
  const { agreed, disclaimerAck, onboarded, theme, loadProfile, loadBuckets, setAgreed, setDisclaimerAck, setOnboarded } =
    useAppStore();

  useEffect(() => {
    applyTheme(theme);
    loadProfile();
    loadBuckets();
  }, []);

  if (!agreed) return <AgreementScreen onAgree={() => setAgreed(true)} />;
  if (!disclaimerAck) return <DisclaimerModal onAck={() => setDisclaimerAck(true)} />;

  return (
    <HashRouter>
      <div className="app-shell">
        <TitleBar />
        <div className="app-body">
          <Nav />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<ProfilePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/plan" element={<PlanPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/visualizer" element={<VisualizerPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              {isEnabled('experimental.flowEditor') && <Route path="/flow" element={<FlowPage />} />}
              <Route path="*" element={<ProfilePage />} />
            </Routes>
          </main>
        </div>
        <ComplianceFooter />
        {!onboarded && <Onboarding onDone={() => setOnboarded(true)} />}
      </div>
    </HashRouter>
  );
}
