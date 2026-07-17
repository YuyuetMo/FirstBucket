// 预警阈值常量 —— 全部集中于此，组件/判定函数只读不改（设计文档 §3.2 / §7.2）

/** 冲突预警阈值：年龄 × 权益桶占比 */
export interface ConflictThreshold {
  /** 触发冲突预警的最低年龄 */
  ageMin: number;
  /** 权益桶占比上限，超过即冲突（0-1） */
  equityRatioMax: number;
}

/** 偏离预警阈值：超支 / 超配比 */
export interface DeviationThreshold {
  /** (固定+变动支出)/月收入 上限，超过即超支 */
  totalExpenseRatioMax: number;
  /** 单桶实际占比相对法则配比容差（备用，1=100%） */
  bucketRatioTolerance: number;
}

export interface WarnThresholds {
  conflict: ConflictThreshold;
  deviation: DeviationThreshold;
}

/** 初值由架构师按法则库现有参数给出；产品经理可后续只改本文件调参 */
export const WARN_THRESHOLDS: WarnThresholds = {
  conflict: { ageMin: 55, equityRatioMax: 0.4 },
  deviation: { totalExpenseRatioMax: 1.0, bucketRatioTolerance: 0.1 },
} as const;
