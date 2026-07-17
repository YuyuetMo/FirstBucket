// 核心理财原则（R1 / T01，设计文档 O1 ②）。
// 从 RulesPage 硬编码数组提升为结构化数据，每条加 lifeStages，与 12 法则走同一条三档排序逻辑。
// lifeStages 映射（PRD §2 R1 拟议表，待设计师终审）：
//   先支付自己 = 全阶段；50/30/20 = 同法则表；建立紧急备用金 = 全阶段；
//   SMART 目标法 = single；避免高利负债 = 全阶段。
import type { PresetId } from '../preset/presets';

const IconPiggy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-.5-6.5-.5-10 0-.2-.6-1.5-2-3-2a4 4 0 00-2 3c0 .8.4 1.7 1 2.4C1 13 .5 15.5 2 18h20c1.5-2.5 1-5-.9-7.6A4 4 0 0022 8a4 4 0 00-3-3z" />
    <circle cx="8" cy="12" r="1" /><circle cx="16" cy="12" r="1" /><line x1="11" y1="16" x2="13" y2="16" />
  </svg>
);
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconTarget = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);
const IconPercent = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="5" x2="5" y2="19" /><circle cx="17" cy="7" r="2" /><circle cx="7" cy="17" r="2" />
  </svg>
);
const IconWallet = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

export type PrincipleTagType = 'primary' | 'success' | 'gold' | 'danger';

export interface PrincipleDef {
  id: string;
  title: string;
  desc: string;
  icon: () => JSX.Element;
  color: string;
  bg: string;
  tag: string;
  tagType: PrincipleTagType;
  termId?: string;
  /** R1(R1/T01)：适配阶段，与法则同一条三档排序路径 */
  lifeStages: PresetId[];
}

export const PRINCIPLES: PrincipleDef[] = [
  {
    id: 'pay-yourself-first',
    title: '先支付自己',
    desc: '每月收入到账后，第一时间将储蓄目标（建议收入的 20%）转入投资账户，剩余部分再安排支出。养成「收入 - 储蓄 = 支出」的习惯。',
    icon: IconPiggy,
    color: 'var(--color-primary)',
    bg: 'var(--color-primary-soft)',
    tag: '核心法则',
    tagType: 'primary',
    lifeStages: ['student', 'newgrad', 'single', 'dualincome', 'family', 'preretire'],
  },
  {
    id: '50-30-20',
    title: '50/30/20 法则',
    desc: '将可支配收入分为三部分：50% 用于必要支出（房租/水电/餐饮），30% 用于个人消费（娱乐/购物），20% 用于储蓄与投资。灵活调整比例以适配你的生活阶段。',
    icon: IconPercent,
    color: 'var(--accent-green)',
    bg: 'rgba(16,185,129,0.10)',
    tag: '推荐',
    tagType: 'success',
    termId: '50-30-20',
    lifeStages: ['student', 'newgrad', 'single', 'dualincome', 'family'],
  },
  {
    id: 'emergency-fund',
    title: '建立紧急备用金',
    desc: '储备 3-6 个月生活费用的紧急备用金，存放在高流动性账户中。这是你财务安全的第一道防线，防止意外事件导致债务危机。',
    icon: IconShield,
    color: 'var(--accent-blue)',
    bg: 'rgba(91,141,239,0.10)',
    tag: '重要',
    tagType: 'primary',
    lifeStages: ['student', 'newgrad', 'single', 'dualincome', 'family', 'preretire'],
  },
  {
    id: 'smart-goal',
    title: 'SMART 目标法',
    desc: '每个财务目标都应该是：具体的(S)、可衡量的(M)、可达成的(A)、相关的(R)、有时限的(T)。模糊的目标永远只是愿望，明确的目标才是计划。',
    icon: IconTarget,
    color: 'var(--accent-gold)',
    bg: 'var(--color-gold-soft)',
    tag: '方法',
    tagType: 'gold',
    lifeStages: ['single'],
  },
  {
    id: 'avoid-high-interest-debt',
    title: '避免高利负债',
    desc: '信用卡分期、消费贷、网贷等高息工具的年化利率通常超过 18%。优先还清高利率债务，再考虑投资回报——因为减少利息支出等于无风险收益。',
    icon: IconWallet,
    color: 'var(--accent-red)',
    bg: 'rgba(239,68,68,0.08)',
    tag: '警示',
    tagType: 'danger',
    lifeStages: ['student', 'newgrad', 'single', 'dualincome', 'family', 'preretire'],
  },
];
