/**
 * Memoria CLI — 快捷命令工具
 * 用法: node lib/cli-content.js <command>
 */
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const PKG_ROOT = path.resolve(__dirname, '..', '..');
const [, , cmd] = process.argv;
const siteDir = process.env.MEMORIA_SITE_ROOT || null;
const defaultTheme = 'dracula';

function getSiteRoot(): string {
  return siteDir || PKG_ROOT;
}

function ask(question: string): Promise<string> {
  return new Promise(resolve => {
    if (process.stdin.isTTY) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(question, (answer: string) => {
        rl.close();
        resolve(answer.trim());
      });
    } else {
      // Non-TTY (piped stdin): consume one line per ask call
      let consumed = false;
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.on('line', (line: string) => {
        if (!consumed) {
          consumed = true;
          rl.close();
          resolve(line.trim());
        }
      });
    }
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isValidDateString(s: string): boolean {
  if (!s) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

function dateNow(): string {
  return new Date().toISOString().split('T')[0];
}

function defaultTitle(type: string): string {
  return `Untitled ${type} ${dateNow()}`;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Commands ──────────────────────────────────────────────────────────

async function cmdNewBlog(): Promise<void> {
  console.log('\n📝 新建博客文章\n');
  const title = await ask('文章标题: ');
  const dateInput = await ask(`日期（YYYY-MM-DD，回车用今天）: `);
  const date = (dateInput && isValidDateString(dateInput)) ? dateInput : dateNow();
  const tagsStr = await ask('标签（逗号分隔）: ');
  const tags = tagsStr ? tagsStr.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
  const description = await ask('简短描述（可选）: ');

  const finalTitle = title || defaultTitle('Blog');
  const slug = slugify(finalTitle);
  const filename = `${date.replace(/-/g, '')}-${slug}.md`;
  const filepath = path.join(getSiteRoot(), 'content', 'blogs', filename);

  const frontmatter = [
    '---',
    `title: "${finalTitle}"`,
    `date: "${date}"`,
    tags.length ? `tags: [${tags.map((t: string) => `"${t}"`).join(', ')}]` : 'tags: []',
    'type: "blog"',
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

async function cmdNewVlog(): Promise<void> {
  console.log('\n🎬 新建视频记录\n');
  const title = await ask('视频标题: ');
  const dateInput = await ask(`日期（YYYY-MM-DD，回车用今天）: `);
  const date = (dateInput && isValidDateString(dateInput)) ? dateInput : dateNow();
  const video = await ask('视频URL（YouTube embed 或本地路径）: ');
  const thumbnail = await ask('缩略图URL（可选）: ');
  const description = await ask('描述（可选）: ');
  const tagsStr = await ask('标签（逗号分隔）: ');
  const tags = tagsStr ? tagsStr.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

  const finalTitle = title || defaultTitle('Vlog');
  const slug = slugify(finalTitle);
  const filename = `${date.replace(/-/g, '')}-${slug}.md`;
  const filepath = path.join(getSiteRoot(), 'content', 'vlogs', filename);

  const lines = [
    '---',
    `title: "${finalTitle}"`,
    `date: "${date}"`,
    tags.length ? `tags: [${tags.map((t: string) => `"${t}"`).join(', ')}]` : 'tags: []',
    'type: "vlog"',
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

async function cmdNewPhoto(): Promise<void> {
  console.log('\n📷 新建相册\n');
  const title = await ask('相册标题: ');
  const dateInput = await ask(`日期（YYYY-MM-DD，回车用今天）: `);
  const date = (dateInput && isValidDateString(dateInput)) ? dateInput : dateNow();

  console.log('每张照片一行，格式: url | caption，直接回车结束输入:\n');
  const photos: { url: string; caption: string }[] = [];
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  await new Promise<void>(resolve => {
    function promptPhoto(): void {
      rl.question('  > ', (line: string) => {
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

  const tagsStr = await ask('标签（逗号分隔）: ');
  const tags = tagsStr ? tagsStr.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

  const finalTitle = title || defaultTitle('Photo');
  const slug = slugify(finalTitle);
  const filename = `${date.replace(/-/g, '')}-${slug}.md`;
  const filepath = path.join(getSiteRoot(), 'content', 'photos', filename);

  const photosYaml = photos.map(p => `  - url: "${p.url}"\n    caption: "${p.caption}"`).join('\n');
  const lines = [
    '---',
    `title: "${finalTitle}"`,
    `date: "${date}"`,
    'tags: []',
    'type: "photo"',
    'photos:',
    photosYaml || '  []',
    'description: ""',
    '---',
    '',
    '',
  ];

  ensureDir(path.dirname(filepath));
  fs.writeFileSync(filepath, lines.join('\n'), 'utf-8');
  console.log(`\n✅ 已创建: content/photos/${filename}（${photos.length} 张照片）\n`);
}

function cmdBundle(): void {
  console.log('\n📦 打包中...\n');
  execSync(`node "${path.join(getSiteRoot(), 'dist', 'src', 'index.js')}"`, { cwd: getSiteRoot(), stdio: 'inherit' });

  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const zipName = `memoria-${date}.zip`;
  const distDir = path.join(getSiteRoot(), 'dist');
  const zipPath = path.join(getSiteRoot(), zipName);

  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  execSync(`cd "${distDir}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
  console.log(`\n✅ 打包完成: ${zipName}（${(fs.statSync(zipPath).size / 1024).toFixed(1)} KB）\n`);
}

function cmdDeploy(): void {
  console.log('\n🚀 推送到 GitHub...\n');
  try {
    execSync('git add -A', { cwd: getSiteRoot(), stdio: 'inherit' });
    const status = execSync('git status --porcelain', { cwd: getSiteRoot() }).toString().trim();
    if (status) {
      execSync('git commit -m "update: rebuild site"', { cwd: getSiteRoot(), stdio: 'inherit' });
    } else {
      console.log('没有变更，跳过 commit');
    }
    execSync('git push origin main', { cwd: getSiteRoot(), stdio: 'inherit' });
    console.log('\n✅ 推送完成！GitHub Actions 将自动构建部署。\n');
  } catch (e) {
    console.error('\n❌ 推送失败，请检查 git 配置。\n');
    process.exit(1);
  }
}

async function cmdTheme(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const available = fs.readdirSync(path.join(getSiteRoot(), 'themes')).filter(d =>
    fs.statSync(path.join(getSiteRoot(), 'themes', d)).isDirectory()
  );
  console.log('\n🎨 主题切换\n');
  console.log('可用主题:');
  available.forEach(t => console.log(`  - ${t}`));
  const saved = fs.existsSync(path.join(getSiteRoot(), '.themerc'))
    ? fs.readFileSync(path.join(getSiteRoot(), '.themerc'), 'utf-8').trim()
    : defaultTheme;
  console.log(`\n当前主题: ${saved}`);
  const answer = await new Promise<string>(r => rl.question('\n选择主题（或输入新主题名）: ', r));
  rl.close();
  const chosen = answer.trim();
  if (!chosen) { console.log('取消。'); return; }
  if (!available.includes(chosen)) {
    console.log(`❌ 未找到主题: ${chosen}`);
    console.log('可用:'); available.forEach(t => console.log(`  ${t}`));
    process.exit(1);
  }
  fs.writeFileSync(path.join(getSiteRoot(), '.themerc'), chosen, 'utf-8');
  console.log(`\n✅ 已切换主题: ${chosen}`);
  console.log(`   下次 \`npm run build\` 将使用该主题。\n`);
}

// ── Main ──────────────────────────────────────────────────────────────

const commands: { [key: string]: (() => Promise<void>) | (() => void) } = {
  'new:blog': cmdNewBlog,
  'new:vlog': cmdNewVlog,
  'new:photo': cmdNewPhoto,
  'bundle': cmdBundle,
  'deploy': cmdDeploy,
  'theme': cmdTheme,
};

if (!cmd || !commands[cmd]) {
  console.log(`
Memoria CLI — 快捷命令

用法: memoria <command>

快捷命令:
  theme     切换主题
  deploy    推送到 GitHub

推荐:
  memoria new blog     新建博客文章
  memoria new vlog     新建视频记录
  memoria new photo    新建相册
  memoria theme        切换主题
  memoria generate     构建站点
  memoria bundle       构建 + 打包成 zip
`);
  process.exit(cmd ? 1 : 0);
}

const commandFn = commands[cmd];
Promise.resolve(commandFn() as Promise<void>).catch((e: Error) => {
  console.error('Error:', (e as Error).message);
  process.exit(1);
});