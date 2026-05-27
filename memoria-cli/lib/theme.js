/**
 * Memoria Theme Management
 * - List available themes (built-in + user)
 * - Create new theme scaffold
 * - Preview theme colors
 */
const fs = require('fs');
const path = require('path');

const CLI_ROOT = path.resolve(__dirname, '..');  // memoria-cli
const CORE_ROOT = path.resolve(CLI_ROOT, '..', 'memoria-core');

const BUILT_IN_THEMES_DIR = path.join(CORE_ROOT, 'themes');

// ── Helpers ──────────────────────────────────────────────────────────

function isThemeDir(dir) {
  return fs.existsSync(path.join(dir, 'template.html'));
}

function readColors(dir) {
  const colorsPath = path.join(dir, 'colors.css');
  if (!fs.existsSync(colorsPath)) return null;
  const content = fs.readFileSync(colorsPath, 'utf-8');
  // Extract --nord-bg or any --*-bg variable as primary
  const bgMatch = content.match(/--[\w-]+-bg:\s*#([0-9a-fA-F]{6})/);
  const accentMatch = content.match(/--[\w-]+-accent:\s*#([0-9a-fA-F]{6})/);
  const headingMatch = content.match(/--[\w-]+-heading:\s*#([0-9a-fA-F]{6})/);
  return {
    bg: bgMatch ? '#' + bgMatch[1] : null,
    accent: accentMatch ? '#' + accentMatch[1] : null,
    heading: headingMatch ? '#' + headingMatch[1] : null,
  };
}

// ── List Themes ─────────────────────────────────────────────────────

function listThemes(siteRoot) {
  const userThemesDir = path.join(siteRoot, 'themes');
  const userDirExists = fs.existsSync(userThemesDir);

  const builtIn = fs.readdirSync(BUILT_IN_THEMES_DIR)
    .filter(d => fs.statSync(path.join(BUILT_IN_THEMES_DIR, d)).isDirectory() && isThemeDir(path.join(BUILT_IN_THEMES_DIR, d)))
    .map(name => ({
      name,
      type: 'built-in',
      path: path.join(BUILT_IN_THEMES_DIR, name),
      colors: readColors(path.join(BUILT_IN_THEMES_DIR, name)),
    }));

  const user = userDirExists
    ? fs.readdirSync(userThemesDir)
        .filter(d => fs.statSync(path.join(userThemesDir, d)).isDirectory() && isThemeDir(path.join(userThemesDir, d)))
        .map(name => ({
          name,
          type: 'user',
          path: path.join(userThemesDir, name),
          colors: readColors(path.join(userThemesDir, name)),
        }))
    : [];

  return { builtIn, user };
}

function printThemeCard(name, type, colors) {
  const badge = type === 'built-in' ? '[内置]' : '[用户]';
  console.log(`  ${badge} ${name}`);
  if (colors) {
    if (colors.bg)    console.log(`           背景: ${colors.bg}`);
    if (colors.accent) console.log(`           强调: ${colors.accent}`);
    if (colors.heading) console.log(`           标题: ${colors.heading}`);
  }
}

// ── Interactive Theme Picker ─────────────────────────────────────────

async function pickTheme(siteRoot) {
  const { builtIn, user } = listThemes(siteRoot);
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // Read current theme from .themerc
  const themercPath = path.join(siteRoot, '.themerc');
  const currentTheme = fs.existsSync(themercPath)
    ? fs.readFileSync(themercPath, 'utf-8').trim()
    : 'dracula';

  console.log('\n🎨 主题切换\n');
  if (user.length) {
    console.log('━━ 用户主题 ━━');
    user.forEach(t => printThemeCard(t.name, t.type, t.colors));
  }
  console.log('\n━━ 内置主题 ━━');
  builtIn.forEach(t => printThemeCard(t.name, t.type, t.colors));

  // Show external theme if set
  const themercContent = fs.existsSync(themercPath) ? fs.readFileSync(themercPath, 'utf-8') : '';
  const isExternal = themercContent.startsWith('/') || themercContent.startsWith('~');
  if (isExternal) {
    console.log('\n━━ 外部主题 ━━');
    console.log(`  [外部] ${themercContent} ${fs.existsSync(themercContent) ? '✓' : '✗ 不存在'}`);
  }

  console.log(`\n当前主题: ${currentTheme}`);

  const answer = await new Promise(r => rl.question('\n选择主题（或输入外部路径）: ', r));
  rl.close();
  const chosen = answer.trim();
  if (!chosen) { console.log('取消。'); return null; }
  return chosen;
}

// ── Create New Theme ─────────────────────────────────────────────────

function createTheme(name, siteRoot) {
  if (!name || !/^[a-z0-9_-]+$/i.test(name)) {
    console.error('❌ 主题名只能包含字母、数字、下划线、连字符。');
    return false;
  }

  const userThemesDir = path.join(siteRoot, 'themes');
  const themeDir = path.join(userThemesDir, name);

  if (fs.existsSync(themeDir)) {
    console.error(`❌ 主题已存在: ${themeDir}`);
    return false;
  }

  fs.mkdirSync(themeDir, { recursive: true });
  fs.mkdirSync(path.join(themeDir, 'assets'), { recursive: true });

  // template.html — minimal but complete template
  const templateHtml = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${name}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>{{PAGE_TITLE}}</title>
  <link rel="stylesheet" href="/layout.css" />
  <link rel="stylesheet" href="/colors.css" />
</head>
<body>
  <!-- Desktop Header Nav -->
  <header class="site-header" id="siteHeader">
    <a href="/" class="nav-brand">Memoria</a>
    <nav class="nav-links">
      <a href="/" class="nav-link{{HOME_ACTIVE}}">首页</a>
      <a href="/blogs.html" class="nav-link{{BLOGS_ACTIVE}}">随笔</a>
      <a href="/vlogs.html" class="nav-link{{VLOGS_ACTIVE}}">影像</a>
      <a href="/photos.html" class="nav-link{{PHOTO_ACTIVE}}">相册</a>
      <a href="/about.html" class="nav-link{{ABOUT_ACTIVE}}">关于</a>
    </nav>
  </header>

  <!-- Main Content -->
  <main class="main-content" id="mainContent">
    {{PAGE_CONTENT}}
  </main>

  <!-- Mobile Bottom Tab Navigation -->
  <nav class="bottom-nav" id="bottomNav">
    <a href="/" class="nav-tab{{HOME_ACTIVE}}" data-page="home">
      <i data-lucide="home"></i>
    </a>
    <a href="/blogs.html" class="nav-tab{{BLOGS_ACTIVE}}" data-page="blogs">
      <i data-lucide="align-left"></i>
    </a>
    <a href="/vlogs.html" class="nav-tab{{VLOGS_ACTIVE}}" data-page="vlogs">
      <i data-lucide="play-circle"></i>
    </a>
    <a href="/photos.html" class="nav-tab{{PHOTO_ACTIVE}}" data-page="photo">
      <i data-lucide="image"></i>
    </a>
    <a href="/about.html" class="nav-tab{{ABOUT_ACTIVE}}" data-page="about">
      <i data-lucide="user"></i>
    </a>
  </nav>

  <!-- Lightbox -->
  <div class="lightbox" id="lightbox" onclick="closeLightbox()">
    <button class="lightbox-close" aria-label="关闭">✕</button>
    <button class="lightbox-prev" onclick="event.stopPropagation(); lightboxNav(-1)">‹</button>
    <div class="lightbox-content" id="lightboxContent"></div>
    <button class="lightbox-next" onclick="event.stopPropagation(); lightboxNav(1)">›</button>
    <div class="lightbox-caption" id="lightboxCaption"></div>
  </div>

  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      if (window.lucide) lucide.createIcons();
    });

    var allPhotos = window.__memoriaPhotos = window.__memoriaPhotos || [];
    var currentPhoto = 0;

    function openLightbox(idx) {
      currentPhoto = idx;
      var lb = document.getElementById('lightbox');
      var content = document.getElementById('lightboxContent');
      var caption = document.getElementById('lightboxCaption');
      if (!lb || !content) return;
      content.innerHTML = '<img src="' + allPhotos[idx].url + '" alt="" loading="lazy">';
      caption.textContent = allPhotos[idx].caption || '';
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
      var lb = document.getElementById('lightbox');
      if (lb) lb.classList.remove('open');
      document.body.style.overflow = '';
    }
    function lightboxNav(dir) {
      currentPhoto = (currentPhoto + dir + allPhotos.length) % allPhotos.length;
      var content = document.getElementById('lightboxContent');
      var caption = document.getElementById('lightboxCaption');
      content.innerHTML = '<img src="' + allPhotos[currentPhoto].url + '" alt="" loading="lazy">';
      caption.textContent = allPhotos[currentPhoto].caption || '';
    }
    window.openLightbox = openLightbox;
    window.closeLightbox = closeLightbox;
    window.lightboxNav = lightboxNav;
  </script>
</body>
</html>`;

  // colors.css — starting from Nord palette, customizable
  const colorsCss = `/* ── ${name} Theme — Color Variables ────────────────────────────── */
/* Edit this file to customize your theme's color palette */

:root {
  /* 背景色系 */
  --nord-bg:       #EEF8F6;
  --nord-surface:  #E0F2EE;
  --nord-border:   #C8E4DE;

  /* 文字色系 */
  --nord-text:         #1A2F38;
  --nord-text-muted:   #5A7A82;
  --nord-text-light:   #8AAAB2;

  /* 强调色系 */
  --nord-accent:       #00A896;
  --nord-accent-warm:  #E8A87C;
  --nord-accent-cool:  #0077B6;
  --nord-accent-pink:  #E0919A;
  --nord-accent-green: #2ECC71;
  --nord-accent-red:   #E74C3C;
  --nord-heading:      #00A896;

  /* UI 色 */
  --nord-link:         #0077B6;
  --nord-selection:    rgba(0, 168, 150, 0.25);
  --nord-nav-bg:       rgba(238, 248, 246, 0.0);
  --nord-nav-mobile:   #00796B;
  --nord-tab-inactive: #B2DFDB;
  --nord-caption-bg:   rgba(26, 47, 56, 0.78);
  --nord-overlay-btn:  rgba(0, 168, 150, 0.9);

  /* ── Semantic Aliases ─────────────────────────────────────────── */
  --color-bg:           var(--nord-bg);
  --color-surface:      var(--nord-surface);
  --color-text:         var(--nord-text);
  --color-text-muted:   var(--nord-text-muted);
  --color-accent:       var(--nord-accent);
  --color-accent-warm:  var(--nord-accent-warm);
  --color-accent-cool:  var(--nord-accent-cool);
  --color-accent-pink:  var(--nord-accent-pink);
  --color-accent-green: var(--nord-accent-green);
  --color-accent-red:   var(--nord-accent-red);
  --color-heading:      var(--nord-heading);
  --color-border:       var(--nord-border);
  --color-link:         var(--nord-link);
  --color-selection:    var(--nord-selection);
  --color-nav-bg:       var(--nord-nav-bg);
  --color-nav-mobile:   var(--nord-nav-mobile);
  --color-tab-inactive: var(--nord-tab-inactive);
  --color-caption-bg:   var(--nord-caption-bg);
  --color-overlay-btn:  var(--nord-overlay-btn);
}
`;

  // layout.css — minimal but functional layout
  const layoutCss = `/* ── ${name} Layout & Component Styles ───────────────────────────── */

@import url('./colors.css');

/* ── Base Reset ────────────────────────────────────────────────────── */
* { box-sizing: border-box; }
html { background: var(--color-bg); }
body { background: var(--color-bg); margin: 0; color: var(--color-text); overflow-x: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
a { color: var(--color-link); text-decoration: none; }
a:hover { color: var(--color-accent); }
img { max-width: 100%; height: auto; display: block; }
button { cursor: pointer; font-family: inherit; }
::selection { background: var(--color-selection); }

/* ── Desktop Header Nav ─────────────────────────────────────────── */
.site-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 2.5rem;
  padding: 0 2rem;
  height: 60px;
  background: var(--color-nav-bg);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.nav-brand { font-size: 1.3rem; font-weight: 700; color: var(--color-accent); }
.nav-links { display: flex; gap: 0.15rem; align-items: center; }
.nav-link { padding: 0.35rem 0.8rem; color: var(--color-text-muted); font-size: 0.9rem; font-weight: 500; }
.nav-link:hover { color: var(--color-text); }
.nav-link.active, .nav-link[aria-current="page"] { color: var(--color-accent); }

/* ── Main Content ─────────────────────────────────────────────────── */
.main-content { padding-top: 80px; padding-bottom: 80px; min-height: 100vh; }

/* ── Mobile Bottom Nav ─────────────────────────────────────────── */
.bottom-nav {
  display: none;
  position: fixed; bottom: 0; left: 0; right: 0;
  background: var(--color-nav-mobile);
  border-top: 1px solid rgba(255,255,255,0.1);
  z-index: 200;
  justify-content: space-around;
  padding: 0.5rem 0;
}
.nav-tab { display: flex; flex-direction: column; align-items: center; padding: 0.4rem; color: var(--color-tab-inactive); font-size: 0.65rem; gap: 2px; }
.nav-tab.active { color: var(--color-accent); }
.nav-tab i { width: 22px; height: 22px; }

/* ── Cards / Items ────────────────────────────────────────────── */
.card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem; }
.card-title { font-size: 1.15rem; font-weight: 600; color: var(--color-heading); margin-bottom: 0.5rem; }
.card-date { font-size: 0.8rem; color: var(--color-text-muted); }
.card-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.6rem; }
.tag { background: var(--color-accent); color: white; padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.75rem; }

/* ── Lightbox ─────────────────────────────────────────────────── */
.lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 999; align-items: center; justify-content: center; flex-direction: column; }
.lightbox.open { display: flex; }
.lightbox-content img { max-height: 85vh; max-width: 90vw; object-fit: contain; }
.lightbox-caption { color: white; margin-top: 1rem; font-size: 0.9rem; }
.lightbox-close { position: absolute; top: 1rem; right: 1.5rem; background: none; border: none; color: white; font-size: 1.5rem; }
.lightbox-prev, .lightbox-next { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); border: none; color: white; font-size: 2rem; padding: 0.5rem 1rem; }
.lightbox-prev { left: 1rem; }
.lightbox-next { right: 1rem; }

/* ── Footer ────────────────────────────────────────────────────── */
.site-footer { text-align: center; padding: 2rem; color: var(--color-text-muted); font-size: 0.85rem; }

/* ── Scroll Sentinel ─────────────────────────────────────────── */
.scroll-sentinel { text-align: center; padding: 1rem; color: var(--color-text-muted); font-size: 0.85rem; }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .site-header { display: none; }
  .bottom-nav { display: flex; }
  .main-content { padding-top: 20px; padding-bottom: 100px; }
}
`;

  fs.writeFileSync(path.join(themeDir, 'template.html'), templateHtml, 'utf-8');
  fs.writeFileSync(path.join(themeDir, 'colors.css'), colorsCss, 'utf-8');
  fs.writeFileSync(path.join(themeDir, 'layout.css'), layoutCss, 'utf-8');

  console.log(`\n✅ 主题已创建: themes/${name}/`);
  console.log(`   路径: ${themeDir}`);
  console.log(`\n   📄 template.html  —  HTML 模板`);
  console.log(`   🎨 colors.css     —  颜色变量`);
  console.log(`   📐 layout.css     —  布局样式`);
  console.log(`   📁 assets/        —  静态资源（可选）`);
  console.log(`\n👉 编辑这些文件自定义你的主题，然后运行 \`memoria theme\` 选择它。\n`);

  return true;
}

// ── Validate Theme ───────────────────────────────────────────────────

function validateTheme(themePath) {
  if (!fs.existsSync(themePath)) {
    return { valid: false, error: `主题路径不存在: ${themePath}` };
  }
  const templatePath = path.join(themePath, 'template.html');
  if (!fs.existsSync(templatePath)) {
    return { valid: false, error: `主题缺少 template.html: ${themePath}` };
  }
  return { valid: true };
}

// ── Module Exports ───────────────────────────────────────────────────

module.exports = {
  listThemes,
  pickTheme,
  createTheme,
  validateTheme,
  BUILT_IN_THEMES_DIR,
};