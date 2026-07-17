# FirstBucket v1.1 系统架构设计 + 任务分解

> **作者**：架构师 高见远
> **基线**：FirstBucket v2.0 已交付结构（已对照真实 `src` 树核对）
> **性质**：Electron 桌面端 / 本机 SQLite / 单用户 / 纯离线 / 无后端无账号 / 快照式数据模型
> **交付对象**：工程师 寇豆码

---

## 1. 实现方案与框架选型

### 1.1 技术栈确认
**完全沿用 v2.0，v1.1 不新增任何框架/构建工具/依赖包**（详见 §6）。
- 运行时：Electron 31（Windows 优先）、React 18、TypeScript 5、Vite
- 存储：better-sqlite3（主进程 SQLite，`profileRepo.upsert` 存整 JSON，无 schema 迁移）
- 桥接：IPC / contextBridge（`window.FirstBucket.*`）
- 状态：zustand（`stores/useAppStore.ts`）
- 图表：ECharts（经 `components/EChart.tsx` 封装，含 `getDataURL()` 转图能力供 PDF 复用）
- 路由：HashRouter（**v1.1 不新增路由节点**）
- 样式：Tailwind CSS + MUI（`@mui/material`）+ `@design/tokens.ts`

### 1.2 架构模式（已对齐真实分层）
```
@core/domain (类型: user/rule/bucket/flow)  → @core/persistence (profileRepo/bucketRepo, IPC)
        ↓                                            ↓
features/* (引擎/特性：纯函数+组件)  ←——————  pages/* (页面装配)  ← App/Onboarding
        ↑                                            ↑
stores/useAppStore.ts (zustand 状态中枢)
```
- 新增特性全部落在 `src/renderer/features/{estimator,warn,education,compare,simulate,review,preset,report,plan}`。
- 页面层（`pages/*`）只做「挂载新特性组件 + 接 store」，不写业务逻辑。
- **关键发现（已核实真实代码）**：v2.0 **已具备** 方案引擎与复利引擎，无需从页面提取：
  - `features/budget/engine.ts` 已导出 `applyRule(profile, rule): Bucket[]` 与 `compoundSeries(...)`；
  - `features/rules/recommend.ts` 已导出 `recommend(profile): RuleScore[]`（M2 推荐，P1-8 直接复用）；
  - `features/profile/health.ts` 已导出 `computeHealthScore / computeBadges / emergencyMultiple`。
  - 因此 v1.1 的「复用引擎」= 直接调用上述既有函数，仅新增 2 个轻量派生纯函数（见 §3.7）。

### 1.3 关键技术难点与对策
| 难点 | 对策 |
|------|------|
| What-if 实时重算且不污染已保存 plan | store 持有 `tempProfile: UserProfile \| null` 派生临时态；推演基于 `tempProfile ?? profile`；防抖 ≤200ms；「恢复真实档案」= `setTempProfile(null)`。**绝不调用 `updateProfile`/`saveProfile`**。 |
| 预警阈值可配置且集中 | 常量集中在 `features/warn/thresholds.ts`，`as const` 类型化，零运行时依赖。 |
| 规划书 PDF 含多页图表 | 复用 `features/export/pdf.ts` 既有 `exportProfilePdf` 转图通道，新增 `features/report/planReport.ts` 做聚合分页。 |
| 点评/预警/对比纯规则无副作用 | 全部为 `(ctx) => result` 纯函数。 |
| 人群预设仅影响推荐排序 | `preset` 仅写入 `profile.preset`（轻量枚举，随整 JSON 落盘，无迁移）；通过与 `recommend()` 叠加权重影响排序，引擎计算完全忽略该字段。 |

---

## 2. 文件列表及相对路径（标注 增/改/复用/触模）

> 图例：**【增】** 新增 · **【改】** 修改现有 · **【复用】** v2.0 已交付不重写 · **触模=否** 表示不改动 SQLite 表结构（`profile.preset` 随整 JSON 扩字段落盘，无迁移）。

### 2.1 公共基建（T01）
| 路径 | 操作 | 说明 |
|------|------|------|
| `src/renderer/@core/domain/user.ts` | 【改】 | `UserProfile` 增加 `preset?` 与 `dismissedWarnings?`（均为可选，向后兼容） |
| `src/renderer/features/warn/thresholds.ts` | 【增】 | 预警阈值常量（冲突/偏离） |
| `src/renderer/features/education/terms.ts` | 【增】 | 财务术语 + 法则起源故事静态内容 |
| `src/renderer/features/review/reviewRules.ts` | 【增】 | 方案点评规则集（纯函数） |
| `src/renderer/features/preset/presets.ts` | 【增】 | 6 类人群预设权重映射 |

### 2.2 引导填数 + 教育注解 + 人群预设（T02：P0-1 / P0-3 / P1-8）
| 路径 | 操作 | 说明 |
|------|------|------|
| `src/renderer/features/estimator/ExpenseWizard.tsx` | 【增】 | 支出估算向导（模态步进 3-4 步） |
| `src/renderer/features/education/TermPopover.tsx` | 【增】 | ❓ 术语弹窗组件（Popover 卡片） |
| `src/renderer/features/preset/PresetPicker.tsx` | 【增】 | 6 类人群单选卡（叠加 `recommend()` 权重） |
| `src/renderer/pages/ProfilePage.tsx` | 【改】 | 「补全档案」入口挂向导；财务字段旁挂术语 ❓ |
| `src/renderer/pages/SettingsPage.tsx` | 【改】 | 财务字段旁挂术语 ❓；可选挂向导入口 |
| `src/renderer/pages/RulesPage.tsx` | 【改】 | 法则行尾挂术语 ❓；进入前挂 PresetPicker；法则详情挂起源故事 |
| `src/renderer/components/Onboarding.tsx` | 【改】 | 可选第 5 步（支出估算）/ 可选人群预设（二选一，不强制） |

### 2.3 预警 + 方案点评（T03：P0-2 / P1-7）
| 路径 | 操作 | 说明 |
|------|------|------|
| `src/renderer/features/warn/conflict.ts` | 【增】 | 冲突判定纯函数（年龄×权益桶占比）+ `getEquityRatio` |
| `src/renderer/features/warn/deviation.ts` | 【增】 | 偏离判定纯函数（超支/超配比） |
| `src/renderer/features/warn/WarningBar.tsx` | 【增】 | 顶部红色警示条 + 各桶红点 |
| `src/renderer/features/warn/ConflictDialog.tsx` | 【增】 | 冲突 Dialog（调整/仍要使用，可关闭记忆） |
| `src/renderer/features/review/ReviewList.tsx` | 【增】 | 点评评语列表（带命中规则标签） |
| `src/renderer/stores/useAppStore.ts` | 【改】 | 增加 `dismissedWarnings: string[]` 会话态 + actions；增加 `tempProfile` 态（供 T04 复用） |
| `src/renderer/pages/ProfilePage.tsx` | 【改】 | 挂载 WarningBar + 桶红点 |
| `src/renderer/pages/PlanPage.tsx` | 【改】 | 挂载 WarningBar + 「点评」按钮 |

### 2.4 对比推演（T04：P0-4 / P0-5）
| 路径 | 操作 | 说明 |
|------|------|------|
| `src/renderer/features/compare/ComparePanel.tsx` | 【增】 | A/B 对比面板（勾选 2 法则并排双卡） |
| `src/renderer/features/simulate/WhatIfPanel.tsx` | 【增】 | What-if 假设抽屉（滑块/开关 + 实时重绘 + 恢复） |
| `src/renderer/features/plan/metrics.ts` | 【增】 | `buildPlanView` / `computeEmergencyFundReachMonths` 派生纯函数 |
| `src/renderer/pages/RulesPage.tsx` | 【改】 | 挂载 ComparePanel（对比 Tab/按钮） |
| `src/renderer/pages/PlanPage.tsx` | 【改】 | 挂载 WhatIfPanel（右侧/底部抽屉） |

### 2.5 规划书 PDF（T05：P0-6）
| 路径 | 操作 | 说明 |
|------|------|------|
| `src/renderer/features/report/planReport.ts` | 【增】 | 规划书聚合层（封面+目录+图表分页） |
| `src/renderer/features/report/ReportButton.tsx` | 【增】 | 「生成规划书」按钮 + 进度条 |
| `src/renderer/features/export/pdf.ts` | 【改】 | 扩展 `exportProfilePdf`，暴露 `renderReportPdf(ctx)` 复用转图通道 |
| `src/renderer/pages/PlanPage.tsx` | 【改】 | 挂 ReportButton |
| `src/renderer/pages/ProfilePage.tsx` | 【改】 | 挂 ReportButton（入口二选一） |

### 2.6 复用模块（v2.0 真实存在，不重写）
- `src/renderer/@core/domain/user.ts` → `UserProfile` / `createEmptyProfile(id)` / `totalMonthlyIncome` / `monthlyDisposable` / `totalMonthlyDebt`
- `src/renderer/@core/domain/rule.ts` → `Rule` / `RuleId` / `RULES` / `getRule(id)` / `Allocation`
- `src/renderer/@core/domain/bucket.ts` → `Bucket`
- `src/renderer/features/budget/engine.ts` → `applyRule(profile, rule)` / `compoundSeries(...)`
- `src/renderer/features/profile/health.ts` → `computeHealthScore` / `computeBadges` / `emergencyMultiple`
- `src/renderer/features/rules/recommend.ts` → `recommend(profile): RuleScore[]`
- `src/renderer/features/export/csv.ts` + `pdf.ts` → 导出通道
- `src/renderer/stores/useAppStore.ts` → `updateProfile` / `saveProfile` / `exportData('csv'|'pdf')` / `selectedRuleId`
- `src/renderer/components/EChart.tsx` → ECharts 封装（What-if / 对比图表复用）
- `src/renderer/@design/tokens.ts` → 设计 token

### 2.7 触模结论
**全部 8 条功能「触模=否」**。唯一存储变更是 `profile.preset` 作为整 JSON 一个新字段随 `profileRepo.upsert` 落盘（**同结构扩字段，无需 SQLite 迁移**）。`dismissedWarnings` 为可选会话态，建议复用 store 既有 localStorage 模式持久化（与 `onboarded` 一致）。What-if 临时态**不入 SQLite**。

---

## 3. 数据结构和接口

### 3.1 类图 / 类型图（Mermaid）
> 详见 `docs/class-diagram.mermaid`。要点：`UserProfile` 增量仅加两个可选字段；v2.0 的 `Rule`/`Bucket`/`Allocation` 保持不变；v1.1 新增 `WarnThresholds`/`TermDef`/`ReviewRule`+`ReviewContext`+`ReviewHit`/`PresetDef`/`PlanView`。

### 3.2 预警阈值常量结构（`features/warn/thresholds.ts`）
```ts
export interface ConflictThreshold {
  ageMin: number;          // 触发冲突预警的最低年龄
  equityRatioMax: number;  // 权益桶占比上限，超过即冲突
}
export interface DeviationThreshold {
  totalExpenseRatioMax: number;  // (固定+变动支出)/月收入 上限，超过即超支
  bucketRatioTolerance: number;  // 单桶实际占比相对法则配比容差，超过即偏离
}
export interface WarnThresholds {
  conflict: ConflictThreshold;
  deviation: DeviationThreshold;
}
export const WARN_THRESHOLDS: WarnThresholds = {
  conflict: { ageMin: 55, equityRatioMax: 0.4 },
  deviation: { totalExpenseRatioMax: 1.0, bucketRatioTolerance: 0.1 },
} as const;
```

### 3.3 术语 / 起源故事静态内容（`features/education/terms.ts`）
```ts
export interface TermDef {
  id: string;
  label: string;   // 字段/法则展示名
  short: string;   // 弹窗释义（≤120 字）
  origin?: string; // 法则起源故事（≈200 字，仅法则有）
}
/** 财务字段术语：覆盖 ≥6 个（月收入/固定支出/变动支出/应急金倍数/权益桶/风险偏好…） */
export const FINANCIAL_TERMS: Record<string, TermDef>;
/** 法则术语：覆盖 RULES 全部 12 个内置法则，含 origin 起源故事 */
export const RULE_TERMS: Record<string, TermDef>;
```

### 3.4 方案点评规则集（`features/review/reviewRules.ts`）
```ts
import type { UserProfile } from '@/renderer/@core/domain/user';
import type { Bucket } from '@/renderer/@core/domain/bucket';
import type { Rule } from '@/renderer/@core/domain/rule';

export interface HealthResult {
  score: number;
  badges: Badge[];           // 复用 health.ts 的 Badge
  emergencyMultiple: number; // 复用 emergencyMultiple()
}
export interface PlanView {
  buckets: Bucket[];
  totalMonthly: number;
  futureValue: number;
  reachMonths: number;
  equityRatio: number;
}
export interface ReviewContext {
  profile: UserProfile;
  plan: PlanView;
  health: HealthResult;
  rule: Rule;                // 当前选定法则
}
export interface ReviewHit {
  tag: string;               // 命中规则标签（如「应急金不足」）
  text: string;              // 评语（≤60 字）
}
export interface ReviewRule {
  id: string;
  tag: string;
  test: (ctx: ReviewContext) => ReviewHit | null; // 纯函数，无副作用
}
export const REVIEW_RULES: ReviewRule[];            // 规则集（3-5 条命中即止）
export function buildReviews(ctx: ReviewContext): ReviewHit[]; // 顺序匹配，收集非 null
```

### 3.5 人群预设权重映射（`features/preset/presets.ts`）
```ts
import type { RuleId } from '@/renderer/@core/domain/rule';

export type PresetId = 'student' | 'newgrad' | 'single' | 'dualincome' | 'family' | 'preretire';

export interface PresetDef {
  id: PresetId;
  label: string;            // 学生/职场新人/单身白领/已婚双职工/三口之家/临退休
  recommendRules: RuleId[]; // 推荐高分的法则 id（仅影响排序）
  weights: Partial<Record<RuleId, number>>; // 法则 id -> 推荐权重加成
}
export const PRESETS: PresetDef[];
export function getPreset(id: PresetId | null | undefined): PresetDef | undefined;

// 推荐排序增强：在 recommend(profile) 结果上叠加预设权重
export function recommendWithPreset(profile: UserProfile, presetId?: PresetId | null): RuleScore[];
```

### 3.6 UserProfile 增量类型（`@core/domain/user.ts`）
```ts
import type { PresetId } from '@/renderer/features/preset/presets';

export interface UserProfile {
  // —— v2.0 既有字段（保持不变）——
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
  preset?: PresetId | null;          // P1-8 人群预设（轻量枚举）
  dismissedWarnings?: string[];      // 可选会话记忆（建议仅内存/localStorage）
}
```

### 3.7 复用引擎 5 个函数完整签名（供工程师直接调用）
> 团队负责人点名要求的 5 个函数。其中 **3 个在 v2.0 已存在**，2 个为 v1.1 新增轻量派生函数。下表给出 PRD 名称 → 实际落地映射与完整签名。

| PRD 名称 | v1.1 实际实现 | 来源 | 完整签名 |
|----------|---------------|------|----------|
| `computePlan(profile, rule)` | `applyRule` | 已有 `features/budget/engine.ts` | `applyRule(profile: UserProfile, rule: Rule): Bucket[]` |
| `getBudgetBreakdown(profile, rule)` | `applyRule`（同上的别名概念） | 同上 | `applyRule(profile: UserProfile, rule: Rule): Bucket[]` |
| `projectFutureValue(opts)` | `compoundSeries` | 已有 `features/budget/engine.ts` | `compoundSeries(monthlyInvest: number, annualRate: number, months: number): CompoundPoint[]`（末点 `.value` 即终值） |
| `computeEmergencyFundReachMonths(profile, plan)` | 新增 | v1.1 `features/plan/metrics.ts` | `computeEmergencyFundReachMonths(profile: UserProfile, monthlySave: number): number` |
| `getEquityRatio(profile, rule)` | 新增 | v1.1 `features/warn/conflict.ts` | `getEquityRatio(profile: UserProfile, rule: Rule): number` |

补充完整签名（代码块版）：
```ts
// —— 已有（features/budget/engine.ts）——
applyRule(profile: UserProfile, rule: Rule): Bucket[];
compoundSeries(monthlyInvest: number, annualRate: number, months: number): { month: number; value: number }[];

// —— 已有（features/profile/health.ts）——
computeHealthScore(p: UserProfile): number;
computeBadges(p: UserProfile, ctx: { onboarded: boolean; hasPlan: boolean }): Badge[];
emergencyMultiple(p: UserProfile): number;

// —— 已有（features/rules/recommend.ts）——
recommend(profile: UserProfile): { rule: Rule; score: number }[];

// —— 已有（@core/persistence/profile.ts via store）——
updateProfile(patch: Partial<UserProfile>): Promise<void>;
saveProfile(p: UserProfile): Promise<void>;
exportData(fmt: 'csv' | 'pdf'): void;

// —— 新增 v1.1（features/plan/metrics.ts）——
export interface PlanView { buckets: Bucket[]; totalMonthly: number; futureValue: number; reachMonths: number; equityRatio: number; }
buildPlanView(profile: UserProfile, rule: Rule): PlanView;
computeEmergencyFundReachMonths(profile: UserProfile, monthlySave: number): number; // 达 3×固定支出所需月数

// —— 新增 v1.1（features/warn/conflict.ts）——
getEquityRatio(profile: UserProfile, rule: Rule): number; // 权益类桶占比（0-1）

// —— 新增 v1.1（stores/useAppStore.ts 扩展）——
setTempProfile(p: UserProfile | null): void;  // What-if 临时态（不入 SQLite）
dismissWarning(id: string): void;              // 预警关闭记忆
```

---

## 4. 程序调用流程（Mermaid 时序图）

> 完整图见 `docs/sequence-diagram.mermaid`（含 What-if / A-B 对比 / 点评 / 冲突预警 / 规划书PDF 五条）。以下为正交摘要，均使用真实函数名。

### 4.1 What-if 实时重算（P0-5）
- 用户拖动滑块 → `WhatIfPanel` 防抖(≤200ms) → `setTempProfile(派生profile)`
- `buildPlanView(tempProfile ?? profile, rule)` → 内部调 `applyRule` + `compoundSeries` + `computeEmergencyFundReachMonths`
- 经 `EChart` 组件 `setOption` 实时重绘
- 「恢复真实档案」→ `setTempProfile(null)`

### 4.2 A/B 对比计算（P0-4）
- 用户勾选法则 A、B → `ComparePanel.openCompare([ruleA, ruleB])`
- 各自 `buildPlanView(profile, ruleA/B)` → 取 `futureValue` / `reachMonths` / `equityRatio` 并排双卡 + 顶部差异高亮

### 4.3 方案点评触发（P1-7）
- 用户点「点评」→ `computeHealthScore/computeBadges/emergencyMultiple(profile)` → `buildReviews({profile, plan, health, rule})`
- `REVIEW_RULES[].test(ctx)` 顺序匹配 → 返回 `ReviewHit[]` → `ReviewList` 渲染

---

## 5. 任务列表（有序 · 依赖 · 文件）

> ⚠️ **任务分解硬约束**：不超过 5 个任务；每任务 ≥3 文件；按功能模块分组；首个任务为本增量「公共基建」。v1.1 为增量开发，无新增构建配置/入口文件，故 T01 以「共享数据/常量/类型基础层」充当基建任务（等价作用域）。

| Task | 名称 | 覆盖功能 | 依赖 | 优先级 | 涉及文件（≥3） |
|------|------|----------|------|--------|----------------|
| **T01** | 公共基建：阈值/术语/点评规则/预设/类型 | 基建 | 无 | P0 | `user.ts`【改】、`warn/thresholds.ts`【增】、`education/terms.ts`【增】、`review/reviewRules.ts`【增】、`preset/presets.ts`【增】 |
| **T02** | 引导填数 + 教育注解 + 人群预设 | P0-1 / P0-3 / P1-8 | T01 | P0/P1 | `estimator/ExpenseWizard.tsx`【增】、`education/TermPopover.tsx`【增】、`preset/PresetPicker.tsx`【增】+ `ProfilePage.tsx`【改】、`SettingsPage.tsx`【改】、`RulesPage.tsx`【改】、`components/Onboarding.tsx`【改】 |
| **T03** | 预警系统 + 方案点评 | P0-2 / P1-7 | T01 | P0/P1 | `warn/conflict.ts`【增】、`warn/deviation.ts`【增】、`warn/WarningBar.tsx`【增】、`warn/ConflictDialog.tsx`【增】、`review/ReviewList.tsx`【增】+ `useAppStore.ts`【改】、`ProfilePage.tsx`【改】、`PlanPage.tsx`【改】 |
| **T04** | A/B 对比 + What-if 推演 | P0-4 / P0-5 | T01 | P0 | `compare/ComparePanel.tsx`【增】、`simulate/WhatIfPanel.tsx`【增】、`plan/metrics.ts`【增】+ `RulesPage.tsx`【改】、`PlanPage.tsx`【改】、`useAppStore.ts`【改】 |
| **T05** | 一键规划书 PDF 报告 | P0-6 | T03, T04, T02 | P0 | `report/planReport.ts`【增】、`report/ReportButton.tsx`【增】+ `export/pdf.ts`【改】、`PlanPage.tsx`【改】、`ProfilePage.tsx`【改】 |

### 实现顺序说明
1. **T01** 先落地：所有特性都依赖常量/类型/静态内容。
2. **T02 / T03 / T04** 可并行（仅依赖 T01），建议 T02 → T03 → T04 以降低对 `ProfilePage`/`PlanPage`/`RulesPage` 的改动冲突。
3. **T05** 最后：聚合「档案(M1)+法则(M2)+方案(M3)+健康分/徽章+（可选）点评」，依赖 T02/T03/T04 产物。

---

## 6. 依赖包列表

**结论：v1.1 无任何新增第三方依赖包。**

```
# 全部沿用 v2.0（列示确认，无需安装）
- electron@^31
- react@^18  react-dom@^18
- typescript@^5
- vite  @vitejs/plugin-react
- better-sqlite3
- zustand
- echarts
- react-router-dom (HashRouter)
- @mui/material  @emotion/react  @emotion/styled
- tailwindcss  postcss  autoprefixer
- jspdf  (v2.0 已用于 export/pdf.ts，规划书复用)
```

> 引擎函数（`applyRule`/`compoundSeries`/`recommend`/`computeHealthScore` 等）**已全部存在**，v1.1 仅新增 2 个纯函数（`computeEmergencyFundReachMonths`/`getEquityRatio`）与聚合层，**不引入新包**。

---

## 7. 共享知识（跨文件约定）

1. **术语内容集中管理**：所有财务字段释义与法则起源故事**只**写在 `features/education/terms.ts`，UI 组件通过 `id` 取用，禁止硬编码文案。
2. **预警阈值集中常量**：所有阈值**只**在 `features/warn/thresholds.ts` 定义，组件/判定函数只读不改；调参只动该文件。
3. **点评规则纯函数无副作用**：`REVIEW_RULES[].test(ctx)` 必须 `(ctx)=>ReviewHit|null` 纯函数，禁止读全局态、禁止改 profile/plan。
4. **What-if 临时态不入 SQLite**：`tempProfile` 仅存 zustand 内存；推演全程不调用 `updateProfile`/`saveProfile`；「恢复真实档案」= `setTempProfile(null)`。
5. **引擎零重写**：`applyRule`/`compoundSeries`/`recommend`/`computeHealthScore` 为 v2.0 既有导出，直接调用；新增派生函数放 `features/plan/metrics.ts` 与 `features/warn/conflict.ts`。
6. **preset 不影响引擎**：`profile.preset` 仅经 `recommendWithPreset()` 影响 `RulesPage` 推荐排序高亮，计算链路完全忽略该字段。
7. **dismissedWarnings 会话态**：复用 store 既有 localStorage 模式（与 `onboarded` 一致），冲突预警「仍要使用」关闭后写入；刷新后不重复弹。
8. **图表转图统一出口**：PDF 报告所有图表必须经 `export/pdf.ts` 既有通道转图（`EChart` 的 `getDataURL`），禁止各特性内各自实现截图。
9. **防抖约定**：What-if 滑块输入统一在 `WhatIfPanel` 内做 ≤200ms 防抖，避免高频重算卡顿。

---

## 8. 待明确事项（回应 PRD 第 5 节 4 问 — 架构师建议）

**Q1. PDF 报告是否含「方案点评」一节？若含是否依赖点评先产出？**
> **建议：v1.1 规划书 PDF 不含「方案点评」独立章节。** 点评为 P1 功能；为降低耦合与排期风险，报告聚合 M1 档案 + M2 法则 + M3 方案 + 健康分/徽章即可。`buildReviews` 与 `renderReportPdf` 互不依赖、可独立产出。若 P1-7 必进，v1.2 给报告加「点评」节（届时 `ReportContext` 追加 `reviews?: ReviewHit[]` 即可，无架构改动）。

**Q2. 人群预设权重映射表由谁拍板？是否持久化到 `profile.preset`？**
> **建议：`profile.preset` 持久化（轻量枚举单字段，随整 JSON 落盘，无迁移）；权重映射表由产品经理许清楚拍板数值，架构师落表。** `presets.ts` 中的 `weights`/`recommendRules` 为「展示层推荐权重」，经 `recommendWithPreset()` 叠加到 `recommend()` 结果影响排序；引擎计算忽略。默认 `preset: null`（不预设）。

**Q3. 预警阈值常量化初值由 PRD 给还是架构师按法则库参数定？**
> **建议：架构师按法则库现有参数给出常量初值，集中放 `features/warn/thresholds.ts`（见 §3.2）。** 初值：`ageMin=55`、`equityRatioMax=0.4`（权益桶）、`totalExpenseRatioMax=1.0`、`bucketRatioTolerance=0.1`。产品经理可后续只改该常量文件调参。

**Q4. What-if 推演态是否允许"保存为方案版本快照"（触及 plan 多版本）？v1.1 是否只做临时态、快照留 v1.2？**
> **建议：v1.1 仅做临时态，快照（多版本 plan）留 v1.2。** v1.1 的 `tempProfile` 不入 SQLite、不新增 plan 版本表；「恢复真实档案」一键还原。多版本快照需扩展 SQLite 的 plan/bucket 模型（v2.0 为快照式单 plan/buckets），属结构性变更，超出 v1.1 增量范围，明确留 v1.2。

---

## 附：交付文件索引
- `docs/system_design.md` —— 本设计文档（交付工程师）
- `docs/class-diagram.mermaid` —— 类型/类图
- `docs/sequence-diagram.mermaid` —— 时序图（What-if / A-B / 点评 / 冲突预警 / 规划书PDF）
