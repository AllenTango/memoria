/**
 * Memoria CLI 极简入口 — 启动 < 200ms
 *
 * 设计:不 import 任何业务模块(React/Ink/gray-matter/marked)
 *  - -v / -h: 直接读 package.json 输出
 *  - 其他: 动态 import('./cli-tui.js') 走 TUI 路径(esbuild code splitting)
 *
 * 这样 shim 引用 cli.js 也立即响应 -v,无需 npm link 重建 shim
 */
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

function selfDir(): string {
  if (process.argv[1]) {
    try {
      // 跟随 symlink — Linux 上 npm install 建 symlink(<prefix>/bin/memoria →
      // <prefix>/lib/node_modules/memoria/dist/cli.js),arg[1] 系 symlink path
      // 唔跟会指向 <prefix>/bin (冇 cli-tui*.js + package.json 找不到 → vunknown)
      const realPath = fs.realpathSync(process.argv[1]);
      return path.dirname(path.resolve(realPath));
    } catch {
      // realpath 失败时(罕见)fallback to argv[1] 原值
      return path.dirname(path.resolve(process.argv[1]));
    }
  }
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
}

function readVersion(): string {
  const pkgPath = path.join(selfDir(), '..', 'package.json');
  try {
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg && typeof pkg.version === 'string') return pkg.version;
    }
  } catch {}
  return 'unknown';
}

const args = process.argv.slice(2);
const firstArg = args[0];

// 极快速路径(直接返回)
if (firstArg === '--version' || firstArg === '-v' || firstArg === 'version') {
  console.log(`v${readVersion()}`);
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

// 其他命令: 走 TUI 路径(动态 import — esbuild 切包)
// esbuild 加 hash 后缀生成 cli-tui-XXXX.js,运行时按 glob 找匹配的 chunk
// 用 new Function 绕开 esbuild 静态分析(否则 esbuild 会把 cli-tui 的 import 提到 cli.js 主入口)
// 用 pathToFileURL 把 Windows 路径转成 file:// URL(Node ESM 不接受 c:\ 形式)
async function runTui(): Promise<void> {
  const SELF_DIR = selfDir();
  // 找匹配 cli-tui*.js 的 chunk(esbuild 切包后)
  const candidates = fs.readdirSync(SELF_DIR)
    .filter(f => f.startsWith('cli-tui') && f.endsWith('.js'));
  if (candidates.length === 0) {
    console.error('错误: 找不到 TUI 入口 dist/cli-tui*.js');
    process.exit(1);
  }
  const tuiPath = pathToFileURL(path.join(SELF_DIR, candidates[0])).href;
  const dynamicImport = new Function('specifier', 'return import(specifier)');
  const mod = await dynamicImport(tuiPath);
  await mod.runTuiApp(args);
}

runTui().catch(err => {
  console.error(err);
  process.exit(1);
});
