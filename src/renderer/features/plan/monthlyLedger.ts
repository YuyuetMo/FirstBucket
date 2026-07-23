// 月度账本（v2.2 / L1+L2 执行闭环）。
// 把 v1.7 的「扁平快照 RuleActuals」升级为按月账页：
//   fb_monthly_ledger = { months: { 'YYYY-MM': { actuals: { [ruleId]: { [bucketKey]: number } }, confirm?: 快照 } } }
// 关键能力：
//   1) 跨月自动开新账页（当前月无数据时从空开始，历史保留可回看）
//   2) 「确认本月完成」把当月三桶/消费/已规划存成快照 → 累计进度、复盘、连续月数全部由快照派生
//   3) 首次加载自动迁移旧 fb_rule_actuals（迁入当前月，旧 key 保留作备份，不重复迁移）
// 纯 localStorage，静默容错，与 SQLite 无关。

const LS_KEY = 'fb_monthly_ledger';
const LEGACY_KEY = 'fb_rule_actuals';

/** 单月确认快照：确认时刻的执行结果，累计/复盘的数据源 */
export interface MonthConfirm {
  at: string; // ISO 确认时间
  ruleId: string | null;
  consumption: number; // 当月消费类实际合计
  disposable: number; // 当月可自由可支配
  planned: number; // 当月已规划分配小计（储蓄/投资/保险）
  reserve: number; // 当月转入备用金
  flexible: number; // 当月转入灵活应急金
  free: number; // 当月自由支配
  reserveTarget: number; // 确认时的备用金目标
}

interface MonthEntry {
  /** { [ruleId]: { [bucketKey]: number } } —— 该月各法则的实际填写 */
  actuals: Record<string, Record<string, number>>;
  confirm?: MonthConfirm;
}

interface Ledger {
  months: Record<string, MonthEntry>;
  migrated?: boolean;
}

/* ── 月份工具 ── */

/** 当前月份 key（本地时区），如 '2026-07' */
export function currentYm(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** 上一个月份 key */
export function prevYm(ym = currentYm()): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return currentYm(d);
}

/** 'YYYY-MM' → 'YYYY年M月' 展示用 */
export function ymLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${y}年${m}月`;
}

/* ── 读写 ── */

function load(): Ledger {
  try {
    if (typeof localStorage === 'undefined') return { months: {} };
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object' && p.months && typeof p.months === 'object') return p as Ledger;
    }
  } catch { /* ignore */ }
  return { months: {} };
}

function save(l: Ledger): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LS_KEY, JSON.stringify(l));
  } catch { /* localStorage 满等边缘情况静默降级 */ }
}

/** 首次调用时把旧扁平 RuleActuals 迁入当前月（旧 key 保留作备份，仅迁一次） */
function loadMigrated(): Ledger {
  const l = load();
  if (l.migrated) return l;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LEGACY_KEY) : null;
    if (raw) {
      const legacy = JSON.parse(raw);
      if (legacy && typeof legacy === 'object' && Object.keys(legacy).length > 0) {
        const ym = currentYm();
        if (!l.months[ym]) l.months[ym] = { actuals: {} };
        // 旧数据只填充当前月的空缺法则（不覆盖已有新数据）
        for (const [ruleId, buckets] of Object.entries(legacy as Record<string, Record<string, number>>)) {
          if (!l.months[ym].actuals[ruleId]) l.months[ym].actuals[ruleId] = { ...buckets };
        }
      }
    }
  } catch { /* ignore */ }
  l.migrated = true;
  save(l);
  return l;
}

/* ── 当月实际值（供 ruleActuals 门面委托） ── */

export function getMonthActuals(ym: string, ruleId: string): Record<string, number> {
  return loadMigrated().months[ym]?.actuals[ruleId] ?? {};
}

export function setMonthActual(ym: string, ruleId: string, bucketKey: string, amount: number): void {
  const l = loadMigrated();
  if (!l.months[ym]) l.months[ym] = { actuals: {} };
  if (!l.months[ym].actuals[ruleId]) l.months[ym].actuals[ruleId] = {};
  l.months[ym].actuals[ruleId][bucketKey] = amount;
  save(l);
}

export function setMonthActualsBulk(ym: string, ruleId: string, actuals: Record<string, number>): void {
  const l = loadMigrated();
  if (!l.months[ym]) l.months[ym] = { actuals: {} };
  l.months[ym].actuals[ruleId] = { ...actuals };
  save(l);
}

export function clearMonthActuals(ym: string, ruleId: string): void {
  const l = loadMigrated();
  if (l.months[ym]?.actuals[ruleId]) {
    delete l.months[ym].actuals[ruleId];
    save(l);
  }
}

/* ── 月确认（执行闭环核心） ── */

export function getConfirm(ym: string): MonthConfirm | undefined {
  return loadMigrated().months[ym]?.confirm;
}

export function confirmMonth(ym: string, snapshot: Omit<MonthConfirm, 'at'>): void {
  const l = loadMigrated();
  if (!l.months[ym]) l.months[ym] = { actuals: {} };
  l.months[ym].confirm = { ...snapshot, at: new Date().toISOString() };
  save(l);
}

export function unconfirmMonth(ym: string): void {
  const l = loadMigrated();
  if (l.months[ym]?.confirm) {
    delete l.months[ym].confirm;
    save(l);
  }
}

/* ── 派生统计 ── */

export interface CumulativeBuckets {
  reserve: number; // 已确认各月备用金转入合计
  flexible: number;
  free: number;
  months: number; // 已确认月数
  firstYm?: string;
  lastYm?: string;
}

/** 累计三桶余额（只统计已确认的月份） */
export function cumulativeBuckets(): CumulativeBuckets {
  const l = loadMigrated();
  const confirmed = Object.entries(l.months)
    .filter(([, e]) => !!e.confirm)
    .sort(([a], [b]) => a.localeCompare(b));
  const sum = confirmed.reduce(
    (s, [, e]) => ({
      reserve: s.reserve + (e.confirm!.reserve || 0),
      flexible: s.flexible + (e.confirm!.flexible || 0),
      free: s.free + (e.confirm!.free || 0),
    }),
    { reserve: 0, flexible: 0, free: 0 },
  );
  return {
    ...sum,
    months: confirmed.length,
    firstYm: confirmed[0]?.[0],
    lastYm: confirmed[confirmed.length - 1]?.[0],
  };
}

/** 连续执行月数：从当前月（未确认则从上月）向前数连续已确认的月份 */
export function confirmedStreak(): number {
  const l = loadMigrated();
  let ym = currentYm();
  if (!l.months[ym]?.confirm) ym = prevYm(ym);
  let streak = 0;
  while (l.months[ym]?.confirm) {
    streak += 1;
    ym = prevYm(ym);
  }
  return streak;
}

/** 是否有任何历史记录（填过实际值或确认过任一月份） */
export function hasAnyHistory(): boolean {
  const l = loadMigrated();
  return Object.values(l.months).some(
    (e) => !!e.confirm || Object.values(e.actuals).some((r) => Object.keys(r).length > 0),
  );
}

/** 上月是否「有记录但未确认」——Dashboard 引导卡的触发条件 */
export function prevMonthNeedsConfirm(): boolean {
  const l = loadMigrated();
  const pm = prevYm();
  const e = l.months[pm];
  if (!e || e.confirm) return false;
  return Object.values(e.actuals).some((r) => Object.keys(r).length > 0);
}
