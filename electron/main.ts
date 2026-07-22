import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import Database from 'better-sqlite3';

let db: Database.Database;
let mainWindow: BrowserWindow | null = null;

function dbPath(): string {
  return join(app.getPath('userData'), 'firstbucket.db');
}

function initDb(): void {
  db = new Database(dbPath());
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS profile (id TEXT PRIMARY KEY, data TEXT, updatedAt TEXT);
    CREATE TABLE IF NOT EXISTS buckets (id TEXT PRIMARY KEY, data TEXT);
  `);
}

ipcMain.handle('profile:get', () => {
  const row = db.prepare('SELECT data FROM profile WHERE id = ?').get('singleton') as
    | { data: string }
    | undefined;
  return row ? JSON.parse(row.data) : null;
});

ipcMain.handle('profile:upsert', (_e, p) => {
  db.prepare('INSERT OR REPLACE INTO profile (id, data, updatedAt) VALUES (?, ?, ?)').run(
    'singleton',
    JSON.stringify(p),
    new Date().toISOString(),
  );
  return true;
});

ipcMain.handle('bucket:list', () => {
  const rows = db.prepare('SELECT data FROM buckets').all() as { data: string }[];
  return rows.map((r) => JSON.parse(r.data));
});

ipcMain.handle('bucket:upsert', (_e, b) => {
  db.prepare('INSERT OR REPLACE INTO buckets (id, data) VALUES (?, ?)').run(b.id, JSON.stringify(b));
  return true;
});

ipcMain.handle('db:reset', () => {
  db.prepare('DELETE FROM profile').run();
  db.prepare('DELETE FROM buckets').run();
  return true;
});

// —— 窗口控制（T04 / B4，macOS 风格无边框顶栏）——
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});
ipcMain.handle('window:close', () => {
  mainWindow?.close();
});
ipcMain.handle('window:toggleMaximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#f5f7fa',
    title: 'FirstBucket',
    frame: false, // 全平台无边框 + 自定义 macOS 风格顶栏
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  // 外部 http(s) 链接用系统默认浏览器打开，避免 GitHub 等页面在应用内新窗加载
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  initDb();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
