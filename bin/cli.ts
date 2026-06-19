/**
 * Memoria CLI 极简入口 — 启动 < 200ms
 *
 * 设计:不 import 任何业务模块(React/Ink/gray-matter/marked)
 *  - -v / -h: 直接读 package.json 输出
 *  - README 历史指令均支持 (generate/server/sync 作别名)
 *  - build/preview/bundle/deploy/new/init/upgrade/clean/theme: 直接执行
 *  - 其他: 动态 import('./cli-tui.js') 走 TUI 路径(esbuild code splitting)
 */
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

function selfDir(): string {
  if (process.argv[1]) {
    try {
      const realPath = fs.realpathSync(process.argv[1]);
      return path.dirname(path.resolve(realPath));
    } catch {
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

// ── README 历史指令别名映射 ────────────────────────────────────────────

const CMD_ALIAS: Record<string, string> = {
  generate: 'build',   // memoria generate → buildSite()
  server:   'preview', // memoria server → startPreview()
  sync:     'upgrade', // memoria sync → syncSite()
};

const KNOWN_COMMANDS = [
  // 实际命令
  'build', 'preview', 'bundle', 'deploy',
  'new', 'init', 'upgrade', 'clean', 'theme',
  // 别名
  'generate', 'server', 'sync',
];

// 解析命令（处理别名）
const rawCmd = firstArg ?? '';
const resolvedCmd = CMD_ALIAS[rawCmd] ?? rawCmd;

if (rawCmd && KNOWN_COMMANDS.includes(rawCmd)) {
  await runCliCommand(resolvedCmd, args.slice(1));
  process.exit(0);
}

// ── 极快速路径 ─────────────────────────────────────────────────────────

if (firstArg === '--version' || firstArg === '-v' || firstArg === 'version') {
  console.log(`v${readVersion()}`);
  process.exit(0);
}

if (firstArg === '--help' || firstArg === '-h' || firstArg === 'help') {
  console.log(`Memoria CLI — 静态网站生成器

用法: memoria [命令] [选项]

命令:
  memoria generate       构建静态文件到 dist/（同 build）
  memoria server        本地预览（http://localhost:3000）
  memoria clean         清理 dist/ 目录
  memoria bundle        构建并打包成 zip
  memoria deploy        部署站点
  memoria new <blog|vlog|photo> <标题>  新建内容
  memoria init [目录] [站点名]  初始化新站点
  memoria theme [list]  切换主题 / 列出可用主题
  memoria upgrade       同步内置主题到站点
  memoria sync          同步内置主题（upgrade 的别名）

选项:
  --theme <name>   指定主题（generate/server/bundle）
  memoria           进入 TUI 交互界面
  memoria -v        显示版本号
  memoria -h        显示帮助信息

示例:
  memoria
  memoria generate
  memoria server
  memoria new blog "我的第一篇文章"
  memoria init ./my-site "我的站点"`);
  process.exit(0);
}

// ── TUI 路径 ──────────────────────────────────────────────────────────

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

// ── CLI 命令实现 ──────────────────────────────────────────────────────

async function runCliCommand(cmd: string, restArgs: string[]): Promise<void> {
  // 解析目录参数（跳过 --theme 等选项）
  // 子命令名（不是目录路径，跳过 cwd 解析）
  const SUBCOMMANDS = ['list', 'new'];

  // 解析目录参数（跳过 --theme 等选项和子命令）
  const firstIsDir = restArgs[0]
    && !restArgs[0].startsWith('--')
    && !SUBCOMMANDS.includes(restArgs[0])
    && fs.existsSync(path.resolve(restArgs[0]));
  const cwd = firstIsDir ? path.resolve(restArgs[0]) : process.cwd();
  const actualArgs = firstIsDir ? restArgs.slice(1) : restArgs;

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
      const typeArg = actualArgs[0];
      const title = actualArgs.slice(1).join(' ') || '未命名';
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
      const targetDir = actualArgs[0] ? path.resolve(actualArgs[0]) : cwd;
      const siteName = actualArgs[1] || path.basename(targetDir);
      console.log('📦 初始化站点: ' + siteName + ' (' + targetDir + ')');
      const result = await initSiteNonInteractive(targetDir, siteName);
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
      const ok = await syncSite(cwd);
      console.log(ok ? '✅ 主题同步完成' : '⚠️  同步未完全成功，请检查权限');
      break;
    }

    case 'clean': {
      const distDir = path.join(cwd, 'dist');
      if (!fs.existsSync(distDir)) {
        console.log('✅ dist/ 目录不存在，无需清理');
        break;
      }
      fs.rmSync(distDir, { recursive: true, force: true });
      console.log('✅ 已清理 dist/');
      break;
    }

    case 'theme': {
      const { listThemes, pickTheme } = await import('../lib/theme.js');
      const sub = actualArgs[0];

      if (sub === 'list') {
        const { builtIn, user } = listThemes(cwd);
        console.log('🎨 可用主题:');
        builtIn.forEach(t => console.log('  📦 ' + t.name + ' (内置)'));
        user.forEach(t => console.log('  📁 ' + t.name + ' (自定义)'));
        break;
      }

      // 交互式选择
      console.log('🎨 切换主题（交互模式，请在终端中操作）...');
      try {
        const theme = await pickTheme(cwd);
        if (!theme) {
          console.log('已取消');
          break;
        }
        const { applyTheme } = await import('../lib/apply-theme.js');
        const result = applyTheme(cwd, theme);
        if (!result.success) {
          console.error('❌ 切换主题失败: ' + result.error);
          process.exit(1);
        }
        console.log('✅ 已切换到主题: ' + theme);
      } catch (e) {
        console.error('❌ 交互模式需要在终端中运行，请使用 TUI 模式 (memoria)');
        process.exit(1);
      }
      break;
    }
  }
}
