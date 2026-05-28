#!/usr/bin/env node
/**
 * Memoria CLI — 静态网站生成器
 * 入口文件
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const pathLib = path.resolve(__dirname, '..', 'lib');

// 1. 版本检测
require(path.join(pathLib, 'check-node'));

// 2. 加载复用模块
const { initSite } = require(path.join(pathLib, 'init'));
const { deploy } = require(path.join(pathLib, 'deploy'));
const { listThemes, pickTheme, createTheme } = require(path.join(pathLib, 'theme'));
const { syncSite } = require(path.join(pathLib, 'upgrade'));

// 3. 工具函数
function isSiteDir(dir) {
  return fs.existsSync(path.join(dir, 'content')) && fs.existsSync(path.join(dir, '_config.yml'));
}

function findSiteDir(cwd) {
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

// 5. 版本检测
if (args[0] === '--version' || args[0] === '-v') {
  const pkgPath = path.resolve(__dirname, '..', 'package.json');
  const { version } = require(pkgPath);
  console.log(`v${version}`);
  process.exit(0);
}

// 6. 命令映射
const commands = {
  init: () => {
    const cwd = process.cwd();
    const arg = args[1];
    
    if (arg) {
      // Init in specified directory (relative to cwd)
      const targetDir = path.resolve(cwd, arg);
      if (fs.existsSync(targetDir)) {
        console.error(`Error: Directory "${targetDir}" already exists.`);
        process.exit(1);
      }
      initSite([null, targetDir]);
    } else {
      // No arg = init in current directory
      if (fs.existsSync(path.join(cwd, '_config.yml'))) {
        console.error(`Error: Directory "${cwd}" already has a _config.yml. Already a Memoria site?`);
        process.exit(1);
      }
      initSite([null, cwd, 'current']);
    }
  },

  new: () => {
    if (!siteDir) { console.error('Error: Run this command inside a Memoria site directory.'); process.exit(1); }
    const cliPath = path.resolve(__dirname, '..', 'lib', 'cli-content.js');
    const subCmd = args[1];
execSync(`node "${cliPath}" new:${subCmd}`, { cwd: siteDir, stdio: 'inherit' });
  },

  generate: () => {
    if (!siteDir) { console.error('Error: Run this command inside a Memoria site directory.'); process.exit(1); }
    // Use the bundled CLI's src/index.js (no need for site npm install)
    const srcIndex = path.resolve(__dirname, '..', 'src', 'index.js');
    execSync(`node "${srcIndex}" --root "${siteDir}"`, { cwd: siteDir, stdio: 'inherit' });
  },

  server: () => {
    if (!siteDir) { console.error('Error: Run this command inside a Memoria site directory.'); process.exit(1); }
    const srcIndex = path.resolve(__dirname, '..', 'src', 'index.js');
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
    // Default: interactive pick
    pickTheme(siteDir).then(chosen => {
      if (!chosen) return;
      const fs = require('fs');
      const path = require('path');
      const themercPath = path.join(siteDir, '.themerc');
      fs.writeFileSync(themercPath, chosen, 'utf-8');
      console.log(`\n✅ 主题已切换: ${chosen}`);
      console.log(`   下次 \`memoria generate\` 将使用该主题。\n`);
    }).catch(e => { console.error(e.message); process.exit(1); });
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
    }).catch(e => { console.error(e.message); process.exit(1); });
  },

  help: () => {
    console.log(`Memoria CLI — 静态网站生成器

用法: memoria <command>

命令:
  init      初始化新站点（交互式引导）
  new       新建内容（memoria new blog/vlog/photo <标题>）
  generate  构建站点
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