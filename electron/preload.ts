import { contextBridge, ipcRenderer } from 'electron';

// 渲染进程经此安全 API 访问主进程 SQLite，禁止直接 require('better-sqlite3')。
contextBridge.exposeInMainWorld('FirstBucket', {
  profile: {
    get: () => ipcRenderer.invoke('profile:get'),
    upsert: (p: unknown) => ipcRenderer.invoke('profile:upsert', p),
  },
  bucket: {
    list: () => ipcRenderer.invoke('bucket:list'),
    upsert: (b: unknown) => ipcRenderer.invoke('bucket:upsert', b),
  },
  db: {
    reset: () => ipcRenderer.invoke('db:reset'),
  },
  // 窗口控制（T04 / B4，macOS 风格无边框顶栏）
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
});
