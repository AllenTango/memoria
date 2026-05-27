#!/usr/bin/env node
/**
 * Memoria CLI — 快捷命令工具
 * 用法: memoria <command> [options]
 */
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const rootDir = process.cwd();
const defaultTheme = 'dracula';

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function dateNow() {
  return new Date().toISOString().split('T')[0];
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Commands ──────────────────────────────────────────────────────────

async function cmdNewBlog() {
  console.log('\n📝 新建博客文章\n');
  const title = await ask('文章标题: ');
  const date = await ask(`日期（YYYY-MM-DD，回车用今天）: `) || dateNow();
  const tagsStr = await ask('标签（逗号分隔）: ');
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
  const description = await ask('简短描述（可选）: ');

  const slug = slugify(title);
  const filename = `${date.replace(/-/g, '')}-${slug}.md`;
  const filepath = path.join(rootDir, 'content', 'blogs', filename);

  const frontmatter = [
    '---',
    `title: "${title}"`,
    `date: "${date}"`,
    tags.length ? `tags: [${tags.map(t => `"${t}"`).join(', ')}]` : 'tags: []',
    description ? `description: "${description}"` : 'description: ""',
    '---',
    '',
    '',
  ].join('\n');

  ensureDir(path.dirname(filepath));
  fs.writeFileSync(filepath, frontmatter, 'utf-8');
  console.log(`\n✅ 已创建: content/blogs/${filename}`);
  console.log(`   路径: ${filepath}\n`);
}

async function cmdNewVlog() {
  console.log('\n🎬 新建视频记录\n');
  const title = await ask('视频标题: ');
  const date = await ask(`日期（YYYY-MM-DD，回车用今天）: `) || dateNow();
  const video = await ask('视频URL（YouTube embed 或本地路径）: ');
  const thumbnail = await ask('缩略图URL（可选）: ');
  const description = await ask('描述（可选）: ');

  const slug = slugify(title);
  const filename = `${date.replace(/-/g, '')}-${slug}.md`;
  const filepath = path.join(rootDir, 'content', 'vlogs', filename);

  const lines = [
    '---',
    `title: "${title}"`,
    `date: "${date}"`,
    `video: "${video}"`,
    thumbnail ? `thumbnail: "${thumbnail}"` : 'thumbnail: ""',
    description ? `description: "${description}"` : 'description: ""',
    '---',
    '',
    '',
  ];
  if (description) lines.push(description);

  ensureDir(path.dirname(filepath));
  fs.writeFileSync(filepath, lines.join('\n'), 'utf-8');
  console.log(`\n✅ 已创建: content/vlogs/${filename}\n`);
}

async function cmdNewPhoto() {
  console.log('\n📷 新建相册\n');
  const title = await ask('相册标题: ');
  const date = await ask(`日期（YYYY-MM-DD，回车用今天）: `) || dateNow();

  console.log('每张照片一行，格式: url | caption，直接回车结束输入:\n');
  const photos = [];
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  await new Promise(resolve => {
    function promptPhoto() {
      rl.question('  > ', line => {
        line = line.trim();
        if (!line) { rl.close(); resolve(); return; }
        const [url, ...rest] = line.split('|');
        if (url.trim()) {
          photos.push({ url: url.trim(), caption: rest.join('|').trim() });
        }
        promptPhoto();
      });
    }
    promptPhoto();
  });

  const slug = slugify(title);
  const filename = `${date.replace(/-/g, '')}-${slug}.md`;
  const filepath = path.join(rootDir, 'content', 'photos', filename);

  const photosYaml = photos.map(p => `  - url: "${p.url}"\n    caption: "${p.caption}"`).join('\n');
  const lines = [
    '---',
    `title: "${title}"`,
    `date: "${date}"`,
    'photos:',
    photosYaml || '  []',
    '---',
    '',
    '',
  ];

  ensureDir(path.dirname(filepath));
  fs.writeFileSync(filepath, lines.join('\n'), 'utf-8');
  console.log(`\n✅ 已创建: content/photos/${filename}（${photos.length} 张照片）\n`);
}

function cmdBundle() {
  console.log('\n📦 打包中...\n');
  // Build first
  execSync('node src/index.js', { cwd: rootDir, stdio: 'inherit' });

  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const zipName = `memoria-${date}.zip`;
  const distDir = path.join(rootDir, 'dist');
  const zipPath = path.join(rootDir, zipName);

  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  execSync(`cd "${distDir}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
  console.log(`\n✅ 打包完成: ${zipName}（${(fs.statSync(zipPath).size / 1024).toFixed(1)} KB）\n`);
}

function cmdDeploy() {
  console.log('\n🚀 推送到 GitHub...\n');
  try {
    execSync('git add -A', { cwd: rootDir, stdio: 'inherit' });
    const status = execSync('git status --porcelain', { cwd: rootDir }).toString().trim();
    if (status) {
      execSync('git commit -m "update: rebuild site"', { cwd: rootDir, stdio: 'inherit' });
    } else {
      console.log('没有变更，跳过 commit');
    }
    execSync('git push origin main', { cwd: rootDir, stdio: 'inherit' });
    console.log('\n✅ 推送完成！GitHub Actions 将自动构建部署。\n');
  } catch (e) {
    console.error('\n❌ 推送失败，请检查 git 配置。\n');
    process.exit(1);
  }
}

// ── Main ──────────────────────────────────────────────────────────────

const [,, cmd] = process.argv;

const commands = {
  'new:blog': cmdNewBlog,
  'new:vlog': cmdNewVlog,
  'new:photo': cmdNewPhoto,
  'bundle': cmdBundle,
  'deploy': cmdDeploy,
  'theme': async () => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const available = fs.readdirSync(path.join(rootDir, 'themes')).filter(d =>
      fs.statSync(path.join(rootDir, 'themes', d)).isDirectory()
    );
    console.log('\n🎨 主题切换\n');
    console.log('可用主题:');
    available.forEach(t => console.log(`  - ${t}`));
    const saved = fs.existsSync(path.join(rootDir, '.themerc'))
      ? fs.readFileSync(path.join(rootDir, '.themerc'), 'utf-8').trim()
      : defaultTheme;
    console.log(`\n当前主题: ${saved}`);
    const answer = await new Promise(r => rl.question('\n选择主题（或输入新主题名）: ', r));
    rl.close();
    const chosen = answer.trim();
    if (!chosen) { console.log('取消。'); return; }
    if (!available.includes(chosen)) {
      console.log(`❌ 未找到主题: ${chosen}`);
      console.log('可用:'); available.forEach(t => console.log(`  ${t}`));
      process.exit(1);
    }
    fs.writeFileSync(path.join(rootDir, '.themerc'), chosen, 'utf-8');
    console.log(`\n✅ 已切换主题: ${chosen}`);
    console.log(`   下次 \`npm run build\` 将使用该主题。\n`);
  },
};

if (!cmd || !commands[cmd]) {
  console.log(`
Memoria CLI — 快捷命令

用法: memoria <command>

命令:
  new:blog     新建博客文章（交互式）
  new:vlog     新建视频记录（交互式）
  new:photo    新建相册（交互式）
  theme        切换主题（交互式）
  bundle       构建 + 打包成 zip
  deploy       推送到 GitHub（触发 CI）

示例:
  memoria new:blog
  memoria theme
  memoria bundle
`);
  process.exit(cmd ? 1 : 0);
}

commands[cmd]().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
