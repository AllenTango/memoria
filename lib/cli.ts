/**
 * lib/cli.ts
 * CLI 命令处理层 — 调用 lib/ 各模块执行操作
 */
import { spawn } from 'child_process';
import { createContent, type ContentType } from './content.js';
import { isMemoriaProject } from './recent.js';

// ── Help command ─────────────────────────────────────────────────────────────

export async function helpCommand(): Promise<void> {
  console.log(`
📚 Memoria CLI

用法:
  memoria [命令] [选项]

命令:
  memoria           进入 TUI 交互界面
  memoria -v        显示版本号
  memoria -h        显示帮助信息
  memoria upgrade   同步内置主题到站点

TUI 模式:
  memoria /new      新建站点
  memoria /open     打开已有站点
  memoria /build    构建站点
  memoria /preview  预览站点

示例:
  memoria
  memoria -h
`);
}

// ── New content command ────────────────────────────────────────────────────────

export async function newContentCommand(args: string[]): Promise<void> {
  const rootDir = process.cwd();
  if (!isMemoriaProject(rootDir)) {
    console.error('❌ 未检测到 Memoria 项目');
    process.exit(1);
  }

  const type = args[0] as ContentType || 'blog';
  const title = args.slice(1).join(' ') || '未命名';

  const result = createContent(rootDir, type, title);
  if (!result.success) {
    console.error('❌ ' + result.error);
    process.exit(1);
  }

  console.log('✅ 已创建: ' + result.path);

  // Open with editor if configured
  const editor = process.env.MEMORIA_EDITOR || process.env.EDITOR;
  if (editor) {
    console.log('\n📝 用编辑器打开...');
    spawn(editor, [result.path], { stdio: 'inherit' });
  }
}