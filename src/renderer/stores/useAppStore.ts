import { create } from 'zustand';
import type { UserProfile } from '../@core/domain/user';
import { createEmptyProfile } from '../@core/domain/user';
import type { Bucket } from '../@core/domain/bucket';
import { profileRepo } from '../@core/persistence/profile';
import { bucketRepo } from '../@core/persistence/bucket';
import { applyTheme, type ThemeMode } from '../@design/tokens';
import { buildProfileCsv, downloadCsv } from '../features/export/csv';
import { exportProfilePdf } from '../features/export/pdf';

interface AppState {
  theme: ThemeMode;
  agreed: boolean;
  disclaimerAck: boolean;
  onboarded: boolean;
  profile: UserProfile | null;
  buckets: Bucket[];
  selectedRuleId: string | null;

  // —— v1.1 增量会话态 ——
  /** 已忽略的预警 id 列表（会话态 + localStorage 持久化，不写 SQLite） */
  dismissedWarnings: string[];
  /** What-if 推演临时态：仅内存，绝不入 SQLite（设计文档 §7.4） */
  tempProfile: UserProfile | null;

  setTheme: (t: ThemeMode) => void;
  setAgreed: (v: boolean) => void;
  setDisclaimerAck: (v: boolean) => void;
  setOnboarded: (v: boolean) => void;
  loadProfile: () => Promise<void>;
  saveProfile: (p: UserProfile) => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  loadBuckets: () => Promise<void>;
  saveBuckets: (bs: Bucket[]) => Promise<void>;
  setSelectedRule: (id: string | null) => void;
  exportData: (fmt: 'csv' | 'pdf') => void;

  // —— v1.1 actions ——
  dismissWarning: (id: string) => void;
  resetDismissedWarnings: () => void;
  setTempProfile: (p: UserProfile | null) => void;
}

const STORE_ID = 'firstbucket-singleton';

// 协议 / 免责 / 引导 状态持久化（仅首次弹，后续不再弹）
const LS_AGREED = 'fb_agreed';
const LS_DISCLAIMER = 'fb_disclaimer_ack';
const LS_ONBOARDED = 'fb_onboarded';
// v1.1 预警忽略记忆（与 onboarded 一致的 localStorage 模式）
const LS_DISMISSED_WARNINGS = 'fb_dismissed_warnings';

function loadDismissedWarnings(): string[] {
  try {
    const raw = localStorage.getItem(LS_DISMISSED_WARNINGS);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'light',
  agreed: localStorage.getItem(LS_AGREED) === 'true',
  disclaimerAck: localStorage.getItem(LS_DISCLAIMER) === 'true',
  onboarded: localStorage.getItem(LS_ONBOARDED) === 'true',
  profile: null,
  buckets: [],
  selectedRuleId: null,

  dismissedWarnings: loadDismissedWarnings(),
  tempProfile: null,

  setTheme: (t) => {
    applyTheme(t);
    set({ theme: t });
  },
  setAgreed: (v) => { localStorage.setItem(LS_AGREED, String(v)); set({ agreed: v }); },
  setDisclaimerAck: (v) => { localStorage.setItem(LS_DISCLAIMER, String(v)); set({ disclaimerAck: v }); },
  setOnboarded: (v) => { localStorage.setItem(LS_ONBOARDED, String(v)); set({ onboarded: v }); },

  loadProfile: async () => {
    let p = await profileRepo.get();
    if (!p) {
      p = createEmptyProfile(STORE_ID);
      await profileRepo.upsert(p);
    }
    set({ profile: p });
  },
  saveProfile: async (p) => {
    const next = { ...p, updatedAt: new Date().toISOString() };
    await profileRepo.upsert(next);
    set({ profile: next });
  },
  updateProfile: async (patch) => {
    const cur = get().profile ?? createEmptyProfile(STORE_ID);
    const next = { ...cur, ...patch, updatedAt: new Date().toISOString() };
    await profileRepo.upsert(next);
    set({ profile: next });
  },
  loadBuckets: async () => {
    const bs = await bucketRepo.list();
    set({ buckets: bs });
  },
  saveBuckets: async (bs) => {
    for (const b of bs) await bucketRepo.upsert(b);
    set({ buckets: bs });
  },
  setSelectedRule: (id) => set({ selectedRuleId: id }),
  exportData: (fmt) => {
    const { profile, buckets } = get();
    if (!profile) return;
    if (fmt === 'csv') {
      downloadCsv(`firstbucket-${Date.now()}.csv`, buildProfileCsv(profile, buckets));
    } else {
      exportProfilePdf(profile, buckets);
    }
  },

  // —— v1.1 actions ——
  dismissWarning: (id) => {
    const cur = get().dismissedWarnings;
    if (cur.includes(id)) return;
    const next = [...cur, id];
    localStorage.setItem(LS_DISMISSED_WARNINGS, JSON.stringify(next));
    set({ dismissedWarnings: next });
  },
  resetDismissedWarnings: () => {
    localStorage.removeItem(LS_DISMISSED_WARNINGS);
    set({ dismissedWarnings: [] });
  },
  // What-if 临时态：仅存内存，绝不调用 updateProfile/saveProfile（设计文档 §7.4）
  setTempProfile: (p) => set({ tempProfile: p }),
}));
