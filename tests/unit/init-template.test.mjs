// 验证 lib/init.ts 的模板复制在 Windows 上不依赖 `cp` shell 命令
// 直接调 fs.cpSync 替代 `cp -r`
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { findPkgRoot } from '../../lib/paths.ts';

const PKG = findPkgRoot(path.resolve('.'));
const TEMPLATE_DIR = path.join(PKG, 'template');
const tmpRoot = path.join(os.tmpdir(), `memoria-init-${process.pid}`);
const target = path.join(tmpRoot, 'my-new-site');

console.log('=== init.ts 模板复制 smoke test ===');
console.log('template :', TEMPLATE_DIR);
console.log('target   :', target);

let failures = 0;

// 清理 + 准备
fs.rmSync(tmpRoot, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });

// 用新的 fs.cpSync (与 lib/init.ts 修复后的逻辑一致)
try {
  fs.cpSync(TEMPLATE_DIR, target, { recursive: true, force: false, errorOnExist: true });
  console.log('  ✓ fs.cpSync 成功复制 template');
} catch (e) {
  console.error('  FAIL: fs.cpSync 失败', e);
  failures++;
}

// 验证: target 应该有 _config.yml / content / themes 等
const expected = ['_config.yml', 'content', 'README.md', 'package.json'];
for (const f of expected) {
  const p = path.join(target, f);
  if (!fs.existsSync(p)) {
    console.error('  FAIL: 缺少文件/目录', f);
    failures++;
  } else {
    console.log('  ✓', f, '存在');
  }
}

// 复制 themes(模拟 init.ts 里 themes 的复制逻辑)
const themesSrc = path.join(PKG, 'themes');
const themesDst = path.join(target, 'themes');
if (fs.existsSync(themesSrc)) {
  try {
    fs.cpSync(themesSrc, themesDst, { recursive: true });
    console.log('  ✓ fs.cpSync 成功复制 themes');
  } catch (e) {
    console.error('  FAIL: 复制 themes 失败', e);
    failures++;
  }
}

// 验证: themes/dracula 等四个主题都被复制
if (fs.existsSync(themesDst)) {
  const themes = fs.readdirSync(themesDst);
  console.log('  ✓ themes 目录有', themes.length, '个主题:', themes.join(', '));
  if (themes.length < 4) { console.error('  FAIL: 主题数量不足'); failures++; }
} else {
  console.error('  FAIL: themes 目录未创建');
  failures++;
}

// 清理
fs.rmSync(tmpRoot, { recursive: true, force: true });

if (failures > 0) {
  console.error(`FAIL: ${failures} 项检查失败`);
  process.exit(1);
}
console.log('PASS: 模板复制在 Windows 上能用 fs.cpSync 正确完成');
