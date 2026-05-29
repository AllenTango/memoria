#!/usr/bin/env node
/**
 * Memoria CLI — 静态网站生成器
 * 入口文件
 */
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { checkNodeVersion } from '../lib/check-node';
import { initSite } from '../lib/init';
import { deploy } from '../lib/deploy';
import { listThemes, pickTheme, createTheme } from '../lib/theme';
import { syncSite } from '../lib/upgrade';

// 3. 工具函数
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

// 4. 参数解析
const siteDir = findSiteDir(process.cwd());
const args = process.argv.slice(2);
const command = args[0];

// 5. 版本检测（使用 __dirname 定位项目根目录，不依赖 cwd）
const PKG_ROOT = path.resolve(__dirname, '..', '..');
if (args[0] === '--version' || args[0] === '-v') {
  const pkgPath = path.join(PKG_ROOT, 'package.json');
  const { version } = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  console.log(`v${version}`);
  process.exit(0);
}

// Run node version check
checkNodeVersion();

// 6. 命令映射
const commands: { [key: string]: () => void } = {
  init: () => {
    const cwd = process.cwd();
    const arg = args[1];

    if (arg) {
      const targetDir = path.resolve(cwd, arg);
      // Special case: memoria init . reuses the current (possibly non-empty) directory
      if (arg === '.') {
        if (fs.existsSync(path.join(cwd, '_config.yml'))) {
          console.error(`Error: Directory "${cwd}" already has a _config.yml. Already a Memoria site?`);
          process.exit(1);
        }
        initSite([null, cwd, 'current']);
      } else {
        if (fs.existsSync(targetDir)) {
          console.error(`Error: Directory "${targetDir}" already exists.`);
          process.exit(1);
        }
        initSite([null, targetDir]);
      }
    } else {
      if (fs.existsSync(path.join(cwd, '_config.yml'))) {
        console.error(`Error: Directory "${cwd}" already has a _config.yml. Already a Memoria site?`);
        process.exit(1);
      }
      initSite([null, cwd, 'current']);
    }
  },

  new: () => {
    if (!siteDir) { console.error('Error: Run this command inside a Memoria site directory.'); process.exit(1); }
    const cliPath = path.resolve(PKG_ROOT, 'dist', 'lib', 'cli-content');
    const subCmd = args[1];
    execSync(`node "${cliPath}" new:${subCmd}`, { cwd: siteDir, stdio: 'inherit', env: { ...process.env, MEMORIA_SITE_ROOT: siteDir } });
  },

  generate: () => {
    if (!siteDir) { console.error('Error: Run this command inside a Memoria site directory.'); process.exit(1); }
    const srcIndex = path.resolve(PKG_ROOT, 'dist', 'src', 'index');
    execSync(`node "${srcIndex}" --root "${siteDir}"`, { cwd: siteDir, stdio: 'inherit' });
  },

  server: () => {
    if (!siteDir) { console.error('Error: Run this command inside a Memoria site directory.'); process.exit(1); }
    const srcIndex = path.resolve(PKG_ROOT, 'dist', 'src', 'index');
    execSync(`node "${srcIndex}" --root "${siteDir}" --watch`, { cwd: siteDir, stdio: 'inherit' });
  },

  clean: () => {
    if (!siteDir) { console.error('Error: Run this command inside a Memoria site directory.'); process.exit(1); }
    const distDir = path.join(siteDir, 'dist');
    if (fs.existsSync(distDir)) {
      execSync(`rm -rf "${distDir}"`);
      console.log('Cleaned dist directory.');
    } else {
      console.log('dist directory already clean.');
    }
  },

  bundle: () => {
    if (!siteDir) { console.error('Error: Run this command inside a Memoria site directory.'); process.exit(1); }
    console.log('\n📦 打包中...\n');
    const srcIndex = path.resolve(PKG_ROOT, 'dist', 'src', 'index');
    execSync(`node "${srcIndex}" --root "${siteDir}"`, { cwd: siteDir, stdio: 'inherit' });
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const zipName = `memoria-${date}.zip`;
    const distDir = path.join(siteDir, 'dist');
    const zipPath = path.join(siteDir, zipName);
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    execSync(`cd "${distDir}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
    console.log(`\n✅ 打包完成: ${zipName}（${(fs.statSync(zipPath).size / 1024).toFixed(1)} KB）\n`);
  },

  theme: () => {
    if (!siteDir) { console.error('Error: Run this command inside a Memoria site directory.'); process.exit(1); }
    const sub = args[1];
    if (sub === 'new') {
      const name = args[2];
      if (!name) { console.error('Usage: memoria theme new <name>'); process.exit(1); }
      createTheme(name, siteDir);
      return;
    }
    if (sub === 'list') {
      const { builtIn, user } = listThemes(siteDir);
      console.log('\n🎨 可用主题\n');
      if (user.length) {
        console.log('━━ 用户主题 ━━');
        user.forEach(t => {
          console.log(`  [用户] ${t.name}`);
          if (t.colors && t.colors.bg) console.log(`         背景: ${t.colors.bg}`);
        });
      }
      console.log('\n━━ 内置主题 ━━');
      builtIn.forEach(t => {
        console.log(`  [内置] ${t.name}`);
        if (t.colors && t.colors.bg) console.log(`         背景: ${t.colors.bg}`);
      });
      console.log();
      return;
    }
    pickTheme(siteDir).then(chosen => {
      if (!chosen) return;
      const fs2 = fs;
      const path2 = path;
      const themercPath = path2.join(siteDir, '.themerc');
      fs2.writeFileSync(themercPath, chosen, 'utf-8');
      console.log(`\n✅ 主题已切换: ${chosen}`);
      console.log(`   下次 \`memoria generate\` 将使用该主题。\n`);
    }).catch((e: Error) => { console.error(e.message); process.exit(1); });
  },

  deploy: () => deploy(siteDir),

  upgrade: () => {
    console.log('\n🚀 正在升级 memoria 全局 CLI...\n');
    try {
      execSync('npm update -g memoria', { stdio: 'inherit' });
      console.log('\n✅ memoria 全局 CLI 已升级。\n');
    } catch (e) {
      console.error('\n❌ 升级失败，请检查 npm 权限或网络连接。\n');
      process.exit(1);
    }
  },

  sync: () => {
    if (!siteDir) { console.error('Error: Run this command inside a Memoria site directory.'); process.exit(1); }
    syncSite(siteDir).then(ok => {
      if (!ok) process.exit(1);
    }).catch((e: Error) => { console.error(e.message); process.exit(1); });
  },

  help: () => {
    console.log(`Memoria CLI — 静态网站生成器

用法: memoria <command>

命令:
  init      初始化新站点（交互式引导）
  new       新建内容（memoria new blog/vlog/photo <标题>）
  generate  构建站点
  bundle    构建 + 打包成 zip
  server    本地预览 + 热重载
  clean     清理 dist 目录
  theme     切换主题（交互式）
  theme new <name>  创建新主题
  theme list       列出所有可用主题
  deploy    交互式选择部署平台并配置
  upgrade   升级 memoria 全局 CLI（等同于 npm update -g memoria）
  sync      同步内置主题到当前站点

示例:
  memoria init my-blog
  memoria new blog "Hello World"
  memoria generate
  memoria bundle
  memoria server
  memoria theme
  memoria deploy
  memoria upgrade
  memoria sync`);
  },
};

// 6. 分发
if (commands[command]) {
  commands[command]();
} else if (!command || command === 'help') {
  commands.help();
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}