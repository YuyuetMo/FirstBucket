// 权威用户档案模型 —— 全项目唯一事实源（整合版 PRD §4.1）
// 禁止在任何地方另行声明历史漂移字段（incomeMonthly/riskAppetite/expenseFixed/debtPayment/savings 等）。

import type { PresetId } from '../../features/preset/presets';

export type RiskProfile = 'conservative' | 'balanced' | 'aggressive';

export interface Debt {
  id: string;
  label: string;
  monthlyPayment: number;
  remaining: number;
  interestRate: number;
}

export interface Goal {
  id: string;
  label: string;
  targetAmount: number;
  targetYear: number;
}

export interface InsuranceStatus {
  hasBasic: boolean;
  hasCriticalIllness: boolean;
  hasAccident: boolean;
  note?: string;
}

/** 支出类别（智能分类系统 C7） */
export type ExpenseCategory =
  | 'medical-emergency'
  | 'entertainment'
  | 'social'
  | 'home-repair'
  | 'other';

/** 单笔支出明细（固定 / 弹性通用，C6/C7） */
export interface ExpenseItem {
  id: string;
  label: string; // 用户输入文本，如 "生病 800"
  amount: number; // 金额
  frequency: 'once' | 'monthly' | 'annual'; // 一次性/月度/年度
  systemCategory: ExpenseCategory; // 关键词预填
  userCategory?: ExpenseCategory; // 用户拖拽修正
  remembered?: boolean; // 是否来自偏好记忆
}

export interface UserProfile {
  id: string;
  name?: string;
  age?: number;
  monthlyIncome: number;
  incomeAnnualBonus: number;
  incomeOther: number;
  currentSavings: number;
  debts: Debt[];
  fixedExpenses: number;
  variableExpenses: number;
  goals: Goal[];
  riskProfile: RiskProfile;
  insurance: InsuranceStatus;
  investHorizonMonths: number;
  createdAt: string;
  updatedAt: string;
  // —— v1.1 增量（可选，向后兼容，随整 JSON 落盘）——
  /** 人群预设（轻量枚举）；仅经 recommendWithPreset 影响推荐排序，计算引擎忽略该字段 */
  preset?: PresetId | null;
  /** 已忽略的预警 id 列表（会话态；建议仅内存/localStorage，不强制写入 SQLite） */
  dismissedWarnings?: string[];

  // —— v1.2 五步画像增量（可选，JSON 向后兼容）——
  /** 税前月薪（Step1 录入） */
  grossMonthlyIncome?: number;
  /** 社保公积金扣除（Step1 录入） */
  socialInsuranceDeduction?: number;
  /** 其他扣除（Step1 录入） */
  otherDeductions?: number;
  /** 其他收入（Step1 录入，与 incomeOther 并存；incomeOther 为旧字段） */
  otherIncome?: number;
  /** 固定支出明细数组（Step2 录入） */
  fixedExpenseItems?: ExpenseItem[];
  /** 弹性支出明细数组（Step3 录入，含分类/频率） */
  variableExpenseItems?: ExpenseItem[];
}

export function totalMonthlyDebt(p: Pick<UserProfile, 'debts'>): number {
  return p.debts.reduce((s, d) => s + (d.monthlyPayment || 0), 0);
}

export function totalMonthlyIncome(
  p: Pick<UserProfile, 'monthlyIncome' | 'incomeAnnualBonus' | 'incomeOther'>,
): number {
  return p.monthlyIncome + p.incomeAnnualBonus / 12 + p.incomeOther;
}

export function monthlyDisposable(p: UserProfile): number {
  return totalMonthlyIncome(p) - p.fixedExpenses - p.variableExpenses - totalMonthlyDebt(p);
}

/**
 * 投资池：投资级法则（如 100−年龄）单视图下的分配基数（设计文档 §3.6 O1 默认）。
 * 单 invest 法则视图假设用户将全部可支配余额投入，保证与组合视图在数学上连续。
 * 纯函数，不读全局态、不改 profile。
 */
export function investmentPool(p: UserProfile): number {
  return monthlyDisposable(p);
}

export function createEmptyProfile(id: string): UserProfile {
  const now = new Date().toISOString();
  return {
    id,
    age: 0,
    monthlyIncome: 0,
    incomeAnnualBonus: 0,
    incomeOther: 0,
    currentSavings: 0,
    debts: [],
    fixedExpenses: 0,
    variableExpenses: 0,
    goals: [],
    riskProfile: 'balanced',
    insurance: { hasBasic: false, hasCriticalIllness: false, hasAccident: false },
    investHorizonMonths: 120,
    createdAt: now,
    updatedAt: now,
    fixedExpenseItems: [],
    variableExpenseItems: [],
  };
}
