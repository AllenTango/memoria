/**
 * Memoria CLI - Entry Point
 * Supports both traditional commands and TUI slash commands
 */
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
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
import { addRecentProject, isMemoriaProject, getProjectName } from '../lib/recent';

// ── ESM compat ───────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types ─────────────────────────────────────────────────────────────────

interface ResolvedTheme {
  type: 'external' | 'user' | 'built-in';
  path: string;
}

interface Context {
  rootDir: string;
  currentTheme: string;
  resolvedTheme: ResolvedTheme;
  themeDir: string;
  outputDir: string;
  contentDir: string;
}

// ── Theme resolution (shared) ─────────────────────────────────────────────

const defaultTheme = 'dracula';

function resolveThemePath(themeName: string, siteRoot: string): ResolvedTheme | null {
  if (themeName.startsWith('/') || themeName.startsWith('~')) {
    const extPath = path.resolve(themeName.replace(/^~/, process.env.HOME || ''));
    return { type: 'external', path: extPath };
  }
  const userThemePath = path.join(siteRoot, 'themes', themeName);
  if (fs.existsSync(userThemePath) && fs.existsSync(path.join(userThemePath, 'template.html'))) {
    return { type: 'user', path: userThemePath };
  }
  const builtInPath = path.join(__dirname, '..', '..', 'themes', themeName);
  if (fs.existsSync(builtInPath) && fs.existsSync(path.join(builtInPath, 'template.html'))) {
    return { type: 'built-in', path: builtInPath };
  }
  return null;
}

// ── Context factory ────────────────────────────────────────────────────────

export function createContext(rootDir: string): Context {
  const themeArg = process.argv.includes('--theme')
    ? process.argv[process.argv.indexOf('--theme') + 1]
    : null;

  const themeConfigPath = path.join(rootDir, '.themerc');
  const savedTheme = fs.existsSync(themeConfigPath)
    ? fs.readFileSync(themeConfigPath, 'utf-8').trim()
    : null;
  const currentTheme = themeArg || savedTheme || defaultTheme;

  const resolvedTheme = resolveThemePath(currentTheme, rootDir);
  if (!resolvedTheme) {
    console.error('❌ 未找到主题: ' + currentTheme);
    process.exit(1);
  }

  const templateCheck = path.join(resolvedTheme.path, 'template.html');
  if (!fs.existsSync(templateCheck)) {
    console.error('❌ 主题验证失败: template.html 不存在');
    process.exit(1);
  }

  return {
    rootDir,
    currentTheme,
    resolvedTheme,
    themeDir: resolvedTheme.path,
    outputDir: path.join(rootDir, 'dist'),
    contentDir: path.join(rootDir, 'content'),
  };
}

// ── Root resolution ───────────────────────────────────────────────────────

export function resolveRootDir(): string {
  const rootArg = process.argv.includes('--root')
    ? process.argv[process.argv.indexOf('--root') + 1]
    : null;

  if (rootArg) return path.resolve(rootArg);

  // Start from cwd, not __dirname — __dirname points to the installed module location,
  // but the site root is wherever the user ran the command
  const defaultRootDir = process.cwd();
  const themercCheck = path.join(defaultRootDir, '.themerc');
  if (fs.existsSync(themercCheck)) return defaultRootDir;

  let up = path.dirname(defaultRootDir);
  while (up !== path.parse(up).root) {
    if (fs.existsSync(path.join(up, '.themerc'))) return up;
    up = path.dirname(up);
  }
  return defaultRootDir;
}

// ── Build command ─────────────────────────────────────────────────────────

async function buildCommand(args: string[], ctx: Context): Promise<void> {
  const { contentDir, rootDir, outputDir, themeDir, currentTheme, resolvedTheme } = ctx;

  const themeSourceType = resolvedTheme?.type || 'built-in';
  console.log(
    '🎯 Memoria build started (theme: ' + currentTheme +
    (themeSourceType !== 'built-in' ? ' [' + themeSourceType + ']' : '') +
    ')...'
  );

  const { blogs, vlogs, photos, all } = compileAllContent(contentDir);
  console.log(
    '📄 Compiled ' + blogs.length + ' blog(s), ' + vlogs.length + ' vlog(s), ' + photos.length + ' photo(s)'
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
    siteConfig.icon = iconMatch && iconMatch[1].trim() ? iconMatch[1].trim() : siteConfig.icon;
  }

  const template = fs.readFileSync(path.join(themeDir, 'template.html'), 'utf-8');

  const cssSource = path.join(themeDir, 'layout.css');
  const cssDest = path.join(outputDir, 'layout.css');
  if (fs.existsSync(cssSource)) { fs.copyFileSync(cssSource, cssDest); console.log('✅ Copied layout.css'); }

  const varSource = path.join(themeDir, 'colors.css');
  const varDest = path.join(outputDir, 'colors.css');
  if (fs.existsSync(varSource)) { fs.copyFileSync(varSource, varDest); console.log('✅ Copied colors.css'); }

  const publicSrc = path.join(rootDir, 'public');
  const publicDest = path.join(outputDir, 'public');
  if (fs.existsSync(publicSrc)) {
    ensureDir(publicDest);
    fs.cpSync(publicSrc, publicDest, { recursive: true });
    console.log('✅ Copied public/ (local resources)');
  } else {
    console.log('ℹ️  No public/ directory found — skipping local resource copy');
  }

  writeFile(path.join(outputDir, 'index.html'), renderIndex({ blogs, vlogs, photos, all, siteConfig }, template));
  console.log('✅ Generated index.html');

  writeFile(path.join(outputDir, 'blogs.html'), renderBlogs({ blogs, siteConfig }, template));
  console.log('✅ Generated blogs.html');

  writeFile(path.join(outputDir, 'vlogs.html'), renderVlogs({ vlogs, siteConfig }, template));
  console.log('✅ Generated vlogs.html');

  writeFile(path.join(outputDir, 'photos.html'), renderPhotos({ photos, siteConfig }, template));
  console.log('✅ Generated photos.html');

  writeFile(path.join(outputDir, 'about.html'), renderAbout({ aboutData, siteConfig }, template));
  console.log('✅ Generated about.html');

  ensureDir(path.join(outputDir, 'blog'));
  ensureDir(path.join(outputDir, 'vlog'));
  ensureDir(path.join(outputDir, 'photo'));

  for (const { items } of [{ items: blogs }, { items: vlogs }, { items: photos }]) {
    for (const item of items) {
      const dir = item.type === 'blog' ? 'blog' : item.type === 'vlog' ? 'vlog' : 'photo';
      const itemDir = path.join(outputDir, dir, slugify(item.title));
      ensureDir(itemDir);
      writeFile(path.join(itemDir, 'index.html'), renderDetail(item, items, template));
      console.log('✅ Generated ' + dir + '/' + slugify(item.title) + '/index.html');
    }
  }

  console.log('\n🚀 Build complete! Output in: ' + outputDir);
}

// ── Preview command ───────────────────────────────────────────────────────

async function previewCommand(args: string[], ctx: Context): Promise<void> {
  const { contentDir, rootDir, outputDir } = ctx;
  const PORT = 3000;

  const mimeTypes: Record<string, string> = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml',
  };

  const server = http.createServer((req, res) => {
    let filePath = path.join(outputDir, req.url === '/' ? 'index.html' : req.url);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      filePath = path.join(outputDir, 'index.html');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
  });

  server.listen(PORT, () => {
    console.log('\n🌐 Preview server running at http://localhost:' + PORT + '/');
    console.log('   Press Ctrl+C to stop\n');
    addRecentProject(rootDir);
  });

  // Build once before serving
  await buildCommand([], ctx);


  const watchMode = args.includes('--watch');
  if (watchMode && fs.existsSync(contentDir)) {
    fs.watch(contentDir, { recursive: true }, () => {
      console.log('\n🔄 Change detected, rebuilding...');
      buildCommand(args, ctx);
    });
  } else if (watchMode) {
    console.log('\n👀 Watch mode enabled (content/ not found, skipping file watch)');
  }

  // Keep process alive
  await new Promise(() => {});
}

// ── Help command ──────────────────────────────────────────────────────────

async function helpCommand(args: string[], ctx: Context): Promise<void> {
  console.log(`
📚 Memoria CLI

用法:
  memoria [命令] [选项]

命令:
  memoria build          构建站点
  memoria preview       启动预览服务器
  memoria preview --watch  监听文件变化
  memoria new [type] [title]  新建内容 (blog/vlog/photo)
  memoria --help        显示帮助

TUI 模式:
  memoria               打开 TUI 入口界面（交互式）
  memoria /new          新建站点
  memoria /open         打开已有站点

选项:
  --root <path>         指定站点根目录
  --theme <name>        指定主题

示例:
  memoria build
  memoria preview --watch
  memoria new blog "我的第一篇文章"
`);
}

// ── New content command ────────────────────────────────────────────────────

async function newContentCommand(args: string[], ctx: Context): Promise<void> {
  const { contentDir } = ctx;
  const type = args[0] || 'blog';
  const title = args.slice(1).join(' ') || '未命名';

  const typeMap: Record<string, string> = {
    blog: 'blogs', vlog: 'vlogs', photo: 'photos'
  };

  const dir = typeMap[type];
  if (!dir) {
    console.error('❌ 类型错误: blog / vlog / photo');
    return;
  }

  const targetDir = path.join(contentDir, dir);
  ensureDir(targetDir);

  const date = new Date().toISOString().split('T')[0];
  const slug = slugify(title);
  const fileName = date + '-' + slug + '.md';
  const filePath = path.join(targetDir, fileName);

  const frontmatter = [
    '---',
    'title: ' + title,
    'date: ' + date,
    '---',
    '',
    '# ' + title,
    ''
  ].join('\n');

  fs.writeFileSync(filePath, frontmatter);
  console.log('✅ 已创建: ' + filePath);

  // Open with editor if configured
  const editor = process.env.MEMORIA_EDITOR || process.env.EDITOR;
  if (editor) {
    console.log('\n📝 用编辑器打开...');
    
    spawn(editor, [filePath], { stdio: 'inherit' });
  }
}

export { buildCommand, previewCommand, newContentCommand };

async function main() {
  const args = process.argv.slice(2);
  const raw = args[0] || '';

  // No arguments → show TUI hub
  if (args.length === 0) {
    const rootDir = resolveRootDir();
    const hasProject = isMemoriaProject(rootDir);

    if (hasProject) {
      console.log('\n📂 当前项目: ' + getProjectName(rootDir) + ' (' + rootDir + ')\n');
      addRecentProject(rootDir);
      await helpCommand([], createContext(rootDir));
    } else {
      const { showHub } = await import('./tui/hub');
        await showHub();
    }
    return;
  }

  // Slash commands (TUI commands)
  if (raw.startsWith('/')) {
    const cmd = raw.slice(1);
    const rootDir = resolveRootDir();

    switch (cmd) {
      case 'new':
      case 'open': {
        const { showHub } = await import('./tui/hub');
        await showHub();
        return;
      }
      case 'preview': {
        const ctx = createContext(rootDir);
        await previewCommand(args.slice(1), ctx);
        return;
      }
      case 'build': {
        const ctx = createContext(rootDir);
        await buildCommand(args.slice(1), ctx);
        return;
      }
      case 'help': {
        await helpCommand([], createContext(rootDir));
        return;
      }
      default:
        console.error('❌ 未知命令: /' + cmd);
        console.error('   使用 memoria --help 查看所有命令');
        return;
    }
  }

  // Traditional commands
  const rootDir = resolveRootDir();
  const ctx = createContext(rootDir);

  switch (raw) {
    case 'build':
      await buildCommand(args.slice(1), ctx);
      break;
    case 'preview':
      await previewCommand(args.slice(1), ctx);
      break;
    case 'new':
      await newContentCommand(args.slice(1), ctx);
      break;
    case '--help':
    case '-h':
      await helpCommand(args.slice(1), ctx);
      break;
    default:
      if (isMemoriaProject(rootDir)) {
        console.error('❌ 未知命令: ' + raw);
        console.error('   使用 memoria --help 查看所有命令');
      } else {
        console.error('❌ 未检测到 Memoria 项目');
        console.error('   请在项目目录下运行，或使用 /new 创建新站点');
      }
      process.exit(1);
  }
}

// Only run main() when this file is executed directly as src/index (not imported into bin bundle)
// When bundled, the URL ends with dist/bin/memoria.js, not dist/src/index.js
const isDirectRun = import.meta.url.endsWith('/dist/src/index.js') ||
                   import.meta.url.endsWith('/dist/src/index.ts');
if (isDirectRun) {
  main().catch(err => {
    console.error('❌ Error: ' + err.message);
    process.exit(1);
  });
}
