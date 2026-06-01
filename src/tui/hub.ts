/**
 * Memoria TUI - Terminal User Interface
 * Entry hub for creating/opening sites and running commands
 */
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import { getRecentProjects, addRecentProject, isMemoriaProject, getProjectName } from './recent';

// Prompts is ESM-only, use dynamic import
async function loadPrompts() {
  const { default: prompts } = await import('prompts');
  return prompts;
}

// ANSI colors for TUI
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

function color(c: string, text: string): string {
  return `${c}${text}${C.reset}`;
}

function logo(): string {
  return `
${color(C.cyan, '╭──────────────────────────────────────────╮')}
${color(C.cyan, '│')}  ${color(C.bright, '📚 Memoria')}                           ${color(C.cyan, '│')}
${color(C.cyan, '│')}  轻量级静态博客写作软件                ${color(C.cyan, '│')}
${color(C.cyan, '╰──────────────────────────────────────────╯')}`;
}

async function askFolder(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, ans => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${question} (y/N): `, ans => {
      rl.close();
      resolve(['y', 'Y'].includes(ans.trim()));
    });
  });
}

// ── New Site Wizard ──────────────────────────────────────────────────────

interface NewSiteOptions {
  name: string;
  root: string;
  theme: string;
}

async function wizardNewSite(): Promise<NewSiteOptions | null> {
  const prompts = await loadPrompts();

  console.log(color(C.cyan, '\n🆕 创建新站点\n'));

  const nameAnswer = await prompts({
    type: 'text',
    name: 'name',
    message: '站点名称',
    initial: 'my-blog',
  });

  const name = nameAnswer.name?.trim();
  if (!name) { console.log('已取消'); return null; }

  const targetRoot = path.resolve(process.cwd(), name);

  // Check non-empty directory warning
  if (fs.existsSync(targetRoot)) {
    const entries = fs.readdirSync(targetRoot);
    if (entries.length > 0) {
      console.log(color(C.yellow, `\n⚠️  目录 "${targetRoot}" 非空`));
      const allMemoria = entries.every(e =>
        ['content', '.themerc', 'node_modules'].includes(e) ||
        fs.statSync(path.join(targetRoot, e)).isDirectory()
      );

      if (!allMemoria) {
        console.log(color(C.red, '   无法确定是否为 Memoria 项目站点。\n'));
        console.log(color(C.yellow, '   💡 建议：换一个空目录，或先手动检查该目录\n'));
        return null;
      } else {
        console.log(color(C.green, '   ✓ 检测为已有 Memoria 项目，将打开而非新建\n'));
      }
    }
  }

  const themeAnswer = await prompts({
    type: 'select',
    name: 'theme',
    message: '选择主题',
    choices: [
      { title: '🌙 Dracula (暗色)', value: 'dracula' },
      { title: '☀️ Peach (亮色)', value: 'peach' },
    ],
    initial: 0,
  });

  return { name, root: targetRoot, theme: themeAnswer.theme || 'dracula' };
}

async function createSite(options: NewSiteOptions): Promise<boolean> {
  const { name, root, theme } = options;

  try {
    fs.mkdirSync(root, { recursive: true });
    fs.mkdirSync(path.join(root, 'content', 'blogs'), { recursive: true });
    fs.mkdirSync(path.join(root, 'content', 'vlogs'), { recursive: true });
    fs.mkdirSync(path.join(root, 'content', 'photos'), { recursive: true });
    fs.mkdirSync(path.join(root, 'public'), { recursive: true });
    fs.mkdirSync(path.join(root, 'themes', theme), { recursive: true });

    // Write .themerc
    fs.writeFileSync(path.join(root, '.themerc'), theme);

    // Write default content
    const welcomeMd = `---
title: 欢迎使用 Memoria
date: ${new Date().toISOString().split('T')[0]}
---

# 欢迎使用 Memoria! 🫘

这是一个基于 **Memoria** 的静态博客。

## 开始使用

- 创建文章：\`memoria new blog "文章标题"\`
- 启动预览：\`memoria preview\`
- 查看帮助：\`memoria --help\`

## 下一步

1. 编辑 \`content/about.md\` 介绍你自己
2. 在 \`content/blogs/\` 目录下创建文章
3. 选择喜欢的主题开始写作吧！
`;

    fs.writeFileSync(path.join(root, 'content', 'about.md'), welcomeMd);
    fs.writeFileSync(path.join(root, 'content', 'blogs', 'hello.md'), `---
title: 我的第一篇文章
date: ${new Date().toISOString().split('T')[0]}
category: 默认分类
---

# 你好世界！

这是你在 Memoria 的第一篇文章。 🎉
`);

    addRecentProject(root);
    console.log(color(C.green, `\n✅ 站点 "${name}" 创建成功！\n`));
    console.log(`   路径: ${root}`);
    console.log(`   主题: ${theme}`);
    console.log(`\n   ${color(C.cyan, 'cd ' + name)}`);
    console.log(`   ${color(C.cyan, 'memoria preview')}\n`);

    return true;
  } catch (err) {
    console.error(color(C.red, `\n❌ 创建站点失败: ${err}\n`));
    return false;
  }
}

// ── Open Site ─────────────────────────────────────────────────────────────

async function chooseRecentSite(): Promise<string | null> {
  const recents = getRecentProjects();
  if (recents.length === 0) return null;

  const choices = recents.slice(0, 10).map(e => ({
    title: `${e.name}  (${e.root})`,
    value: e.root,
  }));

  const prompts = await loadPrompts();

  console.log(color(C.cyan, '\n📂 最近项目\n'));

  const answer = await prompts({
    type: 'select',
    name: 'project',
    message: '选择站点',
    choices,
    initial: 0,
  });

  return answer.project || null;
}

async function browseSite(): Promise<string | null> {
  const prompts = await loadPrompts();

  console.log(color(C.cyan, '\n📂 打开站点\n'));

  const answer = await prompts({
    type: 'text',
    name: 'path',
    message: '输入站点目录路径',
    initial: process.cwd(),
  });

  const targetPath = path.resolve(answer.path?.trim() || process.cwd());

  if (!fs.existsSync(targetPath)) {
    console.error(color(C.red, `\n❌ 目录不存在: ${targetPath}\n`));
    return null;
  }

  if (!isMemoriaProject(targetPath)) {
    console.error(color(C.yellow, `\n⚠️  "${targetPath}" 不是有效的 Memoria 项目\n`));
    console.error(color(C.dim, '   需要有 .themerc 或 content/ 目录\n'));
    return null;
  }

  return targetPath;
}

async function openSite(root: string): Promise<void> {
  addRecentProject(root);
  console.log(color(C.green, `\n📂 已打开: ${getProjectName(root)}\n`));
  console.log(`   ${color(C.dim, root)}\n`);
}

// ── Main TUI Hub ──────────────────────────────────────────────────────────

export async function showHub(): Promise<void> {
  const prompts = await loadPrompts();

  console.clear();
  console.log(logo());

  const recents = getRecentProjects();
  const recentSection = recents.length > 0
    ? `\n${color(C.dim, '  最近项目')} ${recents.slice(0,3).map(e => color(C.blue, e.name)).join('  ')}`
    : '';

  const answer = await prompts({
    type: 'select',
    name: 'action',
    message: '选择操作',
    hint: recentSection,
    choices: [
      { title: `${color(C.green, '➕')} 新建站点`, value: 'new' },
      { title: `${color(C.blue, '📂')} 打开已有站点`, value: 'open' },
      { title: `${color(C.dim, '🚪')} 退出`, value: 'exit' },
    ],
  });

  if (!answer.action || answer.action === 'exit') {
    console.log(`\n${color(C.dim, '再见！👋')}\n`);
    return;
  }

  if (answer.action === 'new') {
    const options = await wizardNewSite();
    if (options) {
      const success = await createSite(options);
      if (success) {
        console.log(color(C.green, '✅ 站点已创建，可使用 memoria preview 预览'));
        console.log(color(C.cyan, '   或直接输入 memoria 进入管理界面\n'));
      }
    } else {
      // wizard cancelled or non-memoria dir
      console.log(color(C.dim, '\n操作已取消\n'));
    }
  }

  if (answer.action === 'open') {
    const prompts2 = await loadPrompts();
    const subAnswer = await prompts2({
      type: 'select',
      name: 'method',
      message: '打开方式',
      choices: [
        { title: `${color(C.blue, '📋')} 最近项目`, value: 'recent' },
        { title: `${color(C.cyan, '📁')} 浏览目录`, value: 'browse' },
      ],
    });

    let targetRoot: string | null = null;

    if (subAnswer.method === 'recent') {
      targetRoot = await chooseRecentSite();
    } else if (subAnswer.method === 'browse') {
      targetRoot = await browseSite();
    }

    if (targetRoot) {
      await openSite(targetRoot);

      // After opening, show project commands
      const projectPrompts = await loadPrompts();
      await projectPrompts({
        type: 'select',
        name: 'cmd',
        message: '选择操作',
        choices: [
          { title: `${color(C.green, '🔍')} 预览站点`, value: 'preview' },
          { title: `${color(C.cyan, '📝')} 新建内容`, value: 'new-content' },
          { title: `${color(C.magenta, '⚙️')} 编辑器设置`, value: 'editor' },
          { title: `${color(C.dim, '↩')} 返回`, value: 'back' },
        ],
      });

      // Dispatch based on selection - the caller will handle these
      // For now just show the selected action
    }
  }
}