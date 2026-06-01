/**
 * Memoria TUI - ink + React rendering
 * Entry hub for creating/opening sites
 */
import React from 'react';
import { render, Box, Text } from 'ink';
import { getRecentProjects, addRecentProject, isMemoriaProject, getProjectName } from './recent';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';

// ── ANSI helpers ──────────────────────────────────────────────────────────

const K = {
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', magenta: '\x1b[35m', blue: '\x1b[34m',
  dim: '\x1b[2m', bright: '\x1b[1m', reset: '\x1b[0m',
};

function c(color: string, text: string | number): string {
  return `${color}${text}${K.reset}`;
}

// ── Hub Component ─────────────────────────────────────────────────────────

const logoLines = [
  `${K.cyan}╭──────────────────────────────────────────╮${K.reset}`,
  `${K.cyan}│${K.reset}  ${K.bright}📚 Memoria${K.reset}                           ${K.cyan}│${K.reset}`,
  `${K.cyan}│${K.reset}  轻量级静态博客写作软件                ${K.cyan}│${K.reset}`,
  `${K.cyan}╰──────────────────────────────────────────╯${K.reset}`,
];

function Logo() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {logoLines.map((line) => <Text>{line}</Text>)}
    </Box>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function ask(question: string, initial = ''): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (ans) => { rl.close(); resolve(ans.trim() || initial); });
  });
}

function confirm(question: string): Promise<boolean> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question + ' (y/N): ', (ans) => { rl.close(); resolve(['y', 'Y'].includes(ans.trim())); });
  });
}

function selectMenu(items: string[]): Promise<number> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    items.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
    rl.question('  选择 [1]: ', (ans) => {
      rl.close();
      const idx = parseInt(ans.trim()) - 1;
      resolve(!isNaN(idx) && idx >= 0 && idx < items.length ? idx : 0);
    });
  });
}

// ── Show Hub ──────────────────────────────────────────────────────────────

async function showCreateWizard(): Promise<boolean> {
  console.log(`\n${c(K.cyan, '🆕 创建新站点')}\n`);

  const name = await ask('  站点名称', 'my-blog');
  const defaultPath = path.resolve(process.cwd(), name);

  console.log(`\n  保存路径: ${c(K.dim, defaultPath)}`);
  const customPath = await ask('  (直接回车使用以上路径，或输入自定义路径)', '');

  const targetPath = customPath.trim() ? path.resolve(customPath.trim()) : defaultPath;

  // Non-empty directory check
  if (fs.existsSync(targetPath)) {
    const entries = fs.readdirSync(targetPath);
    if (entries.length > 0) {
      console.log(`\n${c(K.yellow, '⚠️  目录 "' + targetPath + '" 非空')}`);
      console.log(`${c(K.red, '   无法确定是否为 Memoria 项目站点。')}`);
      console.log(`${c(K.yellow, '   💡 建议：换一个空目录，或先手动检查该目录')}\n`);
      return false;
    }
  }

  // Theme selection
  console.log(`\n  选择主题:`);
  console.log(`    ${c(K.magenta, '1. 🌙 Dracula (暗色)')}`);
  console.log(`    ${c(K.yellow, '2. ☀️ Peach (亮色)')}`);
  const themeIdx = await selectMenu(['Dracula (暗色)', 'Peach (亮色)']);
  const theme = themeIdx === 0 ? 'dracula' : 'peach';

  // Create site
  try {
    fs.mkdirSync(targetPath, { recursive: true });
    fs.mkdirSync(path.join(targetPath, 'content', 'blogs'), { recursive: true });
    fs.mkdirSync(path.join(targetPath, 'content', 'vlogs'), { recursive: true });
    fs.mkdirSync(path.join(targetPath, 'content', 'photos'), { recursive: true });
    fs.mkdirSync(path.join(targetPath, 'public'), { recursive: true });

    fs.writeFileSync(path.join(targetPath, '.themerc'), theme);

    const date = new Date().toISOString().split('T')[0];
    const welcomeMd = `---\ntitle: 欢迎使用 Memoria\ndate: ${date}\n---\n\n# 欢迎使用 Memoria! 🫘\n\n这是一个基于 **Memoria** 的静态博客。\n\n## 开始使用\n\n- 创建文章：\`memoria new blog "文章标题"\`\n- 启动预览：\`memoria preview\`\n- 查看帮助：\`memoria --help\`\n\n## 下一步\n\n1. 编辑 \`content/about.md\` 介绍你自己\n2. 在 \`content/blogs/\` 目录下创建文章\n3. 选择喜欢的主题开始写作吧！\n`;

    fs.writeFileSync(path.join(targetPath, 'content', 'about.md'), welcomeMd);
    fs.writeFileSync(path.join(targetPath, 'content', 'blogs', 'hello.md'),
      `---\ntitle: 我的第一篇文章\ndate: ${date}\ncategory: 默认分类\n---\n\n# 你好世界！\n\n这是你在 Memoria 的第一篇文章。 🎉\n`);

    addRecentProject(targetPath);

    console.log(`\n${c(K.green, '✅ 站点 "' + name + '" 创建成功！')}`);
    console.log(`   路径: ${c(K.cyan, targetPath)}`);
    console.log(`   主题: ${theme}`);
    console.log(`\n   ${c(K.cyan, 'memoria preview')}  预览站点`);
    console.log(`   ${c(K.cyan, 'memoria new blog "标题"')}  新建内容\n`);

    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${c(K.red, '❌ 创建失败: ' + msg)}\n`);
    return false;
  }
}

async function showOpenRecent(): Promise<string | null> {
  const recents = getRecentProjects();
  if (recents.length === 0) {
    console.log(`\n${c(K.dim, '  暂无最近项目')}\n`);
    return null;
  }

  console.log(`\n${c(K.blue, '📂 最近项目')}\n`);
  recents.slice(0, 10).forEach((r, i) => {
    const daysAgo = Math.round((Date.now() - r.lastOpened) / 86400000);
    const timeAgo = daysAgo === 0 ? '今天' : daysAgo + '天前';
    console.log(`  ${i + 1}. ${c(K.bright, r.name)}  ${c(K.dim, timeAgo)}`);
    console.log(`     ${c(K.dim, r.root)}`);
  });

  const idx = await selectMenu(recents.slice(0, 10).map(r => r.name + ' — ' + r.root));
  return recents[idx]?.root || null;
}

async function showBrowseOpen(): Promise<string | null> {
  console.log(`\n${c(K.cyan, '📂 打开站点')}\n`);
  const inputPath = await ask('  输入站点目录路径', process.cwd());
  const targetPath = path.resolve(inputPath.trim() || process.cwd());

  if (!fs.existsSync(targetPath)) {
    console.error(`${c(K.red, '\n❌ 目录不存在: ' + targetPath)}\n`);
    return null;
  }

  if (!isMemoriaProject(targetPath)) {
    console.error(`${c(K.yellow, '\n⚠️ "' + targetPath + '" 不是有效的 Memoria 项目')}`);
    console.error(`${c(K.dim, '   需要有 .themerc 或 content/ 目录')}\n`);
    return null;
  }

  return targetPath;
}

// ── Main Hub ───────────────────────────────────────────────────────────────

export async function showHub(): Promise<void> {
  console.clear();

  while (true) {
    console.clear();
    logoLines.forEach(line => console.log(line));

    const recents = getRecentProjects().slice(0, 3);
    if (recents.length > 0) {
      console.log(`\n  ${c(K.dim, '── 最近项目 ──')}`);
      recents.forEach(r => console.log(`  ${c(K.blue, r.name)}  ${c(K.dim, r.root)}`));
    }

    console.log(`\n  ${c(K.green, '➕')} 1. 新建站点`);
    console.log(`  ${c(K.blue, '📂')} 2. 打开已有站点`);
    console.log(`  ${c(K.dim, 'x')} 3. 退出\n`);

    const idx = await selectMenu(['新建站点', '打开已有站点', '退出']);

    if (idx === 2) {
      console.log(`\n${c(K.dim, '再见！👋')}\n`);
      return;
    }

    if (idx === 0) {
      console.clear();
      await showCreateWizard();
      await ask('\n  按回车返回...', '');
    }

    if (idx === 1) {
      console.clear();
      logoLines.forEach(line => console.log(line));
      console.log(`\n  ${c(K.blue, '📋')} 1. 最近项目`);
      console.log(`  ${c(K.cyan, '📁')} 2. 浏览目录`);
      console.log(`  ${c(K.dim, '↩')} 3. 返回\n`);

      const openIdx = await selectMenu(['最近项目', '浏览目录', '返回']);

      if (openIdx === 0) {
        const target = await showOpenRecent();
        if (target) {
          addRecentProject(target);
          console.log(`\n${c(K.green, '📂 已打开: ' + getProjectName(target))}`);
          console.log(`   ${c(K.dim, target)}\n`);
          await ask('\n  按回车返回...', '');
        }
      } else if (openIdx === 1) {
        const target = await showBrowseOpen();
        if (target) {
          addRecentProject(target);
          console.log(`\n${c(K.green, '📂 已打开: ' + getProjectName(target))}`);
          console.log(`   ${c(K.dim, target)}\n`);
          await ask('\n  按回车返回...', '');
        } else {
          await ask('\n  按回车返回...', '');
        }
      }
    }
  }
}