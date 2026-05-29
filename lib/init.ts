/**
 * 初始化站点 — 交互式引导
 */
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { ask, confirm, select } from './prompt';

interface ThemeColors {
  bg?: string | null;
  accent?: string | null;
  heading?: string | null;
}

interface ThemeInfo {
  name: string;
  type: 'built-in' | 'user';
  path: string;
  colors?: ThemeColors | null;
}

interface SiteConfig {
  name?: string;
  author?: string;
  url?: string;
  icon?: string;
  theme?: string;
}

const PKG_ROOT = path.resolve(__dirname, '..', '..');

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

function createSampleContent(targetDir: string): void {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const blogPath = path.join(targetDir, 'content', 'blogs', `${dateStr}-welcome.md`);
  fs.writeFileSync(blogPath, [
    '---',
    'title: "Welcome to My Blog"',
    `date: "${new Date().toISOString().slice(0, 10)}"`,
    'tags: ["welcome"]',
    'type: "blog"',
    'description: "My first blog post"',
    '---',
    '',
    'Welcome to my new blog! This is a sample post.',
  ].join('\n'), 'utf-8');

  const vlogPath = path.join(targetDir, 'content', 'vlogs', `${dateStr}-my-first-vlog.md`);
  fs.writeFileSync(vlogPath, [
    '---',
    'title: "My First Vlog"',
    `date: "${new Date().toISOString().slice(0, 10)}"`,
    'tags: ["first"]',
    'type: "vlog"',
    'video: ""',
    'thumbnail: ""',
    'description: "My first video log"',
    '---',
    '',
    'My first vlog entry!',
  ].join('\n'), 'utf-8');

  const photoPath = path.join(targetDir, 'content', 'photos', `${dateStr}-beautiful-sunset.md`);
  fs.writeFileSync(photoPath, [
    '---',
    'title: "Beautiful Sunset"',
    `date: "${new Date().toISOString().slice(0, 10)}"`,
    'tags: ["nature"]',
    'type: "photo"',
    'photos: []',
    'description: ""',
    '---',
    '',
    '![Sunset](https://example.com/sunset.jpg)',
  ].join('\n'), 'utf-8');
}

async function initSite(args: [null, string, string?]): Promise<void> {
  const isInteractive = process.stdin.isTTY;
  const isCurrentDir = args[2] === 'current';  // true if called with `memoria init .`

  // 1. 目标目录
  let targetDir: string = args[1];
  if (!targetDir) {
    if (isInteractive) {
      targetDir = await ask('站点目录名（留空默认为 my-memoria-site）', [], 'my-memoria-site');
      if (!targetDir) targetDir = 'my-memoria-site';
    } else {
      targetDir = 'my-memoria-site';
    }
  }
  // targetDir 可能是绝对路径（来自 bin/memoria.js 的 '.' 或绝对路径）
  // 也可能是相对路径（用户输入的目录名）
  if (!path.isAbsolute(targetDir)) {
    targetDir = path.resolve(process.cwd(), targetDir);
  }

  // 跳过目录存在性检查（memoria init . 使用当前已存在目录）
  if (isCurrentDir) {
    if (fs.existsSync(path.join(targetDir, '_config.yml'))) {
      console.error('\nError: Current directory already has a _config.yml. Already a Memoria site?\n');
      process.exit(1);
    }
    console.log('\n📦 正在初始化 Memoria 站点...\n');
  } else if (fs.existsSync(targetDir)) {
    console.log('\n⛔ 目录已存在，请指定其他名称或先删除。\n');
    process.exit(1);
  }

  // 2. 站点名称和配置（仅交互模式）
  const defaultSiteName = 'My Memoria Site';
  const defaultAuthor = 'Your Name';
  let siteNameFinal = defaultSiteName;
  let authorName = defaultAuthor;
  let siteUrl = '';
  let siteIcon = '';

  if (isInteractive) {
    const siteName = await ask('站点名称（如 我的博客）', [], defaultSiteName);
    siteNameFinal = siteName || defaultSiteName;
    authorName = await ask('作者名', [], defaultAuthor);
    siteUrl = await ask('站点 URL（如 https://example.com）', [], '');
    siteIcon = await ask('站点图标（留空使用默认）', [], '');
  } else {
    console.log('  (非交互模式，使用默认值)\n');
  }

  // 4. Git 初始化
  const initGit = isInteractive ? await confirm('是否初始化 Git 仓库', true) : true;

  // 5. 示例内容
  const installSamples = isInteractive ? await confirm('是否安装示例内容（blog/vlog/photo 各一篇）', true) : true;

  // 复制模板（memoria init . 跳过后续步骤复用模板）
  const templateDir = path.join(PKG_ROOT, 'assets', 'site-template');
  if (!fs.existsSync(templateDir)) {
    console.error('Error: site-template not found');
    process.exit(1);
  }
  // 使用 templateDir/. 避免创建 site-template 子目录
  execSync(`cp -r "${templateDir}/." "${targetDir}"`, { stdio: 'pipe' });

  // 写 package.json（覆盖站点名和作者）
  const pkgPath = path.join(targetDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.name = path.basename(targetDir).toLowerCase().replace(/\s+/g, '-');
  pkg.description = siteNameFinal;
  if (authorName) pkg.author = authorName;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  // 写 _config.yml
  const configPath = path.join(targetDir, '_config.yml');
  const configLines: string[] = [
    `name: "${siteNameFinal}"`,
    `author: "${authorName || ''}"`,
    `url: "${siteUrl || ''}"`,
    `icon: "${siteIcon || ''}"`,
  ];
  if (fs.existsSync(configPath)) {
    const existing = fs.readFileSync(configPath, 'utf-8');
    const themeMatch = existing.match(/^theme:\s*(.+)$/m);
    if (themeMatch) configLines.push(`theme: ${themeMatch[1]}`);
  }
  fs.writeFileSync(configPath, configLines.join('\n') + '\n');

  // 复制内置主题到站点的 themes/ 目录
  const themesDir = path.join(PKG_ROOT, 'themes');
  const siteThemesDir = path.join(targetDir, 'themes');

  if (fs.existsSync(themesDir)) {
    console.log('\n🎨 复制内置主题到站点...');
    copyDir(themesDir, siteThemesDir);
    console.log('  ✓ dracula, mint, nord, peach');
  }
  console.log('  用户自定义主题请放入 themes/ 目录');

  // 安装依赖
  console.log('\n📦 安装依赖...');
  execSync('npm install', { cwd: targetDir, stdio: 'pipe' });

  // Git 初始化
  if (initGit) {
    console.log('\n📚 初始化 Git 仓库...');
    execSync('git init', { cwd: targetDir, stdio: 'pipe' });
    execSync('git add .', { cwd: targetDir, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: targetDir, stdio: 'pipe' });
    console.log('  ✓ Git 仓库已初始化');
  }

  // 示例内容（直接写文件，不依赖 CLI 交互）
  if (installSamples) {
    console.log('\n📝 创建示例内容...');
    createSampleContent(targetDir);
    console.log('  ✓ 示例内容已创建');
  }

  showGuide(targetDir, siteNameFinal, installSamples, initGit);
}

function showGuide(targetDir: string, siteName: string, hasSamples: boolean, hasGit: boolean): void {
  const rel = path.relative(process.cwd(), targetDir);

  console.log(`  🚀 ${siteName} 快速开始指南\n`);
  console.log(`  cd ${rel}`);
  console.log('  memoria generate    # 构建站点');
  console.log('  memoria server      # 本地预览');
  console.log('  memoria new blog "标题"   # 新建博客');
  console.log('  memoria new vblog "标题"   # 新建影像');
  console.log('  memoria new photo "标题"  # 新建相册');
  console.log('\n  ─────────────────────────────');
  console.log('  文档: https://github.com/AllenTango/memoria\n');
}

export { initSite };