import type { UserProfile } from '../domain/user';

// 渲染端持久化层：全部经 IPC 访问主进程 SQLite（决议 D2）
export const profileRepo = {
  get: (): Promise<UserProfile | null> => window.FirstBucket.profile.get(),
  upsert: (p: UserProfile): Promise<boolean> => window.FirstBucket.profile.upsert(p),
};
