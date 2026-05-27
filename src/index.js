#!/usr/bin/env node
/**
 * Memoria Static Site Generator — Entry Point
 */
const path = require('path');
const fs = require('fs');

const rootArg = process.argv.includes('--root')
  ? process.argv[process.argv.indexOf('--root') + 1]
  : null;
const defaultRootDir = path.resolve(__dirname, '..');

// Detect if there's a site root above / around this install
// If --root was passed, use it directly; otherwise look for .themerc to find site root
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

const defaultTheme = 'dracula';
const themeArg = process.argv.includes('--theme')
  ? process.argv[process.argv.indexOf('--theme') + 1]
  : null;

// Re-resolve themerc path after potential site-root walking
const themeConfigPath = path.join(rootDir, '.themerc');
const savedTheme = fs.existsSync(themeConfigPath) ? fs.readFileSync(themeConfigPath, 'utf-8').trim() : null;
const currentTheme = themeArg || savedTheme || defaultTheme;

// Resolve theme path: external path (absolute) → user themes/ → built-in themes/
function resolveThemePath(themeName, siteRoot) {
  // Absolute path (external theme)
  if (themeName.startsWith('/') || themeName.startsWith('~')) {
    const extPath = path.resolve(themeName.replace(/^~/, process.env.HOME || ''));
    return { type: 'external', path: extPath };
  }
  // User theme in site/themes/
  const userThemePath = path.join(siteRoot, 'themes', themeName);
  if (fs.existsSync(userThemePath) && fs.existsSync(path.join(userThemePath, 'template.html'))) {
    return { type: 'user', path: userThemePath };
  }
  // Built-in theme
  const builtInPath = path.join(__dirname, '..', 'themes', themeName);
  if (fs.existsSync(builtInPath) && fs.existsSync(path.join(builtInPath, 'template.html'))) {
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

// Validate template.html presence
const templateCheck = path.join(themeDir, 'template.html');
if (!fs.existsSync(templateCheck)) {
  console.error(`❌ 主题验证失败: template.html 不存在`);
  console.error(`   主题路径: ${themeDir}`);
  process.exit(1);
}

const outputDir = path.join(rootDir, 'dist');

const { ensureDir, writeFile, slugify } = require('./utils');
const { compileAllContent } = require('./compiler');
const {
  renderIndex,
  renderBlogs,
  renderVlogs,
  renderPhotos,
  renderAbout,
  renderDetail,
} = require('./renderer');

const watchMode = process.argv.includes('--watch');

function build() {
  const themeSourceType = resolvedTheme ? resolvedTheme.type : 'built-in';
  console.log(`🎯 Memoria build started (theme: ${currentTheme}` +
    (themeSourceType !== 'built-in' ? ` [${themeSourceType}]` : '') + `)...`);

  // Compile all content from blogs, vlogs, photos
  const { blogs, vlogs, photos, all } = compileAllContent(contentDir);
  console.log(`📄 Compiled ${blogs.length} blog(s), ${vlogs.length} vlog(s), ${photos.length} photo(s)`);

  // Compile about.md if it exists
  let aboutData = null;
  const aboutPath = path.join(contentDir, 'about.md');
  if (fs.existsSync(aboutPath)) {
    const matter = require('gray-matter');
    const raw = fs.readFileSync(aboutPath, 'utf-8');
    const parsed = matter(raw);
    const marked = require('marked');
    aboutData = require('marked').parse(parsed.content);
    console.log('📄 Compiled about.md');
  } else {
    console.log('ℹ️  No about.md found — about page will show placeholder');
  }

  // Ensure output directories
  ensureDir(outputDir);

  // Read site config
  const configPath = path.join(rootDir, '_config.yml');
  let siteConfig = { name: 'Memoria', icon: '/public/images/memoria-icon.png' };
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const nameMatch = configContent.match(/name:\s*"?([^"\n]+)"?/);
    const iconMatch = configContent.match(/icon:\s*"?([^"\n]+)"?/);
    siteConfig.name = nameMatch ? nameMatch[1] : siteConfig.name;
    siteConfig.icon = (iconMatch && iconMatch[1].trim()) 
      ? iconMatch[1].trim() 
      : siteConfig.icon;
  }

  // Read template
  let template = fs.readFileSync(path.join(themeDir, 'template.html'), 'utf-8');

  // Copy theme CSS
  const cssSource = path.join(themeDir, 'layout.css');
  const cssDest = path.join(outputDir, 'layout.css');
  if (fs.existsSync(cssSource)) {
    fs.copyFileSync(cssSource, cssDest);
    console.log('✅ Copied layout.css');
  }
  // Copy theme colors CSS
  const varSource = path.join(themeDir, 'colors.css');
  const varDest = path.join(outputDir, 'colors.css');
  if (fs.existsSync(varSource)) {
    fs.copyFileSync(varSource, varDest);
    console.log('✅ Copied colors.css');
  }

  // Copy public/ directory (local images, videos, files) to dist/
  const publicSrc = path.join(rootDir, 'public');
  const publicDest = path.join(outputDir, 'public');
  if (fs.existsSync(publicSrc)) {
    ensureDir(publicDest);
    fs.cpSync(publicSrc, publicDest, { recursive: true });
    console.log('✅ Copied public/ (local resources)');
  } else {
    console.log('ℹ️  No public/ directory found — skipping local resource copy');
  }

  // ── Homepage (index.html) — auto-redirect to about ─────────────
  const indexHtml = renderIndex({ blogs, vlogs, photos, all, siteConfig }, template);
  writeFile(path.join(outputDir, 'index.html'), indexHtml);
  console.log('✅ Generated index.html');

  // ── Blogs page ───────────────────────────────────────────────
  const blogsHtml = renderBlogs({ blogs, siteConfig }, template);
  writeFile(path.join(outputDir, 'blogs.html'), blogsHtml);
  console.log('✅ Generated blogs.html');

  // ── Vlogs page ───────────────────────────────────────────────
  const vlogsHtml = renderVlogs({ vlogs, siteConfig }, template);
  writeFile(path.join(outputDir, 'vlogs.html'), vlogsHtml);
  console.log('✅ Generated vlogs.html');

  // ── Photos page ──────────────────────────────────────────────
  const photosHtml = renderPhotos({ photos, siteConfig }, template);
  writeFile(path.join(outputDir, 'photos.html'), photosHtml);
  console.log('✅ Generated photos.html');

  // ── About page (from about.md) ────────────────────────────────
  const aboutHtml = renderAbout({ aboutData, siteConfig }, template);
  writeFile(path.join(outputDir, 'about.html'), aboutHtml);
  console.log('✅ Generated about.html');

  // ── Timeline page (独立页面，不在底部 Tab Bar) ──────────────────

  // ── Detail pages ─────────────────────────────────────────────
  ensureDir(path.join(outputDir, 'blog'));
  ensureDir(path.join(outputDir, 'vlog'));
  ensureDir(path.join(outputDir, 'photo'));

  const detailPages = [
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
  console.log(`   ${blogs.length} blog(s) + ${vlogs.length} vlog(s) + ${photos.length} photo(s) + 5 pages`);
}

build();

if (watchMode) {
  const http = require('http');
  const fs2 = require('fs');
  const path2 = require('path');

  const PORT = 3000;
  const distDir = path.join(rootDir, 'dist');

  const mimeTypes = {
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
    let filePath = path2.join(distDir, req.url === '/' ? 'index.html' : req.url);
    if (!fs2.existsSync(filePath) || !fs2.statSync(filePath).isFile()) {
      filePath = path2.join(distDir, 'index.html');
    }
    const ext = path2.extname(filePath);
    const contentType = mimeTypes[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': contentType });
    fs2.createReadStream(filePath).pipe(res);
  });

  server.listen(PORT, () => {
    console.log(`\n🌐 Preview server running at http://localhost:${PORT}/`);
    console.log(`   Press Ctrl+C to stop\n`);
  });

  // Watch content dir if it exists
  if (fs.existsSync(contentDir)) {
    fs.watch(contentDir, { recursive: true }, (eventType, filename) => {
      console.log(`\n🔄 Change detected: ${filename}, rebuilding...`);
      build();
    });
  } else {
    console.log('\n👀 Watch mode enabled (content/ not found, skipping file watch)');
  }
}