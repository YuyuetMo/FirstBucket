// 渲染进程对主进程安全 API 的类型声明
export interface FirstBucketAPI {
  profile: {
    get: () => Promise<import('./domain/user').UserProfile | null>;
    upsert: (p: import('./domain/user').UserProfile) => Promise<boolean>;
  };
  bucket: {
    list: () => Promise<import('./domain/bucket').Bucket[]>;
    upsert: (b: import('./domain/bucket').Bucket) => Promise<boolean>;
  };
  db: {
    reset: () => Promise<boolean>;
  };
  // 窗口控制（T04 / B4）
  minimize: () => Promise<void>;
  close: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
}

declare global {
  interface Window {
    FirstBucket: FirstBucketAPI;
  }
}

export {};
