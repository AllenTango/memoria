/**
 * lib/build.ts
 * 站点构建 — 副作用封装
 * 调用 core 层执行编译和渲染
 */
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { findPkgRoot } from './pkg-root.js';
import { compileAllContent, compileFile } from '../core/compiler.js';
import { renderIndex, renderBlogs, renderVlogs, renderPhotos, renderAbout, renderDetail } from '../core/renderer.js';
import { ensureDir, writeFile, slugify } from '../core/utils.js';
import { IS_WINDOWS, getHomeDir } from './paths.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface BuildOptions {
  rootDir: string;
  theme?: string;
}

export interface BuildResult {
  success: boolean;
  outputDir: string;
  errors: string[];
  stats?: { blogs: number; vlogs: number; photos: number; pages: number };
}

export interface Context {
  rootDir: string;
  currentTheme: string;
  themeDir: string;
  outputDir: string;
  contentDir: string;
}

// ── Context factory ────────────────────────────────────────────────────────

const defaultTheme = 'dracula';

export function createContext(rootDir: string): Context {
  const themeArg = process.argv.includes('--theme')
    ? process.argv[process.argv.indexOf('--theme') + 1]
    : null;

  const theme = resolveThemePath(themeArg || savedTheme(rootDir) || defaultTheme, rootDir);
  if (!theme) {
    throw new Error(`Theme not found: ${themeArg || savedTheme(rootDir) || defaultTheme}`);
  }

  const templateCheck = path.join(theme.path, 'template.html');
  if (!fs.existsSync(templateCheck)) {
    throw new Error('Theme validation failed: template.html not found');
  }

  return {
    rootDir,
    currentTheme: themeArg || savedTheme(rootDir) || defaultTheme,
    themeDir: theme.path,
    outputDir: path.join(rootDir, 'dist'),
    contentDir: path.join(rootDir, 'content'),
  };
}

function savedTheme(rootDir: string): string | null {
  const rc = path.join(rootDir, '.themerc');
  return fs.existsSync(rc) ? fs.readFileSync(rc, 'utf-8').trim() : null;
}

function resolveThemePath(name: string, siteRoot: string): { type: 'built-in' | 'user' | 'external'; path: string } | null {
  if (name.startsWith('/') || name.startsWith('~') || /^[a-zA-Z]:[\\/]/.test(name)) {
    const p = path.resolve(name.replace(/^~/, getHomeDir()));
    return fs.existsSync(path.join(p, 'template.html')) ? { type: 'external', path: p } : null;
  }
  const userPath = path.join(siteRoot, 'themes', name);
  if (fs.existsSync(path.join(userPath, 'template.html'))) return { type: 'user', path: userPath };
  const builtin = path.join(findPkgRoot(), 'themes', name);
  if (fs.existsSync(path.join(builtin, 'template.html'))) return { type: 'built-in', path: builtin };
  return null;
}

// ── Build ────────────────────────────────────────────────────────────────

export function buildSite(opts: BuildOptions): BuildResult {
  const { rootDir, theme: themeArg } = opts;
  const errors: string[] = [];

  const themeName = themeArg ?? savedTheme(rootDir) ?? 'dracula';
  const theme = resolveThemePath(themeName, rootDir);
  if (!theme) {
    return { success: false, outputDir: '', errors: [`Theme not found: ${themeName}`] };
  }

  const contentDir = path.join(rootDir, 'content');
  if (!fs.existsSync(contentDir)) {
    return { success: false, outputDir: '', errors: [`content/ not found in ${rootDir}`] };
  }

  const { blogs, vlogs, photos, all } = compileAllContent(contentDir);

  // 编译 about.md
  const aboutPath = path.join(contentDir, 'about.md');
  let aboutData: { html: string } | null = null;
  if (fs.existsSync(aboutPath)) {
    try {
      const compiled = compileFile(aboutPath, 'blog');
      aboutData = { html: compiled.content };
    } catch (e) {
      // about.md 解析失败不影响构建
    }
  }

  const outputDir = path.join(rootDir, 'dist');
  ensureDir(outputDir);

  const template = fs.readFileSync(path.join(theme.path, 'template.html'), 'utf-8');
  const siteConfig = loadSiteConfig(rootDir);

  copyThemeAssets(rootDir, theme.path, outputDir);

  writeFile(path.join(outputDir, 'index.html'), renderIndex({ blogs, vlogs, photos, all, siteConfig }, template));
  writeFile(path.join(outputDir, 'blogs.html'), renderBlogs({ blogs, siteConfig }, template));
  writeFile(path.join(outputDir, 'vlogs.html'), renderVlogs({ vlogs, siteConfig }, template));
  writeFile(path.join(outputDir, 'photos.html'), renderPhotos({ photos, siteConfig }, template));
  writeFile(path.join(outputDir, 'about.html'), renderAbout({ aboutData, siteConfig }, template));

  ensureDir(path.join(outputDir, 'blog'));
  ensureDir(path.join(outputDir, 'vlog'));
  ensureDir(path.join(outputDir, 'photo'));

  let pages = 5; // index + blogs + vlogs + photos + about
  for (const { items } of [{ items: blogs }, { items: vlogs }, { items: photos }]) {
    for (const item of items) {
      const dir = item.type === 'blog' ? 'blog' : item.type === 'vlog' ? 'vlog' : 'photo';
      const itemDir = path.join(outputDir, dir, slugify(item.title));
      ensureDir(itemDir);
      writeFile(path.join(itemDir, 'index.html'), renderDetail(item, items, template));
      pages++;
    }
  }

  return {
    success: true,
    outputDir,
    errors: [],
    stats: { blogs: blogs.length, vlogs: vlogs.length, photos: photos.length, pages },
  };
}

export async function startPreview(opts: BuildOptions): Promise<never> {
  const { rootDir } = opts;

  const result = buildSite(opts);
  if (!result.success) {
    console.error('Build failed:', result.errors.join(', '));
    process.exit(1);
  }

  const outputDir = result.outputDir;
  const PORT = 3000;

  const { createServer } = await import('http');
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml',
  };

  const server = createServer((req, res) => {
    let url = decodeURIComponent(req.url === '/' ? '/index.html' : req.url!);
    if (url.endsWith('/')) url = url.slice(0, -1);
    let filePath = path.join(outputDir, url);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    } else if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      filePath = path.join(outputDir, 'index.html');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
  });

  server.listen(PORT, () => {
    console.log(`\n🌐 Preview server running at http://localhost:${PORT}/\n`);
  });

  process.stdin.resume();
  return new Promise(() => {
    // 服务器运行中，永不返回
  });
}

export function bundleSite(opts: BuildOptions): BuildResult {
  const result = buildSite(opts);
  if (!result.success) return result;

  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const zipName = `memoria-${date}.zip`;
  const zipPath = path.join(opts.rootDir, zipName);

  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  if (IS_WINDOWS) {
    // Windows 没有 zip 命令,用 PowerShell 的 Compress-Archive(Win10/11 自带)
    // 注意:Compress-Archive 只能把单个源目录打包,所以先 cd 进去再打包内容
    // 解决路径含空格问题:用双引号包裹
    const psCmd = `Compress-Archive -Path "${result.outputDir}\\*" -DestinationPath "${zipPath}" -Force`;
    execSync(`powershell -NoProfile -NonInteractive -Command "${psCmd}"`, { stdio: 'inherit', shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh' });
  } else {
    execSync(`cd "${result.outputDir}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
  }

  return result;
}

// ── helpers ──────────────────────────────────────────────────────────────

function loadSiteConfig(rootDir: string): { name: string; icon: string } {
  const configPath = path.join(rootDir, '_config.yml');
  const defaults = { name: 'Memoria', icon: '/public/images/memoria-icon.png' };
  if (!fs.existsSync(configPath)) return defaults;
  const content = fs.readFileSync(configPath, 'utf-8');
  const nameMatch = content.match(/^name:\s*"?([^"\n]+)"?/m);
  const iconMatch = content.match(/^icon:\s*"?([^"\n]+)"?/m);
  return {
    name: nameMatch ? nameMatch[1] : defaults.name,
    icon: iconMatch && iconMatch[1].trim() ? iconMatch[1].trim() : defaults.icon,
  };
}

function copyThemeAssets(rootDir: string, themePath: string, outputDir: string): void {
  const cssSrc = path.join(themePath, 'layout.css');
  const cssDst = path.join(outputDir, 'layout.css');
  if (fs.existsSync(cssSrc)) fs.copyFileSync(cssSrc, cssDst);

  const varSrc = path.join(themePath, 'colors.css');
  const varDst = path.join(outputDir, 'colors.css');
  if (fs.existsSync(varSrc)) fs.copyFileSync(varSrc, varDst);

  const publicSrc = path.join(rootDir, 'public');
  const publicDst = path.join(outputDir, 'public');
  if (fs.existsSync(publicSrc)) {
    ensureDir(publicDst);
    fs.cpSync(publicSrc, publicDst, { recursive: true });
  }
}