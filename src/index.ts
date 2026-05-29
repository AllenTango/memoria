#!/usr/bin/env node
/**
 * Memoria Static Site Generator — Entry Point
 */
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import matter from 'gray-matter';
import { marked } from 'marked';
import { ensureDir, writeFile, slugify } from './utils';
import { compileAllContent, type CompiledItem } from './compiler';
import {
  renderIndex,
  renderBlogs,
  renderVlogs,
  renderPhotos,
  renderAbout,
  renderDetail,
} from './renderer';

// ── Site root resolution ────────────────────────────────────────────────

const rootArg = process.argv.includes('--root')
  ? process.argv[process.argv.indexOf('--root') + 1]
  : null;
const defaultRootDir = path.resolve(__dirname, '..');

let rootDir = rootArg || defaultRootDir;
if (!rootArg) {
  const themercCheck = path.join(rootDir, '.themerc');
  if (!fs.existsSync(themercCheck)) {
    let up = path.dirname(rootDir);
    while (up !== path.parse(up).root) {
      if (fs.existsSync(path.join(up, '.themerc'))) {
        rootDir = up;
        break;
      }
      up = path.dirname(up);
    }
  }
}

const contentDir = path.join(rootDir, 'content');

// ── Theme resolution ────────────────────────────────────────────────────

const defaultTheme = 'dracula';
const themeArg = process.argv.includes('--theme')
  ? process.argv[process.argv.indexOf('--theme') + 1]
  : null;

const themeConfigPath = path.join(rootDir, '.themerc');
const savedTheme = fs.existsSync(themeConfigPath)
  ? fs.readFileSync(themeConfigPath, 'utf-8').trim()
  : null;
const currentTheme = themeArg || savedTheme || defaultTheme;

interface ResolvedTheme {
  type: 'external' | 'user' | 'built-in';
  path: string;
}

function resolveThemePath(themeName: string, siteRoot: string): ResolvedTheme | null {
  if (themeName.startsWith('/') || themeName.startsWith('~')) {
    const extPath = path.resolve(themeName.replace(/^~/, process.env.HOME || ''));
    return { type: 'external', path: extPath };
  }
  const userThemePath = path.join(siteRoot, 'themes', themeName);
  if (
    fs.existsSync(userThemePath) &&
    fs.existsSync(path.join(userThemePath, 'template.html'))
  ) {
    return { type: 'user', path: userThemePath };
  }
  const builtInPath = path.join(__dirname, '..', 'themes', themeName);
  if (
    fs.existsSync(builtInPath) &&
    fs.existsSync(path.join(builtInPath, 'template.html'))
  ) {
    return { type: 'built-in', path: builtInPath };
  }
  return null;
}

const resolvedTheme = resolveThemePath(currentTheme, rootDir);
if (!resolvedTheme) {
  console.error(`❌ 未找到主题: ${currentTheme}`);
  console.error(`   请检查 themes/ 目录或 .themerc 配置。`);
  process.exit(1);
}
const themeDir = resolvedTheme.path;

const templateCheck = path.join(themeDir, 'template.html');
if (!fs.existsSync(templateCheck)) {
  console.error(`❌ 主题验证失败: template.html 不存在`);
  console.error(`   主题路径: ${themeDir}`);
  process.exit(1);
}

const outputDir = path.join(rootDir, 'dist');

// ── Build ──────────────────────────────────────────────────────────────

function build(): void {
  const themeSourceType = resolvedTheme ? resolvedTheme.type : 'built-in';
  console.log(
    `🎯 Memoria build started (theme: ${currentTheme}` +
    (themeSourceType !== 'built-in' ? ` [${themeSourceType}]` : '') +
    `)...`
  );

  const { blogs, vlogs, photos, all } = compileAllContent(contentDir);
  console.log(
    `📄 Compiled ${blogs.length} blog(s), ${vlogs.length} vlog(s), ${photos.length} photo(s)`
  );

  let aboutData: string | null = null;
  const aboutPath = path.join(contentDir, 'about.md');
  if (fs.existsSync(aboutPath)) {
    const raw = fs.readFileSync(aboutPath, 'utf-8');
    const parsed = matter(raw);
    aboutData = marked.parse(parsed.content) as string;
    console.log('📄 Compiled about.md');
  } else {
    console.log('ℹ️  No about.md found — about page will show placeholder');
  }

  ensureDir(outputDir);

  const configPath = path.join(rootDir, '_config.yml');
  let siteConfig: { name: string; icon: string } = {
    name: 'Memoria',
    icon: '/public/images/memoria-icon.png',
  };
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const nameMatch = configContent.match(/name:\s*"?([^"\n]+)"?/);
    const iconMatch = configContent.match(/icon:\s*"?([^"\n]+)"?/);
    siteConfig.name = nameMatch ? nameMatch[1] : siteConfig.name;
    siteConfig.icon =
      iconMatch && iconMatch[1].trim() ? iconMatch[1].trim() : siteConfig.icon;
  }

  let template = fs.readFileSync(path.join(themeDir, 'template.html'), 'utf-8');

  const cssSource = path.join(themeDir, 'layout.css');
  const cssDest = path.join(outputDir, 'layout.css');
  if (fs.existsSync(cssSource)) {
    fs.copyFileSync(cssSource, cssDest);
    console.log('✅ Copied layout.css');
  }

  const varSource = path.join(themeDir, 'colors.css');
  const varDest = path.join(outputDir, 'colors.css');
  if (fs.existsSync(varSource)) {
    fs.copyFileSync(varSource, varDest);
    console.log('✅ Copied colors.css');
  }

  const publicSrc = path.join(rootDir, 'public');
  const publicDest = path.join(outputDir, 'public');
  if (fs.existsSync(publicSrc)) {
    ensureDir(publicDest);
    fs.cpSync(publicSrc, publicDest, { recursive: true });
    console.log('✅ Copied public/ (local resources)');
  } else {
    console.log('ℹ️  No public/ directory found — skipping local resource copy');
  }

  const indexHtml = renderIndex({ blogs, vlogs, photos, all, siteConfig }, template);
  writeFile(path.join(outputDir, 'index.html'), indexHtml);
  console.log('✅ Generated index.html');

  const blogsHtml = renderBlogs({ blogs, siteConfig }, template);
  writeFile(path.join(outputDir, 'blogs.html'), blogsHtml);
  console.log('✅ Generated blogs.html');

  const vlogsHtml = renderVlogs({ vlogs, siteConfig }, template);
  writeFile(path.join(outputDir, 'vlogs.html'), vlogsHtml);
  console.log('✅ Generated vlogs.html');

  const photosHtml = renderPhotos({ photos, siteConfig }, template);
  writeFile(path.join(outputDir, 'photos.html'), photosHtml);
  console.log('✅ Generated photos.html');

  const aboutHtml = renderAbout({ aboutData, siteConfig }, template);
  writeFile(path.join(outputDir, 'about.html'), aboutHtml);
  console.log('✅ Generated about.html');

  ensureDir(path.join(outputDir, 'blog'));
  ensureDir(path.join(outputDir, 'vlog'));
  ensureDir(path.join(outputDir, 'photo'));

  const detailPages: { items: CompiledItem[] }[] = [
    { items: blogs },
    { items: vlogs },
    { items: photos },
  ];

  for (const { items } of detailPages) {
    for (const item of items) {
      const dir = item.type === 'blog' ? 'blog' : item.type === 'vlog' ? 'vlog' : 'photo';
      const itemDir = path.join(outputDir, dir, slugify(item.title));
      ensureDir(itemDir);
      const html = renderDetail(item, items, template);
      writeFile(path.join(itemDir, 'index.html'), html);
      console.log(`✅ Generated ${dir}/${slugify(item.title)}/index.html`);
    }
  }

  console.log(`\n🚀 Build complete! Output in: ${outputDir}`);
  console.log(
    `   ${blogs.length} blog(s) + ${vlogs.length} vlog(s) + ${photos.length} photo(s) + 5 pages`
  );
}

// ── Run ─────────────────────────────────────────────────────────────────

build();

// ── Watch mode ─────────────────────────────────────────────────────────

const watchMode = process.argv.includes('--watch');
if (watchMode) {
  const PORT = 3000;
  const distDir = path.join(rootDir, 'dist');

  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  };

  const server = http.createServer((req, res) => {
    let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      filePath = path.join(distDir, 'index.html');
    }
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });

  server.listen(PORT, () => {
    console.log(`\n🌐 Preview server running at http://localhost:${PORT}/`);
    console.log(`   Press Ctrl+C to stop\n`);
  });

  if (fs.existsSync(contentDir)) {
    fs.watch(contentDir, { recursive: true }, () => {
      console.log(`\n🔄 Change detected, rebuilding...`);
      build();
    });
  } else {
    console.log('\n👀 Watch mode enabled (content/ not found, skipping file watch)');
  }
}