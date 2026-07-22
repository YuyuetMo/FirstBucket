# FirstBucket · 个人财务分桶规划助手

> **FirstBucket** —— 一款面向年轻人的**桌面端理财规划客户端**，把经典理财法则变成可执行、可落地的每月现金流方案。

[![Platform](https://img.shields.io/badge/platform-Windows%20%2F%20macOS%20%2F%20Linux-blue)]()
[![Electron](https://img.shields.io/badge/Electron-31.x-47848f)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)]()
[![Release](https://img.shields.io/badge/release-v2.1.0-blue)](https://github.com/YuyuetMo/FirstBucket/releases)

> 📦 **Windows 桌面安装包**：前往 [Releases](https://github.com/YuyuetMo/FirstBucket/releases) 下载 `FirstBucket_v2.1.zip`，解压后双击 `FirstBucket.exe` 即可运行（无需 Node 环境）。

---

## 📖 简介 | Introduction

FirstBucket 不替你炒股，也不做投资建议。它做的事很简单：

> **把你每个月的钱，按你选中的理财法则，拆成「能花的、该存的、该投的、该保的」，并告诉你具体数字怎么放。**

与多数"输入收入就按比例硬切"的工具不同，FirstBucket 采用 **现金流瀑布（Route B）** 模型：
先扣掉你为各消费桶填写的**实际开销**（未填写时回退到固定/变动支出），再减去月负债，剩下的**可自由支配额**才交给理财法则去分配。
这样每个数字都对应你真实的账单，而不是拍脑袋的理想比例。

- **English**: FirstBucket is a desktop personal-finance planner. Pick a personal-finance rule (e.g. 4321, 50/30/20, All-Weather), and it turns your real monthly income/expenses into an actionable cash-flow plan — what to spend, save, invest, and insure — using a "cash-flow waterfall" that deducts your actual living costs first.

---

## ✨ 功能特性 | Features

| 模块 | 说明 |
|------|------|
| **🏠 Dashboard** | KPI 概览 + 分桶占比饼图 + 三桶洞察，一眼看清财务健康度 |
| **📐 方案生成** | 选中法则 → 自动生成专属方案，含「现金流瀑布 / A·B 对比 / What-if 推演」三个一级 Tab |
| **📚 理财法则库** | 内置 **11 个经典法则**（见下表），按人生阶段动态筛选与推荐 |
| **📈 复利可视** | 基于投资桶月额计算复利末值，附白话解释文案 |
| **💡 方案点评** | 单法则 / 组合模式均出通用点评，指出风险与优化点 |
| **🧩 自定义法则 (R8)** | 用户自填比例（自动校验合计 100%），参与组合与方案计算 |
| **🔀 组合方案** | 多法则叠加（收入级 + 投资级），结果直接展示真实资产桶金额 |
| **🧪 What-if 推演** | 参数隔离在面板内，不影响全局基线，随时"假如…会怎样" |
  - 消费类实际（方案页各消费桶填的本月金额；未填则回退固定+变动支出）
  - 月负债（如有）
| **📤 数据导出** | 支持 CSV / PDF 导出 |
| **✍️ 实际金额对比** | 方案页逐桶填写「本月实际」，对比法则建议：消费类显示「省 / 超」，储蓄/投资/保险显示「多存 / 还差」（正向反馈） |
| **🪣 三桶并行积累** | 保命钱三桶支持并行：应急金投入比例 / 灵活比例双滑块可调，不再强制先存满应急金 |
| **🔄 检查更新** | 一键跳转 GitHub Releases，应用内外部链接用系统默认浏览器打开 |

---

## 🧠 核心概念 | Core Concepts

### 1. 现金流瀑布（Route B）

```
税后月收入
  - 消费类实际（方案页各消费桶填的本月金额；未填则回退固定+变动支出）
  - 月负债（如有）
＝ 可自由支配（这是"能攒的钱"）
        ↓
   法则只分配「可自由支配」这部分
```

- 收入级法则（4321 / 50-30-20 等）→ 储蓄部分进入「三桶」
- 投资级法则（60-40 / 全天候等）→ 把可自由支配按自身比例拆成储蓄/投资/保险

### 2. 保命钱 · 三桶

| 桶 | 含义 | 目标 |
|----|------|------|
| **备用金桶** | 固定不动的应急安全垫 | 目标 = `备用金月数 × 月消费`；与灵活/自由桶**并行**累积（投入比例可调） |
| **灵活应急金** | 可允许被突发开销（医疗/人情）花完 | 保留，补弹性缺口 |
| **自由支配** | 剩余全部可自由安排（娱乐/自我提升） | — |

> 备用金目标月数**随法则变化**：4321 / 50-30-20 / 六罐子 = 3 个月；标普象限 = 6 个月。

### 3. 人生阶段（六档）

`student（学生）→ newgrad（应届）→ single（单身）→ dualincome（双收入）→ family（家庭）→ preretire（临退）`
法则库会按当前阶段推荐，并动态筛选可选项。

---

## 🛠 技术栈 | Tech Stack

| 层 | 选型 |
|----|------|
| 运行时 | **Electron 31** |
| 前端 | **React 18** + **TypeScript 5** + **Vite 5** |
| 路由 | react-router-dom 6（HashRouter） |
| 状态 | **zustand** |
| 图表 | **ECharts 5** |
| 存储 | **better-sqlite3**（本地 SQLite） |
| 进程通信 | IPC + contextBridge（`window.FirstBucket` 安全暴露） |
| 打包 | electron-builder |

---

## 🚀 快速开始 | Getting Started

### 环境要求

- Node.js **18+**
- npm **9+**
- Windows / macOS / Linux（打包脚本当前以 Windows 为例）

### 安装依赖

```bash
git clone https://github.com/YuyuetMo/FirstBucket.git
cd FirstBucket
npm install
```

> ⚠️ `better-sqlite3` 为原生模块，首次安装会自动编译。
> 若升级 Electron 版本，请运行 `npm run rebuild:native` 重新构建原生依赖。

### 开发模式（Vite 热更新）

```bash
npm run dev
```

### 构建生产包（Windows 示例）

```bash
npm run build:win
```

构建流程（`scripts/build-win.mjs`）会依次执行：

1. `vite build` 构建渲染进程
2. `electron-builder --win dir` 打包（当前 `signAndEditExecutable:false`，可改为自签名/证书）
3. rcedit 注入应用图标
4. robocopy 复制到交付物目录

产物位于 `release/win-unpacked/FirstBucket.exe`。

### 其它脚本

| 命令 | 作用 |
|------|------|
| `npm run build` | 仅构建渲染进程（Vite） |
| `npm run pack` | 构建并打包（不发布） |
| `npm run rebuild:native` | 重建 better-sqlite3 原生模块 |

---

## 📁 项目结构 | Project Structure

```
FirstBucket/
├── electron/                 # 主进程（main.ts / preload.ts）
├── scripts/
│   └── build-win.mjs         # Windows 打包脚本（build + 注入图标 + 复制）
├── src/
│   ├── renderer/
│   │   ├── @core/domain/      # 领域模型（rule / user / bucket）
│   │   ├── features/
│   │   │   ├── budget/        # 现金流瀑布 + 三桶分配纯函数
│   │   │   ├── plan/          # 方案视图 / 执行清单 / 复利计算
│   │   │   ├── rules/         # 组合引擎 / 自定义法则
│   │   │   ├── simulate/      # What-if 推演（参数隔离）
│   │   │   ├── review/        # 方案点评
│   │   │   ├── compare/       # A·B 法则对比
│   │   │   ├── report/        # 规划书生成（PDF/CSV）
│   │   │   └── education/     # 法则科普 / 起源故事
│   │   ├── pages/             # Dashboard / Plan / Rules / Visualizer / Settings
│   │   ├── components/        # Nav / TitleBar / EChart / Onboarding …
│   │   ├── stores/            # zustand 全局状态
│   │   ├── App.tsx
│   │   └── styles.css         # 唯一全局样式（设计 token 体系）
│   └── main.ts
├── package.json
└── README.md
```

---

## 📚 内置理财法则库（11 个）

| 法则 | 类型 | 核心配比 | 备用金目标 |
|------|------|----------|-----------|
| **4321 法则** | 收入级 | 生活40 / 储蓄30 / 投资20 / 保险10 | 3 个月 |
| **标普家庭资产象限** | 收入级 | 要花10 / 保命20 / 生钱30 / 保本40 | 6 个月 |
| **100 − 年龄** | 投资级 | 权益(100−年龄)% / 固收余下 | — |
| **50/30/20 预算法** | 收入级 | 必需50 / 想要30 / 储蓄投资20 | 3 个月 |
| **核心-卫星策略** | 投资级 | 核心80 / 卫星20 | — |
| **全天候策略** | 投资级 | 股票30 / 长债40 / 中债15 / 商品15 | — |
| **六罐子理财法** | 收入级 | 必需55 / 投资10 / 储蓄10 / 教育10 / 玩乐10 / 捐赠5 | 3 个月 |
| **永久组合（Permanent Portfolio）** | 投资级 | 股票25 / 长期国债25 / 黄金25 / 短期国债25 | — |
| **4% 提取法则** | 退休提领 | 年提取≤4% / 本金留存96% | — |
| **巴菲特 90/10** | 投资级 | 指数90 / 短债10 | — |
| **60/40 经典组合** | 投资级 | 股票60 / 债券40 | — |

> 你也可以在「理财法则」页点击 **＋自定义法则**，按自己的比例创建专属法则（自动校验合计 100%）。

---

## 🖼 截图 | Screenshots

> 截图占位，请在上传播放前替换为实际界面截图：
>
> | 页面 | 文件建议 |
> |------|----------|
> | Dashboard | `docs/screens/dashboard.png` |
> | 方案生成 | `docs/screens/plan.png` |
> | 理财法则 | `docs/screens/rules.png` |
> | 复利可视 | `docs/screens/visualizer.png` |

---

## 🗺 路线图 | Roadmap

- [x] 现金流瀑布（Route B）计算模型
- [x] 组合方案 / 自定义法则
- [x] 三桶备用金目标随法则差异化解释
- [ ] 分享卡片 / 应用锁 PIN / 加密备份
- [ ] 方案版本快照 / 成熟度雷达
- [ ] 计算器合集 / Markdown 导出 / 术语词典
- [ ] macOS / Linux 打包脚本

---

## 🤝 贡献 | Contributing

欢迎 Issue 与 PR！

1. Fork 本仓库
2. 创建特性分支 `git checkout -b feat/your-feature`
3. 提交 `git commit -m "feat: ..."`
4. 推送 `git push origin feat/your-feature`
5. 发起 Pull Request

代码遵循现有分层约定：`@core/domain`（纯模型）→ `features`（纯函数引擎）→ `pages/components`（UI）。
新增理财法则请在 `src/renderer/@core/domain/rule.ts` 的 `RULES` 中补充，并标注 `scope` 与 `lifeStages`。

---

## ⚠️ 免责声明 | Disclaimer

FirstBucket 仅用于**个人财务规划辅助与学习**，所有方案基于你输入的数据与经典法则的简单推演，
**不构成任何投资建议**，也不保证收益。投资有风险，决策需谨慎，必要时请咨询持牌理财顾问。

---

## 📄 许可证 | License

[MIT](./LICENSE) © FirstBucket Team
