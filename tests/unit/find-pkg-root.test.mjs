// 直接测 lib/paths.findPkgRoot 在三种安装布局下都能找到正确的包根
import { findPkgRoot } from '../../lib/paths.ts';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

let failures = 0;
const tmpRoot = path.join(os.tmpdir(), `memoria-findpkroot-${process.pid}`);
fs.rmSync(tmpRoot, { recursive: true, force: true });

// ── 场景 A: 模拟"全局安装",从 dist/cli.js 往上找
{
  const installRoot = path.join(tmpRoot, 'A', 'node_modules', 'memoria');
  fs.mkdirSync(path.join(installRoot, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(installRoot, 'package.json'), JSON.stringify({ name: 'memoria', version: '9.9.9' }));
  const start = path.join(installRoot, 'dist', 'cli.js');
  const got = findPkgRoot(start);
  console.log('场景A (全局安装)   :', got);
  if (path.normalize(got) !== path.normalize(installRoot)) { console.error('  FAIL: 期望', installRoot, '得到', got); failures++; }
}

// ── 场景 B: 模拟"lib/node_modules/memoria"(旧 npm link)
{
  const installRoot = path.join(tmpRoot, 'B', 'lib', 'node_modules', 'memoria');
  fs.mkdirSync(path.join(installRoot, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(installRoot, 'package.json'), JSON.stringify({ name: 'memoria', version: '9.9.9' }));
  const start = path.join(installRoot, 'dist', 'cli.js');
  const got = findPkgRoot(start);
  console.log('场景B (lib 嵌套)   :', got);
  if (path.normalize(got) !== path.normalize(installRoot)) { console.error('  FAIL'); failures++; }
}

// ── 场景 C: 模拟"开发态"(项目根 dist/cli.js)
{
  const installRoot = path.join(tmpRoot, 'C');
  fs.mkdirSync(path.join(installRoot, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(installRoot, 'package.json'), JSON.stringify({ name: 'memoria', version: '9.9.9' }));
  const start = path.join(installRoot, 'dist', 'cli.js');
  const got = findPkgRoot(start);
  console.log('场景C (开发态)     :', got);
  if (path.normalize(got) !== path.normalize(installRoot)) { console.error('  FAIL'); failures++; }
}

// ── 场景 D: 当前真实项目根
{
  const projectRoot = path.resolve('.');
  const start = path.join(projectRoot, 'dist', 'cli.js');
  const got = findPkgRoot(start);
  console.log('场景D (本项目)     :', got);
  if (path.normalize(got) !== path.normalize(projectRoot)) { console.error('  FAIL'); failures++; }
}

// ── 场景 E: 路径不存在 — 不应崩溃,应返回 fallback(上溯两级)
{
  const start = path.join(tmpRoot, 'E', 'dist', 'cli.js');
  const got = findPkgRoot(start);
  console.log('场景E (不存在)     :', got);
  if (!got) { console.error('  FAIL: 应该返回 fallback,而不是 undefined'); failures++; }
}

// 清理
fs.rmSync(tmpRoot, { recursive: true, force: true });

if (failures > 0) {
  console.error(`FAIL: ${failures} 个场景失败`);
  process.exit(1);
}
console.log('PASS: findPkgRoot 在所有安装布局下都正确');
