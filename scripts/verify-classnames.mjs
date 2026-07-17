// 校验脚本：全仓库 .tsx 内引用的 className token 都必须在 styles.css 中定义。
// 用法：node scripts/verify-classnames.mjs
// 仅读取 .tsx 的 className/class 属性静态片段 + 模板字面量静态片段，
// 跳过含插值(${})或动态拼接前缀（如 badge-）的 token，避免误报。
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RENDERER = join(ROOT, 'src', 'renderer');
const CSS = join(RENDERER, 'styles.css');

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (e.endsWith('.tsx')) out.push(p);
  }
  return out;
}

// —— 1. 收集 styles.css 中定义的 class token ——
const css = readFileSync(CSS, 'utf8');
const defined = new Set();
const dotRe = /\.(-?[a-zA-Z_][\w-]*)/g;
let m;
while ((m = dotRe.exec(css)) !== null) {
  // 排除明显是数值/伪类残余（如 .5 来自 0.5）
  if (/^\d/.test(m[1])) continue;
  defined.add(m[1]);
}

// —— 2. 从 tsx 提取 className / class 使用的 token ——
const used = new Map(); // token -> file:line[]
function addToken(tok, where) {
  if (!tok) return;
  if (tok.includes('$')) return; // 含插值，跳过
  if (/-$/.test(tok)) return; // 动态前缀（如 badge-），跳过
  if (/[{}<>()]/.test(tok)) return; // 非纯类名字面量，跳过
  if (!/^[a-zA-Z_-]/.test(tok)) return;
  if (!used.has(tok)) used.set(tok, []);
  if (!used.get(tok).includes(where)) used.get(tok).push(where);
}

const files = walk(RENDERER);
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const rel = f.replace(ROOT, '');
  const lines = src.split('\n');
  // 行级扫描：定位 className= / class= 出现的行号
  lines.forEach((line, i) => {
    const attrRe = /(?:className|class)\s*=/g;
    if (!attrRe.test(line)) return;
    const ln = i + 1;
    // 引号字符串 "..." 或 '...'
    const qRe = /(?:className|class)\s*=\s*["']([^"']*)["']/g;
    let q;
    while ((q = qRe.exec(line)) !== null) {
      q[1].split(/\s+/).forEach((t) => addToken(t, `${rel}:${ln}`));
    }
    // 模板字面量 `...`：提取 ${...} 之外的静态片段
    const tplRe = /(?:className|class)\s*=\s*`([^`]*)`/g;
    let t;
    while ((t = tplRe.exec(line)) !== null) {
      const lit = t[1].split(/\$\{[^}]*\}/).join(' ');
      lit.split(/\s+/).forEach((tk) => addToken(tk, `${rel}:${ln}`));
    }
  });
}

// —— 3. 报告未定义 token ——
const missing = [];
for (const [tok, locs] of used.entries()) {
  if (!defined.has(tok)) missing.push({ tok, locs });
}
missing.sort((a, b) => a.tok.localeCompare(b.tok));

console.log(`已扫描 .tsx 文件: ${files.length}`);
console.log(`styles.css 定义 class 数: ${defined.size}`);
console.log(`组件引用 class token 数: ${used.size}`);
console.log('');
if (missing.length === 0) {
  console.log('✅ PASS：所有引用的 className 均在 styles.css 中定义。');
  process.exit(0);
} else {
  console.log(`❌ FAIL：发现 ${missing.length} 个未定义的 className：`);
  for (const { tok, locs } of missing) {
    console.log(`  - .${tok}   (引用: ${locs.slice(0, 3).join(', ')}${locs.length > 3 ? ' …' : ''})`);
  }
  process.exit(1);
}
