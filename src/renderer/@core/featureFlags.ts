// 特性开关（决议 D3）—— 实验模块默认关闭
export const featureFlags = {
  'experimental.flowEditor': false,
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isEnabled(key: FeatureFlag): boolean {
  return featureFlags[key];
}
