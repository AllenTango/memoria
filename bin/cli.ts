/**
 * Memoria CLI 极简入口 — 启动 < 200ms
 *
 * 设计:不 import 任何业务模块(React/Ink/gray-matter/marked)
 *  - -v / -h: 直接读 package.json 输出
 *  - build/preview/bundle/deploy/new/init: 直接执行 CLI 命令
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

// ── CLI 命令路由 ─────────────────────────────────────────────────────────

const KNOWN_COMMANDS = [
  'build', 'preview', 'bundle', 'deploy',
  'new', 'init', 'upgrade',
];

if (firstArg && KNOWN_COMMANDS.includes(firstArg)) {
  await runCliCommand(firstArg, args.slice(1));
  process.exit(0);
}

// ── 极快速路径(直接返回) ────────────────────────────────────────────────

if (firstArg === '--version' || firstArg === '-v' || firstArg === 'version') {
  console.log(`v${readVersion()}`);
  process.exit(0);
}

if (firstArg === '--help' || firstArg === '-h' || firstArg === 'help') {
  console.log(`Memoria CLI — 静态网站生成器

用法: memoria [命令] [选项]

命令:
  memoria build [路径]      构建站点（默认当前目录）
  memoria preview [路径]    构建并启动预览服务器
  memoria bundle [路径]     构建并打包（输出 dist.tar.gz）
  memoria deploy [路径]     部署站点到远程
  memoria new <blog|vlog|photo> <标题>  新建内容
  memoria init <目录> <站点名>  初始化新站点
  memoria upgrade [路径]     同步内置主题到站点

选项:
  --theme <name>   指定主题（build/preview/bundle）
  memoria          进入 TUI 交互界面
  memoria -v       显示版本号
  memoria -h       显示帮助信息

示例:
  memoria
  memoria build
  memoria new blog "我的第一篇文章"
  memoria init ./my-site "我的站点"`);
  process.exit(0);
}

// ── TUI 路径(动态 import — esbuild 切包) ────────────────────────────────

async function runTui(): Promise<void> {
  const SELF_DIR = selfDir();
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

// ── CLI 命令实现 ────────────────────────────────────────────────────────

async function runCliCommand(cmd: string, restArgs: string[]): Promise<void> {
  const cwd = restArgs[0] && !restArgs[0].startsWith('--')
    ? path.resolve(restArgs[0])
    : process.cwd();
  const remainingArgs = restArgs[0] && !restArgs[0].startsWith('--')
    ? restArgs.slice(1)
    : restArgs;

  switch (cmd) {
    case 'build': {
      const { buildSite } = await import('../lib/build.js');
      const result = buildSite({ rootDir: cwd });
      if (!result.success) {
        console.error('❌ 构建失败:');
        result.errors.forEach(e => console.error('  ' + e));
        process.exit(1);
      }
      console.log('✅ 构建完成: ' + result.outputDir);
      console.log(`   博客 ${result.stats?.blogs ?? 0} 篇 | 影像 ${result.stats?.vlogs ?? 0} 部 | 相册 ${result.stats?.photos ?? 0} 组 | 页面 ${result.stats?.pages ?? 0} 页`);
      break;
    }

    case 'preview': {
      const { startPreview } = await import('../lib/build.js');
      console.log('🟢 启动预览服务器（Ctrl+C 停止）...');
      // startPreview runs forever, never returns
      await startPreview({ rootDir: cwd });
      break;
    }

    case 'bundle': {
      const { bundleSite } = await import('../lib/build.js');
      const result = bundleSite({ rootDir: cwd });
      if (!result.success) {
        console.error('❌ 打包失败:');
        result.errors.forEach(e => console.error('  ' + e));
        process.exit(1);
      }
      console.log('✅ 打包完成: ' + result.outputDir);
      break;
    }

    case 'deploy': {
      const { deploy } = await import('../lib/deploy.js');
      console.log('🚀 开始部署...');
      await deploy(cwd);
      console.log('✅ 部署完成');
      break;
    }

    case 'new': {
      const { createContent } = await import('../lib/content.js');
      const typeArg = remainingArgs[0];
      const title = remainingArgs.slice(1).join(' ') || '未命名';
      const validTypes = ['blog', 'vlog', 'photo'];
      const type = validTypes.includes(typeArg) ? typeArg : 'blog';
      if (!validTypes.includes(typeArg)) {
        console.error('⚠️  未指定内容类型，默认 blog');
        console.error('   用法: memoria new blog "标题"');
      }
      const result = createContent(cwd, type as 'blog' | 'vlog' | 'photo', title);
      if (!result.success) {
        console.error('❌ ' + result.error);
        process.exit(1);
      }
      console.log('✅ 已创建: ' + result.path);
      break;
    }

    case 'init': {
      const { initSiteNonInteractive } = await import('../lib/init.js');
      const targetDir = remainingArgs[0] ? path.resolve(remainingArgs[0]) : cwd;
      const siteName = remainingArgs[1] || path.basename(targetDir);
      console.log('📦 初始化站点: ' + siteName + ' (' + targetDir + ')');
      const log = (level: string, msg: string) => console.log('  ' + msg);
      const result = await initSiteNonInteractive(targetDir, siteName, log);
      if (!result.success) {
        console.error('❌ 初始化失败: ' + result.error);
        process.exit(1);
      }
      console.log('✅ 站点创建完成: ' + targetDir);
      break;
    }

    case 'upgrade': {
      const { syncSite } = await import('../lib/upgrade.js');
      console.log('🎨 同步内置主题...');
      const log = (level: string, msg: string) => console.log('  ' + msg);
      await syncSite(cwd, log);
      console.log('✅ 主题同步完成');
      break;
    }
  }
}
