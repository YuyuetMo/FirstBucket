import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import type { RiskProfile } from '../@core/domain/user';

export function SettingsPage() {
  const { profile, theme, setTheme, updateProfile } = useAppStore();
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');

  // 用 profile 初始化（仅当本地 state 尚未被用户编辑）
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAge(profile.age ? String(profile.age) : '');
    }
  }, [profile]);

  const num = (s: string) => (s === '' ? 0 : Math.max(0, Number(s) || 0));

  const handleSave = async () => {
    await updateProfile({
      name: name.trim(),
      age: num(age),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: '26px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>设置</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>管理你的个人偏好</p>
      </div>

      {/* Profile Section */}
      <div className="settings-group">
        <div className="settings-group-header">个人信息</div>
        <div className="settings-group-body">
          <div className="settings-row">
            <div><div className="settings-label">昵称</div><div className="settings-desc">用于界面显示</div></div>
            <input className="form-input" style={{ width: '220px' }} value={name} onChange={(e) => setName(e.target.value)} placeholder="输入昵称" />
          </div>
          <div className="settings-row">
            <div><div className="settings-label">年龄</div><div className="settings-desc">用于方案与风险建议</div></div>
            <input className="form-input" style={{ width: '220px' }} type="number" min={0} max={120} value={age} onChange={(e) => setAge(e.target.value)} placeholder="可选" />
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="settings-group">
        <div className="settings-group-header">外观</div>
        <div className="settings-group-body">
          <div className="settings-row">
            <div><div className="settings-label">主题模式</div><div className="settings-desc">选择你喜欢的界面配色</div></div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['light', 'dark', 'system'] as const).map((m) => (
                <button key={m} className={`btn ${theme === m ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setTheme(m)}>
                  {m === 'light' ? '☀️ 亮色' : m === 'dark' ? '🌙 暗色' : '💻 跟随系统'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Data Section */}
      <div className="settings-group">
        <div className="settings-group-header">数据管理</div>
        <div className="settings-group-body">
          <div className="settings-row">
            <div><div className="settings-label">数据存储</div><div className="settings-desc">所有数据仅存储在本机 SQLite 数据库中</div></div>
            <span className="badge badge-success">本地安全</span>
          </div>
          <div className="settings-row">
            <div><div className="settings-label">导出全部数据</div><div className="settings-desc">备份你的财务记录为 CSV 或 PDF 文件</div></div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => useAppStore.getState().exportData('csv')}>CSV 格式</button>
              <button className="btn btn-secondary btn-sm" onClick={() => useAppStore.getState().exportData('pdf')}>PDF 格式</button>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="settings-group">
        <div className="settings-group-header">关于</div>
        <div className="settings-group-body">
          <div className="settings-row" style={{ borderBottom: 'none' }}>
            <div>
              <div className="settings-label">FirstBucket v2.1</div>
              <div className="settings-desc">面向年轻人的桌面端理财规划客户端 · 基于 Electron + React + SQLite</div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave}>保存修改</button>
      </div>

      {saved && (
        <div className="toast success" style={{ position: 'fixed' }}>✓ 已保存到本机</div>
      )}
    </div>
  );
}
