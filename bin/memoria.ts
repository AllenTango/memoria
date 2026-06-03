/**
 * Memoria CLI — 單一 bundle 入口
 * 動態 import 路由所有命令，無 spawnSync
 */
import * as path from 'path';
import * as fs from 'fs';
import { checkNodeVersion } from '../lib/check-node.js';

async function main() {
  // CLI 執行時 argv[1] 是 cli.js 的路徑（可能指向 symlink）
  // bin/memoria → lib/node_modules/memoria/dist/cli.js
  // 因此需要 bin/../lib/node_modules/memoria → 实际包根目录
  const SELF_PATH = process.argv[1] ? path.resolve(process.argv[1]) : null;
  const PKG_ROOT = SELF_PATH
    ? path.resolve(path.dirname(path.dirname(SELF_PATH)), 'lib', 'node_modules', 'memoria')
    : null;

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
  if (firstArg === '--version' || firstArg === '-v' || firstArg === 'version') {
    if (!PKG_ROOT) { console.error('無法確定安裝路徑'); process.exit(1); }
    const pkgPath = path.join(PKG_ROOT, 'package.json');
    const { version } = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    console.log(`v${version}`);
    process.exit(0);
  }

  if (firstArg === '--help' || firstArg === '-h' || firstArg === 'help') {
    console.log(`Memoria CLI — 静态网站生成器

用法: memoria [options]

选项:
  memoria          进入 TUI 交互界面
  memoria -v       显示版本号
  memoria -h       显示帮助信息
  memoria upgrade  同步内置主题到站点

站点操作（build/preview/new 等）请在 TUI 内完成。`);
    process.exit(0);
  }

  // Node 版本检测
  checkNodeVersion();

  const cmd = firstArg;

  // ── 站点相关命令拦截 → 引导至 TUI ────────────────────────────────
  const siteCommands = ['build', 'preview', 'new', 'init', 'generate', 'deploy'];
  if (siteCommands.includes(cmd)) {
    console.error(`❌ '${cmd}' 是站点操作指令，请在 TUI 内使用`);
    console.error(`提示: 直接运行 'memoria' 进入 TUI 交互界面`);
    console.error(`或运行 'memoria -h' 查看帮助`);
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

main().catch(err => {
  console.error(err);
  process.exit(1);
});
