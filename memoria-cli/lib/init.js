#!/usr/bin/env node
/**
 * 初始化站点 — 交互式引导
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { ask, confirm, select } = require('./prompt');

function copyDir(src, dst) {
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

async function initSite(args) {
  // 1. 目标目录
  let targetDir = args[1];
  if (!targetDir) {
    targetDir = await ask('站点目录名（留空默认为 my-memoria-site）');
    if (!targetDir) targetDir = 'my-memoria-site';
  }
  targetDir = path.resolve(process.cwd(), targetDir);

  if (fs.existsSync(targetDir)) {
    console.log('\n⛔ 目录已存在，请指定其他名称或先删除。\n');
    process.exit(1);
  }

  console.log('\n📦 正在初始化 Memoria 站点...\n');

  // 2. 站点名称
  const siteName = await ask('站点名称（如 我的博客）');
  const siteNameFinal = siteName || 'My Memoria Site';

  // 3. 作者名
  const authorName = await ask('作者名');

  // 4. Git 初始化
  const initGit = await confirm('是否初始化 Git 仓库', true);

  // 5. 示例内容
  const installSamples = await confirm('是否安装示例内容（blog/vlog/photo 各一篇）', true);

  // 复制模板
  const templateDir = path.resolve(__dirname, '..', '..', 'memoria-site-template');
  if (!fs.existsSync(templateDir)) {
    console.error('Error: site-template not found');
    process.exit(1);
  }
  execSync(`cp -r "${templateDir}" "${targetDir}"`, { stdio: 'inherit' });

  // 写 package.json（覆盖站点名和作者）
  const pkgPath = path.join(targetDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.name = path.basename(targetDir).toLowerCase().replace(/\s+/g, '-');
  pkg.description = siteNameFinal;
  if (authorName) pkg.author = authorName;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  // 写 _config.yml
  const configPath = path.join(targetDir, '_config.yml');
  const configLines = [
    `name: "${siteNameFinal}"`,
    `author: "${authorName || ''}"`,
  ];
  if (fs.existsSync(configPath)) {
    const existing = fs.readFileSync(configPath, 'utf-8');
    // 保留 theme 行
    const themeMatch = existing.match(/^theme:\s*(.+)$/m);
    if (themeMatch) configLines.push(`theme: ${themeMatch[1]}`);
  }
  fs.writeFileSync(configPath, configLines.join('\n') + '\n');

  // 复制内置主题到站点的 themes/ 目录
  const coreThemesDir = path.resolve(__dirname, '..', '..', 'memoria-core', 'themes');
  const templateThemesDir = path.resolve(__dirname, '..', '..', 'memoria-site-template', 'themes');
  const siteThemesDir = path.join(targetDir, 'themes');

  if (fs.existsSync(coreThemesDir)) {
    console.log('\n🎨 复制内置主题到站点...');
    copyDir(coreThemesDir, siteThemesDir);
    console.log('  ✓ dracula（默认主题）');
  }
  if (fs.existsSync(templateThemesDir)) {
    copyDir(templateThemesDir, siteThemesDir);
    const extraThemes = fs.readdirSync(templateThemesDir);
    console.log(`  ✓ ${extraThemes.join(', ')}（可选主题）`);
  }
  console.log('  用户自定义主题请放入 themes/ 目录');

  // 安装依赖
  console.log('\n📦 安装依赖...');
  execSync('npm install', { cwd: targetDir, stdio: 'inherit' });

  // Git 初始化
  if (initGit) {
    console.log('\n📁 初始化 Git 仓库...');
    execSync('git init', { cwd: targetDir, stdio: 'inherit' });
    execSync('git add .', { cwd: targetDir, stdio: 'inherit' });
    execSync('git commit -m "Initial commit"', { cwd: targetDir, stdio: 'inherit' });
  }

  // 示例内容
  if (installSamples) {
    console.log('\n📝 添加示例内容...');
    const cliPath = path.join(targetDir, 'node_modules', 'memoria-core', 'scripts', 'cli.js');
    if (fs.existsSync(cliPath)) {
      try {
        execSync(`node "${cliPath}" new:blog "Welcome to My Blog"`, { cwd: targetDir, stdio: 'inherit' });
        execSync(`node "${cliPath}" new:vlog "My First Vlog"`, { cwd: targetDir, stdio: 'inherit' });
        execSync(`node "${cliPath}" new:photo "Beautiful Sunset"`, { cwd: targetDir, stdio: 'inherit' });
      } catch (e) {
        console.log('  (示例内容安装跳过)');
      }
    }
  }

  // 完成提示
  console.log('\n✅ 初始化完成！\n');
  showGuide(targetDir, siteNameFinal, installSamples, initGit);
}

function showGuide(targetDir, siteName, hasSamples, hasGit) {
  const rel = path.relative(process.cwd(), targetDir);
  console.log('━'.repeat(50));
  console.log(`  🚀 ${siteName} 快速开始指南\n`);
  console.log('  进入站点目录:');
  console.log(`    cd ${rel}`);
  console.log('\n  基本命令:');
  console.log('    memoria new blog "文章标题"   # 新建博客文章');
  console.log('    memoria new vlog "视频标题"    # 新建视频日志');
  console.log('    memoria new photo "照片标题"  # 新建照片集');
  console.log('    memoria generate              # 构建静态文件');
  console.log('    memoria server                # 本地预览 + 热重载');
  if (hasSamples) {
    console.log('\n  已安装示例，可直接预览:');
    console.log('    memoria server');
  }
  if (hasGit) {
    console.log('\n  Git 已初始化，已有初始提交。');
  }
  console.log('\n  部署:');
  console.log('    memoria deploy               # 交互式选择部署目标');
  console.log('\n  文档: https://github.com/your-org/memoria');
  console.log('━'.repeat(50));
}

module.exports = { initSite };