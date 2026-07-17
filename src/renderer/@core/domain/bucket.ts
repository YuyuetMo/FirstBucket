export interface Bucket {
  id: string;
  ruleId: string;
  name: string;
  color: string;
  monthlyAmount: number;
  note?: string;
  /** 该桶对应的法则分配 bucketKey（加法字段，用于投资桶识别/组合引擎） */
  bucketKey?: string;
}
