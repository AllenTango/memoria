/**
 * Memoria — 同步内置主题
 * 将 memoria 源码的内置主题同步到站点的 themes/
 */
import * as path from 'path';
import * as fs from 'fs';
import { ask } from './prompt';

const PKG_ROOT = path.resolve(__dirname, '..', '..');
const BUILT_IN_THEMES_DIR = path.join(PKG_ROOT, 'themes');

function copyDir(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function isBuiltInTheme(name: string): boolean {
  const themePath = path.join(BUILT_IN_THEMES_DIR, name);
  return fs.existsSync(themePath) && fs.statSync(themePath).isDirectory();
}

function getBuiltInThemeNames(): string[] {
  if (!fs.existsSync(BUILT_IN_THEMES_DIR)) return [];
  return fs.readdirSync(BUILT_IN_THEMES_DIR).filter(name => {
    const themePath = path.join(BUILT_IN_THEMES_DIR, name);
    return fs.statSync(themePath).isDirectory();
  });
}

async function syncSite(siteRoot: string): Promise<boolean> {
  const siteThemesDir = path.join(siteRoot, 'themes');
  const themercPath = path.join(siteRoot, '.themerc');

  // 读取当前使用的主题
  const currentTheme = fs.existsSync(themercPath)
    ? fs.readFileSync(themercPath, 'utf-8').trim()
    : 'dracula';

  const builtInNames = getBuiltInThemeNames();

  if (!builtInNames.length) {
    console.log('❌ 未找到内置主题，请确认 memoria 安装正确。');
    return false;
  }

  // 检测哪些内置主题已在站点 themes/ 中存在
  const existingBuiltIn = builtInNames.filter(name =>
    fs.existsSync(path.join(siteThemesDir, name))
  );

  // 检测哪些内置主题在站点中被修改过（与源码不一致）
  const modifiedThemes: string[] = [];
  for (const name of existingBuiltIn) {
    const srcColors = path.join(BUILT_IN_THEMES_DIR, name, 'colors.css');
    const dstColors = path.join(siteThemesDir, name, 'colors.css');
    if (fs.existsSync(srcColors) && fs.existsSync(dstColors)) {
      const srcHash = fs.readFileSync(srcColors, 'utf-8');
      const dstHash = fs.readFileSync(dstColors, 'utf-8');
      if (srcHash !== dstHash) {
        modifiedThemes.push(name);
      }
    }
  }

  const siteName = path.basename(siteRoot);

  console.log(`\n📦 站点: ${siteName}`);
  console.log(`   当前主题: ${currentTheme}`);
  console.log(`\n━━ 内置主题更新状态 ━━`);
  for (const name of builtInNames) {
    const isCurrent = name === currentTheme;
    const isModified = modifiedThemes.includes(name);
    let flag = '';
    if (isCurrent) flag = ' ◀ 当前使用';
    else if (isModified) flag = ' ✎ 曾被修改';
    console.log(`  ${name}${flag}`);
  }

  if (!existingBuiltIn.length) {
    console.log('\n站点尚未安装内置主题，将执行完整同步。');
  }

  if (modifiedThemes.length > 0) {
    console.log(`\n⚠️   以下主题在站点中被修改过，更新将覆盖这些修改：`);
    for (const name of modifiedThemes) {
      const isCurrent = name === currentTheme;
      const marker = isCurrent ? ' [当前使用]' : '';
      console.log(`  - ${name}${marker}`);
    }
  }

  if (modifiedThemes.includes(currentTheme)) {
    console.log(`\n⚠️  警告：当前使用的主题 "${currentTheme}" 已被修改！`);
    console.log(`   继续将用最新版覆盖，是否确认？ [y/N]`);
    const confirm = await ask('> ');
    if (confirm !== 'y' && confirm !== 'yes') {
      console.log('已取消。');
      return false;
    }
  } else if (existingBuiltIn.length > 0) {
    console.log(`\n将同步 ${existingBuiltIn.length} 个内置主题到站点，是否继续？ [Y/n]`);
    const confirm = await ask('> ');
    if (confirm === 'n' || confirm === 'no') {
      console.log('已取消。');
      return false;
    }
  }

  console.log('\n🔄 正在同步内置主题...');

  // 创建 themes 目录（如不存在）
  if (!fs.existsSync(siteThemesDir)) {
    fs.mkdirSync(siteThemesDir, { recursive: true });
  }

  // 复制所有内置主题
  for (const name of builtInNames) {
    const src = path.join(BUILT_IN_THEMES_DIR, name);
    const dst = path.join(siteThemesDir, name);
    copyDir(src, dst);
    console.log(`  ✓ ${name}`);
  }

  console.log('\n✅ 内置主题已全部同步到站点。');
  console.log('   运行 `memoria generate` 重新构建站点。\n');

  return true;
}

export { syncSite };