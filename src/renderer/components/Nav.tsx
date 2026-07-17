import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';

/* ── Pear SVG (inline, brand icon) ── */
const PearIcon = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 6C32 6 28 2 26 4C24 6 27 10 27 10C18 12 10 22 10 36C10 50 20 58 32 58C44 58 54 50 54 36C54 22 46 12 37 10C37 10 40 6 38 4C36 2 32 6 32 6Z"
          fill="#D4A857" stroke="#B8923F" strokeWidth="1.5"/>
    <path d="M30 4C30 4 31 1 32 1C33 1 34 4 34 4" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="25" cy="35" rx="1.8" ry="2.5" fill="#000" opacity="0.07" transform="rotate(-15 25 35)"/>
    <ellipse cx="38" cy="42" rx="1.3" ry="1.8" fill="#000" opacity="0.05" transform="rotate(10 38 42)"/>
    <ellipse cx="29" cy="48" rx="1"   ry="1.4" fill="#000" opacity="0.06" transform="rotate(-5 29 48)"/>
  </svg>
);

/* ── Navigation icons (flat line style) ── */
const IconDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
    <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
  </svg>
);
const IconBalance = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="20" x2="20" y2="4"/><circle cx="9" cy="9" r="3"/><circle cx="15" cy="15" r="3"/>
  </svg>
);
const IconChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconRules = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
);
const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);
const IconHelp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="1" fill="currentColor"/>
  </svg>
);
const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconMoon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);
const IconSun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const navItems = [
  { path: '/', label: 'Dashboard', icon: IconDashboard },
  { path: '/plan', label: '方案生成', icon: IconBalance },
  { path: '/rules', label: '理财法则', icon: IconRules },
  { path: '/visualizer', label: '复利可视', icon: IconChart },
];

const RISK_LABEL: Record<string, string> = {
  conservative: '保守型',
  balanced: '稳健型',
  aggressive: '积极型',
};

export function Nav() {
  const location = useLocation();
  const { theme, setTheme, profile } = useAppStore();
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    if (exportOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [exportOpen]);

  const cycleTheme = () => {
    const modes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const idx = modes.indexOf(theme);
    setTheme(modes[(idx + 1) % modes.length]);
  };

  const isActive = (path: string) =>
    location.pathname === path || (path === '/' && (location.pathname === '/' || location.pathname === ''));

  const initials = (profile?.name || '理财者').charAt(0).toUpperCase();

  return (
    <nav className="nav">
      {/* ── Brand ── */}
      <div className="nav-brand">
        <div className="nav-brand-icon"><PearIcon /></div>
        <span className="nav-brand-text">FirstBucket</span>
      </div>

      {/* ── User Card ── */}
      <div className="nav-user">
        <div className="nav-avatar">{initials}</div>
        <div className="nav-user-info">
          <span className="nav-user-name">{profile?.name || '理财者'}</span>
          <span className="nav-user-role">{RISK_LABEL[profile?.riskProfile || ''] || '稳健型'}</span>
        </div>
      </div>

      {/* ── Navigation Items ── */}
      <div className="nav-section">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item${isActive(item.path) ? ' active' : ''}`}
          >
            <item.icon />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      {/* ── Bottom Tools ── */}
      <div className="nav-bottom">
        <button className="nav-tool-btn" onClick={cycleTheme} title={`当前：${theme}（点击切换）`}>
          {theme === 'dark' ? <><IconMoon /><span>暗色模式</span></> :
           theme === 'light' ? <><IconSun /><span>亮色模式</span></> :
           <><IconSun /><span>跟随系统</span></>}
        </button>

        <div style={{ position: 'relative' }} ref={exportRef}>
          <button className="nav-tool-btn" onClick={() => setExportOpen(!exportOpen)}>
            <IconDownload />
            <span>导出数据</span>
          </button>
          {exportOpen && (
            <div className="nav-export-menu">
              <button className="nav-export-option" onClick={() => { setExportOpen(false); useAppStore.getState().exportData('csv'); }}>
                导出 CSV
              </button>
              <button className="nav-export-option" onClick={() => { setExportOpen(false); useAppStore.getState().exportData('pdf'); }}>
                导出 PDF
              </button>
            </div>
          )}
        </div>

        <div className="nav-divider" />

        <Link to="/settings" className="nav-item">
          <IconSettings /> <span>设置</span>
        </Link>

        <button className="nav-tool-btn">
          <IconHelp /> <span>帮助中心</span>
        </button>

        <div className="nav-divider" />

        <button className="nav-tool-btn" style={{ color: 'var(--color-danger)' }} onClick={() => useAppStore.getState().setOnboarded(false)}>
          <IconLogout /> <span>重新引导</span>
        </button>
      </div>
    </nav>
  );
}
