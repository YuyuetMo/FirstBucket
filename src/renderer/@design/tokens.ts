// 设计令牌 — FirstBucket v2.1 UI System
// Clean Flat SaaS Dashboard (Nexus-inspired) × Light/Dark × 梨子品牌辅助
// 所有 UI 必须通过本模块引用，禁止内联硬编码色值/间距。

export const colors = {
  // ── 主色调：蓝色系（Nexus 风格）──
  primary: '#5B8DEF',          // 主色蓝（按钮、链接、active 高亮）
  primaryHover: '#4A7DE6',
  primaryActive: '#3D6CD4',
  primarySoft: 'rgba(91,141,239,0.10)',
  primaryBg: 'rgba(91,141,239,0.08)',
  primaryBorder: 'rgba(91,141,239,0.25)',

  // ── 品牌金（降级为辅助色，仅用于特殊标记/装饰）──
  gold: '#D4A857',
  goldSoft: 'rgba(212,168,87,0.12)',

  // ── 浅色主题文字 ──
  textPrimary: '#1F2733',       // 标题、大数字 — 近黑
  textSecondary: '#5A6678',     // 正文、说明
  textMuted: '#95A0B0',        // 占位符、次要信息

  // ── 暗色主题文字 ──
  textDarkPrimary: '#E8ECF2',
  textDarkSecondary: '#9AA7BD',
  textDarkMuted: '#6B7890',

  // ── 边框 ──
  borderLight: 'rgba(31,39,51,0.08)',
  borderLightHover: 'rgba(31,39,51,0.15)',
  borderDark: 'rgba(255,255,255,0.08)',
  borderDarkHover: 'rgba(255,255,255,0.15)',

  // ── 背景（纯色，无透明）──
  bgLightPage: '#F0F2F5',      // 页面底色（浅灰蓝）
  bgLightCard: '#FFFFFF',      // 卡片/面板底色（纯白）
  bgLightInput: '#FFFFFF',     // 输入框
  bgLightHover: '#F5F7FA',     // hover 状态

  bgDarkPage: '#0F1419',       // 页面底色（深墨）
  bgDarkCard: '#1A202C',       // 卡片/面板
  bgDarkInput: '#1A202C',      // 输入框
  bgDarkHover: '#242D3A',      // hover 状态

  // ── 语义色 ──
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.08)',
  success: '#10B981',
  successSoft: 'rgba(16,185,129,0.08)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.08)',
  info: '#5B8DEF',
  infoSoft: 'rgba(91,141,239,0.08)',

  // ── 指标卡左侧色条（保留彩色区分）──
  accentBlue: '#5B8DEF',
  accentGreen: '#10B981',
  accentRed: '#EF4444',
  accentGold: '#D4A857',
  accentPurple: '#8B5CF6',
  accentOrange: '#F97316',

  // ── 分桶调色板 ──
  palette: ['#5B8DEF', '#10B981', '#F97316', '#8B5CF6', '#EC4899', '#D4A857'],
} as const;

export const fonts = {
  heading: "'Inter', -apple-system, system-ui, 'Segoe UI', sans-serif",
  mono: "'DM Mono', 'SFMono-Regular', Consolas, monospace",
  body: "'Inter', -apple-system, system-ui, 'Segoe UI', sans-serif",
} as const;

export const radius = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '20px',
  full: '9999px',
} as const;

// 4px base spacing (Nexus-style tighter rhythm)
export const space = (n: number) => `${n * 4}px`;

// ── 扁平化阴影系统（紧贴式，无扩散发光）──
export const shadow = {
  xs: '0 1px 2px rgba(31,39,51,0.04)',
  sm: '0 1px 3px rgba(31,39,51,0.06)',
  md: '0 2px 8px rgba(31,39,51,0.08)',
  lg: '0 4px 16px rgba(31,39,51,0.10)',
  card: '0 1px 3px rgba(31,39,51,0.06), 0 1px 2px rgba(31,39,51,0.04)',
  cardHover: '0 4px 12px rgba(31,39,51,0.10), 0 1px 3px rgba(31,39,51,0.06)',
  dropdown: '0 4px 16px rgba(31,39,51,0.12)',
  modal: '0 16px 48px rgba(31,39,51,0.16)',
} as const;

type ThemeVars = Record<string, string>;

const lightVars: ThemeVars = {
  '--color-primary': colors.primary,
  '--color-primary-hover': colors.primaryHover,
  '--color-primary-active': colors.primaryActive,
  '--color-primary-soft': colors.primarySoft,
  '--color-primary-bg': colors.primaryBg,
  '--color-primary-border': colors.primaryBorder,

  '--color-gold': colors.gold,
  '--color-gold-soft': colors.goldSoft,

  '--color-bg-page': colors.bgLightPage,
  '--color-bg-card': colors.bgLightCard,
  '--color-bg-input': colors.bgLightInput,
  '--color-bg-hover': colors.bgLightHover,
  '--color-bg-elevated': colors.bgLightCard,

  '--color-text': colors.textPrimary,
  '--color-text-secondary': colors.textSecondary,
  '--color-text-muted': colors.textMuted,

  '--color-border': colors.borderLight,
  '--color-border-hover': colors.borderLightHover,

  '--color-danger': colors.danger,
  '--color-success': colors.success,
  '--color-warning': colors.warning,
  '--color-info': colors.info,

  '--accent-blue': colors.accentBlue,
  '--accent-green': colors.accentGreen,
  '--accent-red': colors.accentRed,
  '--accent-gold': colors.accentGold,
  '--accent-purple': colors.accentPurple,
  '--accent-orange': colors.accentOrange,

  '--font-heading': fonts.heading,
  '--font-mono': fonts.mono,
  '--font-body': fonts.body,

  '--radius-sm': radius.sm,
  '--radius-md': radius.md,
  '--radius-lg': radius.lg,
  '--radius-xl': radius.xl,

  '--shadow-xs': shadow.xs,
  '--shadow-sm': shadow.sm,
  '--shadow-md': shadow.md,
  '--shadow-lg': shadow.lg,
  '--shadow-card': shadow.card,
  '--shadow-card-hover': shadow.cardHover,
  '--shadow-dropdown': shadow.dropdown,
  '--shadow-modal': shadow.modal,

  '--sidebar-width': '250px',
  '--transition-fast': '150ms ease',
  '--transition-normal': '250ms ease',
};

const darkVars: ThemeVars = {
  '--color-primary': colors.primary,
  '--color-primary-hover': colors.primaryHover,
  '--color-primary-active': colors.primaryActive,
  '--color-primary-soft': colors.primarySoft,
  '--color-primary-bg': colors.primaryBg,
  '--color-primary-border': colors.primaryBorder,

  '--color-gold': colors.gold,
  '--color-gold-soft': colors.goldSoft,

  '--color-bg-page': colors.bgDarkPage,
  '--color-bg-card': colors.bgDarkCard,
  '--color-bg-input': colors.bgDarkInput,
  '--color-bg-hover': colors.bgDarkHover,
  '--color-bg-elevated': colors.bgDarkCard,

  '--color-text': colors.textDarkPrimary,
  '--color-text-secondary': colors.textDarkSecondary,
  '--color-text-muted': colors.textDarkMuted,

  '--color-border': colors.borderDark,
  '--color-border-hover': colors.borderDarkHover,

  '--color-danger': colors.danger,
  '--color-success': colors.success,
  '--color-warning': colors.warning,
  '--color-info': colors.info,

  '--accent-blue': colors.accentBlue,
  '--accent-green': colors.accentGreen,
  '--accent-red': colors.accentRed,
  '--accent-gold': colors.accentGold,
  '--accent-purple': colors.accentPurple,
  '--accent-orange': colors.accentOrange,

  '--font-heading': fonts.heading,
  '--font-mono': fonts.mono,
  '--font-body': fonts.body,

  '--radius-sm': radius.sm,
  '--radius-md': radius.md,
  '--radius-lg': radius.lg,
  '--radius-xl': radius.xl,

  '--shadow-xs': '0 1px 2px rgba(0,0,0,0.08)',
  '--shadow-sm': '0 1px 3px rgba(0,0,0,0.12)',
  '--shadow-md': '0 2px 8px rgba(0,0,0,0.16)',
  '--shadow-lg': '0 4px 16px rgba(0,0,0,0.20)',
  '--shadow-card': '0 1px 3px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.10)',
  '--shadow-card-hover': '0 4px 12px rgba(0,0,0,0.28), 0 1px 3px rgba(0,0,0,0.14)',
  '--shadow-dropdown': '0 4px 16px rgba(0,0,0,0.24)',
  '--shadow-modal': '0 16px 48px rgba(0,0,0,0.32)',

  '--sidebar-width': '250px',
  '--transition-fast': '150ms ease',
  '--transition-normal': '250ms ease',
};

export type ThemeMode = 'light' | 'dark' | 'system';

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return mode;
}

export function applyTheme(mode: ThemeMode): void {
  const t = resolveTheme(mode);
  const vars = t === 'dark' ? darkVars : lightVars;
  const root = document.documentElement;
  root.setAttribute('data-theme', t);
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}
