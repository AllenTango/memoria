/**
 * Memoria CLI TUI 入口 — esbuild code splitting 后的独立 bundle
 *
 * 包含所有 TUI/Ink 依赖(React/Ink/gray-matter/marked),只在 `memoria` (无参数)、
 * `memoria upgrade` 等实际需要 TUI 或 lib 的命令时由 cli.js 动态 import
 */
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { checkNodeVersion } from '../lib/check-node.js';
import { findPkgRoot } from '../lib/paths.js';

/**
 * Windows 控制台 codepage 修正
 */
function fixWindowsConsoleEncoding(): void {
  if (process.platform !== 'win32') return;
  if (!process.stdout.isTTY) return;
  try {
    execSync('chcp 65001 >nul', { stdio: 'ignore', shell: 'cmd.exe' });
  } catch {
    /* ignore */
  }
}

function selfDir(): string {
  if (process.argv[1]) {
    // argv[1] 是 cli.js(memoria 主入口转过来的)
    return path.dirname(path.resolve(process.argv[1]));
  }
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
}

/**
 * 由 cli.js 调用,处理所有非 -v / -h 命令
 */
export async function runTuiApp(args: string[]): Promise<void> {
  fixWindowsConsoleEncoding();

  const SELF_DIR = selfDir();
  const PKG_ROOT = findPkgRoot(SELF_DIR);

  // Node 版本检测
  checkNodeVersion();

  const cmd = args[0];

  // ── 站点相关命令拦截 → 引导至 TUI ────────────────────────────────
  const siteCommands = ['build', 'preview', 'new', 'init', 'generate', 'deploy'];
  if (siteCommands.includes(cmd ?? '')) {
    console.error(`❌ '${cmd}' 是站点操作指令，请在 TUI 内使用`);
    console.error(`提示: 直接运行 'memoria' 进入 TUI 交互界面`);
    console.error(`或运行 'memoria -h' 查看所有可用选项`);
    process.exit(1);
  }

  // upgrade 命令（工具指令，直接执行）
  if (cmd === 'upgrade') {
    const { syncSite } = await import('../lib/upgrade.js');
    await syncSite(process.cwd());
    process.exit(0);
  }

  // 未知参数 → 报错
  if (cmd) {
    console.error(`错误: 未知的命令 '${cmd}'`);
    console.error(`提示: 使用 memoria -h 查看所有可用选项`);
    process.exit(1);
  }

  // 无参数 → TUI（ink + react）
  const { showApp } = await import('../tui/app.js');
  await showApp(process.cwd());
  process.exit(0);
}
