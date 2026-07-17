// 关键词 → 支出类别映射（C7 / T07，设计文档 §3.4 + PRD C7）。
// 类别：medical-emergency / entertainment / social / home-repair / other。
import type { ExpenseCategory } from '../../@core/domain/user';

export const KEYWORD_MAP: Record<string, ExpenseCategory> = {
  // 医疗应急
  病: 'medical-emergency',
  药: 'medical-emergency',
  医院: 'medical-emergency',
  医疗: 'medical-emergency',
  急诊: 'medical-emergency',
  体检: 'medical-emergency',
  牙: 'medical-emergency',
  // 娱乐消费
  演唱会: 'entertainment',
  电影: 'entertainment',
  旅游: 'entertainment',
  游戏: 'entertainment',
  聚会: 'entertainment',
  娱乐: 'entertainment',
  演出: 'entertainment',
  展览: 'entertainment',
  // 社交维系
  人情: 'social',
  聚餐: 'social',
  份子: 'social',
  请客: 'social',
  红包: 'social',
  送礼: 'social',
  朋友: 'social',
  // 家居维修
  手机: 'home-repair',
  维修: 'home-repair',
  家电: 'home-repair',
  装修: 'home-repair',
  家具: 'home-repair',
  水管: 'home-repair',
  电器: 'home-repair',
};
