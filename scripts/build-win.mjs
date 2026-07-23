// Plan A 构建脚本（Windows 桌面端）
// 1) vite 构建渲染进程 + 主进程
// 2) electron-builder --win dir（win.signAndEditExecutable=false 跳过签名与资源编辑，
//    彻底规避 winCodeSign / macOS 符号链接问题；图标与版本信息由本脚本后续用 rcedit 注入）
// 3) 用项目内 rcedit 把梨子图标注入 exe
// 4) 将 win-unpacked 整体复制到交付物根目录（保持 resources/ 结构，确保 exe 可运行）
// 5) 额外把 better_sqlite3.node 复制到交付物根目录（便于核查）

import { spawnSync } from 'node:child_process';
import { cpSync, copyFileSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'electron-builder';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
// 版本号统一从 package.json 读取，避免手动打包时忘记同步 exe 文件版本
const APP_VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')).version;
const RELEASE = join(ROOT, 'release', 'win-unpacked');
const DELIVER = 'C:/Users/Admin/Desktop/vibe coding产出/FirstBucket_v2.0_交付物';
const ICON = join(ROOT, 'build-resources', 'icon.ico');
const RCEDIT = join(ROOT, 'build-tools', 'rcedit-x64.exe');
const EXE = join(RELEASE, 'FirstBucket.exe');
const NATIVE = join(RELEASE, 'resources', 'app.asar.unpacked', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');

process.chdir(ROOT);

function run(cmd, args = [], opts = {}) {
  // Windows 下路径含空格（如 "vibe coding产出"）时必须加引号，否则 cmd.exe 会按空格截断
  const { allowedExitCodes = [0], ...spawnOpts } = opts;
  const quote = (s) => /[ \t"&|<>()]/.test(String(s)) ? `"${String(s).replace(/"/g, '\\"')}"` : String(s);
  const full = [quote(cmd), ...args.map(quote)].join(' ');
  console.log(`\n▶ ${full}`);
  const r = spawnSync(full, { stdio: 'inherit', shell: true, ...spawnOpts });
  if (!allowedExitCodes.includes(r.status)) {
    console.error(`✗ 步骤失败: ${cmd} (exit ${r.status})`);
    process.exit(1);
  }
}

function assert(p, msg) {
  if (!existsSync(p)) {
    console.error(`✗ 缺失必要文件: ${p}\n${msg || ''}`);
    process.exit(1);
  }
}

async function main() {
  // 前置检查
  assert(ICON, 'icon.ico 不存在');
  assert(RCEDIT, 'rcedit-x64.exe 不存在');

  // 1. vite 构建
  run('npm', ['run', 'build']);

  // 2. electron-builder 打包（dir 目标；package.json 的 win.signAndEditExecutable=false
  //    已让 electron-builder 跳过「资源编辑+签名」，从而不会去下载 winCodeSign / 创建 macOS 符号链接）
  console.log('\n▶ electron-builder --win dir (signAndEditExecutable=false → 跳过签名)');
  await build({ publish: 'never' });

  // 3. 检查构建产物
  assert(EXE, '打包后未找到 FirstBucket.exe');
  console.log('✓ 构建产物就绪:', EXE);

  // 4. rcedit 注入梨子图标 + 版本信息（electron-builder 已跳过其自带资源编辑，这里补齐）
  run(RCEDIT, [
    '--set-icon', ICON,
    '--set-version-string', 'FileDescription', 'FirstBucket',
    '--set-version-string', 'ProductName', 'FirstBucket',
    '--set-file-version', APP_VERSION,
    '--set-product-version', APP_VERSION,
    EXE,
  ]);

  // 5. 清理交付物中旧的应用产物，再整体复制（保持 resources/ 结构）
  //    复制用 robocopy 而非 Node cpSync：大文件递归复制时 cpSync 易触发段错误，robocopy 更稳
  for (const f of ['FirstBucket.exe', 'resources', 'locales']) {
    const target = join(DELIVER, f);
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  }
  console.log(`\n▶ robocopy win-unpacked → ${DELIVER}`);
  run('robocopy', [RELEASE, DELIVER, '/E', '/R:1', '/W:1', '/NFL', '/NDL'], { allowedExitCodes: [0, 1, 2, 3] });

  // 6. 额外复制原生模块到交付物根目录（便于核查）
  if (existsSync(NATIVE)) {
    copyFileSync(NATIVE, join(DELIVER, 'better_sqlite3.node'));
    console.log('✓ 已复制 better_sqlite3.node 到交付物根目录');
  } else {
    console.warn('⚠ 未找到 better_sqlite3.node，跳过根目录复制');
  }

  console.log('\n✅ 构建完成。交付物路径：');
  console.log('   ', join(DELIVER, 'FirstBucket.exe'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
