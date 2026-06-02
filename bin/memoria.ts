#!/usr/bin/env node
/**
 * Memoria CLI — 静态网站生成器
 * 入口文件
 */
import * as path from 'path';
import * as fs from 'fs';
import { checkNodeVersion } from '../lib/check-node.js';

// 工具函数
function isSiteDir(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'content')) && fs.existsSync(path.join(dir, '_config.yml'));
}

function findSiteDir(cwd: string): string | null {
  let dir = cwd;
  while (dir !== path.parse(dir).root) {
    if (isSiteDir(dir)) return dir;
    dir = path.dirname(dir);
  }
  return null;
}

// 参数解析
const args = process.argv.slice(2);
const firstArg = args[0];

// 版本和帮助检测
const PKG_ROOT = path.resolve(__dirname, '..', '..');
if (firstArg === '--version' || firstArg === '-v' || firstArg === 'version') {
  const pkgPath = path.join(PKG_ROOT, 'package.json');
  const { version } = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  console.log(`v${version}`);
  process.exit(0);
}

if (firstArg === '--help' || firstArg === '-h' || firstArg === 'help') {
  console.log(`Memoria CLI — 静态网站生成器

用法: memoria [options]

选项:
  memoria         进入 TUI 交互界面
  memoria -v      显示版本号
  memoria -h      显示帮助信息
  memoria upgrade 升级 memoria 全局 CLI

站点操作请在 TUI 内完成。`);
  process.exit(0);
}

// Node 版本检测
checkNodeVersion();

// 启动 TUI
async function runTUI(cwd: string): Promise<void> {
  const { showHub } = await import('../src/tui/hub.js');
  await showHub(cwd);
}

// build 和 preview：spawnSync 调用 dist/src/index.js（避免 ink/react 依赖污染）
if (firstArg === 'build' || firstArg === 'preview') {
  const { spawnSync } = await import('child_process');
  const selfExec = process.argv[1];
  // 找 memoria workspace 根目录（bin/memoria.js → dist/bin → dist → workspace）
  const execDir = path.dirname(path.dirname(selfExec)); // dist/bin 的父目录
  const indexPath = path.join(execDir, 'src', 'index.js');
  const result = spawnSync('node', [indexPath, firstArg, ...args.slice(1)], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
  process.exit(result.status ?? 0);
}

// 未知参数 → 拦截并提示
if (firstArg) {
  console.error(`错误: 未知的命令 '${firstArg}'`);
  console.error(`提示: 站点操作请运行 memoria 进入 TUI 界面`);
  console.error(`       使用 memoria -h 查看所有可用选项`);
  process.exit(1);
}

// 无参数 → TUI
runTUI(process.cwd()).catch((e: Error) => { console.error(e.message); process.exit(1); });