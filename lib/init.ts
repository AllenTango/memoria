/**
 * 初始化站点 — 非交互式（供 TUI 调用）
 */
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';
import { findPkgRoot } from './paths.js';

const SELF_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * 非交互式初始化（供 TUI 调用）
 * 不使用 ask/confirm/readline，避免在 ink stdin 下挂起
 * @param onLog 可选回调，将日志级别和消息传递给调用者（TUI）
 */
export async function initSiteNonInteractive(
  targetDir: string,
  siteName: string = 'My Memoria Site',
  authorName: string = 'Your Name',
  siteUrl: string = '',
  siteIcon: string = '',
  initGit: boolean = true,
  installSamples: boolean = true,
  theme: string = 'dracula',
  onLog?: (level: 'info' | 'warn' | 'error' | 'success', message: string) => void
): Promise<{ success: boolean; error?: string }> {
  const log = (level: 'info' | 'warn' | 'error' | 'success', message: string) => {
    if (onLog) onLog(level, message);
  };

  const PKG = findPkgRoot(SELF_DIR);
  const TEMPLATE_DIR = path.join(PKG, 'template');
  const THEMES_DIR = path.join(PKG, 'themes');

  log('info', '📦 正在初始化 Memoria 站点...');
  if (!fs.existsSync(TEMPLATE_DIR)) {
    log('error', `错误: site-template 未找到: ${TEMPLATE_DIR}`);
    return { success: false, error: 'site-template not found' };
  }

  try {
    // Windows 上没有 `cp` shell 命令,改用 Node 内置 fs.cpSync (Node 16.7+)
    // 不要用 shell `cp -r`,会因 cmd.exe 找不到 cp 而失败
    fs.cpSync(TEMPLATE_DIR, targetDir, { recursive: true, force: false, errorOnExist: true });
  } catch (e: any) {
    log('error', `复制模板失败: ${e.message}`);
    return { success: false, error: e.message };
  }

  // 写 package.json
  const pkgPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    pkg.name = path.basename(targetDir).toLowerCase().replace(/\s+/g, '-');
    pkg.description = siteName;
    if (authorName) pkg.author = authorName;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }

  // 写 _config.yml
  const configPath = path.join(targetDir, '_config.yml');
  fs.writeFileSync(configPath,
    `name: "${siteName}"
author: "${authorName || ''}"
url: "${siteUrl || ''}"
icon: "${siteIcon || ''}"
theme: ${theme}
`);

  // 复制内置主题
  const siteThemesDir = path.join(targetDir, 'themes');
  if (fs.existsSync(THEMES_DIR)) {
    log('info', '🎨 复制内置主题到站点...');
    // 统一用 fs.cpSync,跨平台一致(不再依赖手写 copyDir)
    try {
      fs.cpSync(THEMES_DIR, siteThemesDir, { recursive: true });
    } catch (e: any) {
      log('warn', `复制主题失败: ${e.message}`);
    }
    log('success', '  ✓ dracula, mint, nord, peach');
  }

  // 安装依赖
  log('info', '📦 安装依赖...');
  try {
    // Windows 上 npm 实际是 npm.cmd,Node 直接 spawn 'npm' 会 ENOENT
    // 走 shell:true 让 cmd.exe 处理 PATHEXT 解析
    execSync('npm install', { cwd: targetDir, stdio: 'pipe', shell: true });
  } catch (e: any) {
    log('error', `npm install 失败: ${e.message}`);
    return { success: false, error: e.message };
  }

  // Git 初始化
  if (initGit) {
    log('info', '📚 初始化 Git 仓库...');
    try {
      execSync('git init', { cwd: targetDir, stdio: 'pipe', shell: true });
      execSync('git add .', { cwd: targetDir, stdio: 'pipe', shell: true });
      execSync('git commit -m "Initial commit"', { cwd: targetDir, stdio: 'pipe', shell: true });
      log('success', '  ✓ Git 仓库已初始化');
    } catch (e: any) {
      log('warn', `Git 初始化跳过: ${e.message}`);
    }
  }

  // 示例内容（template 自带 blog/vlog/photo 示例，无需重复创建）
  log('info', '📝 复制示例内容...');
  log('success', '  ✓ 示例内容已就位');

  log('success', `✓ ${siteName} 创建完成`);
  return { success: true };
}
