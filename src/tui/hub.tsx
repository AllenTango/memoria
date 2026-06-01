// @ts-nocheck
/**
 * Memoria TUI - Pure ink + React
 * Entry hub for creating/opening sites
 */
import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput } from 'ink';
import { getRecentProjects, addRecentProject, isMemoriaProject, getProjectName } from './recent.js';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

// ── Types ─────────────────────────────────────────────────────────────────

interface RecentProject {
  root: string;
  name: string;
  lastOpened: number;
}

// ── ANSI helpers ──────────────────────────────────────────────────────────

const K = {
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', magenta: '\x1b[35m', blue: '\x1b[34m',
  dim: '\x1b[2m', bright: '\x1b[1m', reset: '\x1b[0m',
};

function c(color: string, text: string | number): string {
  return `${color}${text}${K.reset}`;
}

// ── Logo ───────────────────────────────────────────────────────────────────

const logoLines = [
  '╭──────────────────────────────────────────╮',
  '│  📚 Memoria                           │',
  '│  轻量级静态博客写作软件                │',
  '╰──────────────────────────────────────────╯',
];

function Logo() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {logoLines.map((line, i) => (
        <Text key={i} color="cyan">{line}</Text>
      ))}
    </Box>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────

function Spinner({ label }: { label: string }) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % frames.length), 80);
    return () => clearInterval(id);
  }, []);

  return <Text color="gray">{frames[frame]} {label}</Text>;
}

// ── Menu ───────────────────────────────────────────────────────────────────

interface MenuItem {
  label: string;
  emoji: string;
  color: string;
}

function Menu({ items, selected, onSelect }: { items: MenuItem[]; selected: number; onSelect: (i: number) => void }) {
  useInput((input, key) => {
    if (key.upArrow) onSelect(Math.max(0, selected - 1));
    else if (key.downArrow) onSelect(Math.min(items.length - 1, selected + 1));
    else if (key.return) {
      if (selected === items.length - 1) {
        console.log('\n 再见！👋\n');
        process.exit(0);
      }
      onSelect(selected);
    }
  });

  return (
    <Box flexDirection="column">
      {items.map((item, i) => (
        <Text
          key={i}
          color={i === selected ? item.color : 'grayDim'}
        >
          {i === selected ? '▶ ' : '  '}{item.emoji} {item.label}
        </Text>
      ))}
    </Box>
  );
}

// ── RecentList ──────────────────────────────────────────────────────────────

function RecentList({ recents, onSelect, onBack }: {
  recents: RecentProject[];
  onSelect: (root: string) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) setSelected(s => Math.max(0, s - 1));
    else if (key.downArrow) setSelected(s => Math.min(recents.length, s + 1));
    else if (key.return) {
      if (selected < recents.length) onSelect(recents[selected].root);
      else onBack();
    } else if (key.escape) onBack();
  });

  return (
    <Box flexDirection="column">
      <Text bold color="blue">📂 最近项目</Text>
      <Box marginBottom={1} />
      {recents.slice(0, 10).map((r, i) => {
        const daysAgo = Math.round((Date.now() - r.lastOpened) / 86400000);
        const timeAgo = daysAgo === 0 ? '今天' : `${daysAgo}天前`;
        return (
          <Text key={r.root} color={i === selected ? 'cyan' : 'grayDim'}>
            {i === selected ? '▶ ' : '  '}{r.name}  <grayDim>({timeAgo})</grayDim>
          </Text>
        );
      })}
      <Text color="grayDim">  ───</Text>
      <Text color={selected === recents.length ? 'yellow' : 'grayDim'}>
        {selected === recents.length ? '▶ ↩ 返回' : '  ↩ 返回'}
      </Text>
    </Box>
  );
}

// ── CreateWizard ─────────────────────────────────────────────────────────────

function CreateWizard({ onComplete }: { onComplete: (path?: string) => void }) {
  const [step, setStep] = useState(0); // 0=name, 1=path, 2=theme, 3=creating, 4=done
  const [siteName, setSiteName] = useState('my-blog');
  const [targetPath, setTargetPath] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ name: string; path: string } | null>(null);

  useInput((input, key) => {
    if (step === 0) {
      if (key.return) {
        if (!siteName.trim()) { setError('名称不能为空'); return; }
        setTargetPath(path.resolve(process.cwd(), siteName.trim()));
        setStep(1);
      } else if (key.backspace) setSiteName(s => s.slice(0, -1));
      else if (key.escape) onComplete();
      else if (input) { setSiteName(s => s + input); setError(''); }
    } else if (step === 1) {
      if (key.return) {
        const resolved = targetPath.trim() || path.resolve(process.cwd(), siteName);
        if (fs.existsSync(resolved) && fs.readdirSync(resolved).length > 0) {
          setError('目录非空，请使用空目录或更换路径'); return;
        }
        setTargetPath(resolved);
        setStep(2);
      } else if (key.backspace) setTargetPath(p => p.slice(0, -1));
      else if (key.escape) onComplete();
      else if (input) { setTargetPath(p => p + input); setError(''); }
    } else if (step === 2) {
      if (key.upArrow) setSelectedTheme(0);
      else if (key.downArrow) setSelectedTheme(1);
      else if (key.return) { setStep(3); doCreate(); }
      else if (key.escape) setStep(0);
    } else if (step === 4) {
      if (key.return || key.escape) {
        if (result) onComplete(result.path);
        else onComplete();
      }
    }
  });

  async function doCreate() {
    const theme = selectedTheme === 0 ? 'dracula' : 'peach';
    try {
      fs.mkdirSync(targetPath, { recursive: true });
      fs.mkdirSync(path.join(targetPath, 'content', 'blogs'), { recursive: true });
      fs.mkdirSync(path.join(targetPath, 'content', 'vlogs'), { recursive: true });
      fs.mkdirSync(path.join(targetPath, 'content', 'photos'), { recursive: true });
      fs.mkdirSync(path.join(targetPath, 'public'), { recursive: true });
      fs.writeFileSync(path.join(targetPath, '.themerc'), theme);
      const date = new Date().toISOString().split('T')[0];
      fs.writeFileSync(path.join(targetPath, 'content', 'about.md'),
        `---\ntitle: 欢迎使用 Memoria\ndate: ${date}\n---\n\n# 欢迎使用 Memoria! 🫘\n\n这是一个基于 **Memoria** 的静态博客。\n`);
      fs.writeFileSync(path.join(targetPath, 'content', 'blogs', 'hello.md'),
        `---\ntitle: 我的第一篇文章\ndate: ${date}\ncategory: 默认分类\n---\n\n# 你好世界！\n\n这是你在 Memoria 的第一篇文章。\n`);
      addRecentProject(targetPath);
      setResult({ name: siteName, path: targetPath });
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep(0);
    }
  }

  return (
    <Box flexDirection="column">
      {step === 0 && (
        <Box flexDirection="column">
          <Text bold color="cyan">🆕 创建新站点</Text>
          <Box marginBottom={1} />
          <Text>站点名称</Text>
          <Text dimColor>[ 路径将基于名称自动生成 ]  </Text>
          <Text bold>{siteName || '<输入中>'}<Text color="grayDim">_</Text></Text>
          {error && <Text color="red">{error}</Text>}
          <Text color="gray" dimColor>按 Enter 确认 | Esc 返回</Text>
        </Box>
      )}
      {step === 1 && (
        <Box flexDirection="column">
          <Text bold color="cyan">🆕 创建新站点</Text>
          <Box marginBottom={1} />
          <Text>保存路径（直接回车或输入自定义路径）</Text>
          <Text dimColor>默认: {path.resolve(process.cwd(), siteName)}</Text>
          <Text color="cyan">{targetPath}<Text color="grayDim">_</Text></Text>
          {error && <Text color="red">{error}</Text>}
          <Text color="gray" dimColor>按 Enter 确认 | Esc 返回</Text>
        </Box>
      )}
      {step === 2 && (
        <Box flexDirection="column">
          <Text bold color="cyan">🎨 选择主题</Text>
          <Box marginBottom={1} />
          <Text color={selectedTheme === 0 ? 'magenta' : 'grayDim'}>{selectedTheme === 0 ? '▶ ' : '  '}1. 🌙 Dracula (暗色)</Text>
          <Text color={selectedTheme === 1 ? 'yellow' : 'grayDim'}>{selectedTheme === 1 ? '▶ ' : '  '}2. ☀️ Peach (亮色)</Text>
          <Box marginBottom={1} />
          <Text color="gray" dimColor>↑↓ 选择 | Enter 确认 | Esc 返回</Text>
        </Box>
      )}
      {step === 3 && <Spinner label="正在创建站点..." />}
      {step === 4 && result && (
        <Box flexDirection="column">
          <Text bold color="green">✅ 站点 "{result.name}" 创建成功！</Text>
          <Box marginBottom={1} />
          <Text dimColor>路径: <Text color="cyan">{result.path}</Text></Text>
          <Text dimColor>主题: {selectedTheme === 0 ? '🌙 Dracula' : '☀️ Peach'}</Text>
          <Box marginBottom={1} />
          <Text color="gray" dimColor>按 Enter 进入项目</Text>
        </Box>
      )}
    </Box>
  );
}

// ── NewContent Wizard ─────────────────────────────────────────────────────

function NewContentWizard({ projectRoot, onComplete }: { projectRoot: string; onComplete: () => void }) {
  const [type, setType] = useState<'blog' | 'vlog' | 'photo'>('blog');
  const [title, setTitle] = useState('');
  const [step, setStep] = useState(0); // 0=type, 1=title, 2=creating
  const [error, setError] = useState('');

  useInput((input, key) => {
    if (step === 0) {
      if (key.upArrow || key.downArrow) setType(t => t === 'blog' ? 'photo' : t === 'vlog' ? 'blog' : 'vlog');
      else if (key.return) setStep(1);
      else if (key.escape) onComplete();
    } else if (step === 1) {
      if (key.return) {
        if (!title.trim()) { setError('标题不能为空'); return; }
        setStep(2);
        doCreate();
      } else if (key.backspace) { setTitle(t => t.slice(0, -1)); setError(''); }
      else if (key.escape) { setStep(0); setTitle(''); }
      else if (input) { setTitle(t => t + input); setError(''); }
    } else if (step === 3) {
      if (key.return || key.escape) onComplete();
    }
  });

  function doCreate() {
    try {
      const typeMap = { blog: 'blogs', vlog: 'vlogs', photo: 'photos' };
      const dir = path.join(projectRoot, 'content', typeMap[type]);
      const slug = title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      const date = new Date().toISOString().split('T')[0];
      const filename = `${date}-${slug}.md`;
      const frontmatter = `---\ntitle: ${title.trim()}\ndate: ${date}\n---\n\n# ${title.trim()}\n\n`;
      fs.writeFileSync(path.join(dir, filename), frontmatter);
      console.log(`\n${c(K.green, '✅ 内容已创建:')} ${path.join(dir, filename)}\n`);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep(0);
    }
  }

  return (
    <Box flexDirection="column">
      {step === 0 && (
        <Box flexDirection="column">
          <Text bold color="cyan">📝 新建内容</Text>
          <Box marginBottom={1} />
          <Text color={type === 'blog' ? 'green' : 'grayDim'}>{type === 'blog' ? '▶ ' : '  '}1. 📝 文章 (blog)</Text>
          <Text color={type === 'vlog' ? 'blue' : 'grayDim'}>{type === 'vlog' ? '▶ ' : '  '}2. 🎬 视频 (vlog)</Text>
          <Text color={type === 'photo' ? 'magenta' : 'grayDim'}>{type === 'photo' ? '▶ ' : '  '}3. 📷 相册 (photo)</Text>
          <Box marginBottom={1} />
          <Text color="gray" dimColor>↑↓ 选择类型 | Enter 确认 | Esc 返回</Text>
        </Box>
      )}
      {step === 1 && (
        <Box flexDirection="column">
          <Text bold color="cyan">📝 新建 {type === 'blog' ? '文章' : type === 'vlog' ? '视频' : '相册'}</Text>
          <Box marginBottom={1} />
          <Text>输入标题</Text>
          <Text bold>{title}<Text color="grayDim">_</Text></Text>
          {error && <Text color="red">{error}</Text>}
          <Text color="gray" dimColor>按 Enter 确认 | Esc 返回</Text>
        </Box>
      )}
      {step === 2 && <Spinner label="正在创建内容..." />}
      {step === 3 && (
        <Box flexDirection="column">
          <Text bold color="green">✅ 内容创建完成！</Text>
          <Box marginBottom={1} />
          <Text color="gray" dimColor>按 Enter 返回</Text>
        </Box>
      )}
    </Box>
  );
}

// ── OutputLog ──────────────────────────────────────────────────────────────

function OutputLog({ lines }: { lines: string[] }) {
  return (
    <Box flexDirection="column">
      {lines.slice(-20).map((line, i) => (
        <Text key={i} color="gray">{line}</Text>
      ))}
    </Box>
  );
}

// ── Main Hub ───────────────────────────────────────────────────────────────

type Screen = 'main' | 'open' | 'create' | 'newContent';

function Hub() {
  const [screen, setScreen] = useState<Screen>('main');
  const [selected, setSelected] = useState(0);
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [commandMode, setCommandMode] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const recents = getRecentProjects().slice(0, 5);

  useInput((input, key) => {
    if (commandMode) {
      if (key.return) {
        executeCommand(commandInput.trim());
        setCommandInput('');
        setCommandMode(false);
      } else if (key.backspace) {
        setCommandInput(v => v.slice(0, -1));
      } else if (key.escape) {
        setCommandInput('');
        setCommandMode(false);
      } else if (input) {
        setCommandInput(v => v + input);
      }
      return;
    }

    if (screen === 'main') {
      if (input === '/') { setCommandMode(true); return; }
      if (key.upArrow) setSelected(s => Math.max(0, s - 1));
      else if (key.downArrow) setSelected(s => Math.min(currentProject ? 6 : 2, s + 1));
      else if (key.return) handleMainSelect();
      else if (input === 'x' || input === 'X') {
        console.log('\n 再见！👋\n');
        process.exit(0);
      }
    }
  });

  function handleMainSelect() {
    if (!currentProject) {
      if (selected === 0) setScreen('create');
      else if (selected === 1) setScreen('open');
      else { console.log('\n 再见！👋\n'); process.exit(0); }
    } else {
      const cmds = [
        'generate', 'bundle', 'server', 'new', 'theme', 'deploy', 'exit'
      ];
      const cmd = cmds[selected];
      if (cmd === 'exit') { console.log('\n 再见！👋\n'); process.exit(0); }
      else runProjectCommand(cmd);
    }
  }

  function openProject(root: string) {
    addRecentProject(root);
    setCurrentProject(root);
    setScreen('main');
    console.log(`\n${c(K.green, '📂 已打开:')} ${getProjectName(root)}`);
    console.log(`   ${c(K.dim, root)}\n`);
  }

  function runProjectCommand(cmd: string) {
    if (!currentProject) return;
    setOutputLines([]);
    const PKG_ROOT = path.resolve(currentProject, '../..');

    try {
      if (cmd === 'new') {
        setScreen('newContent');
        return;
      }

      console.log(`\n${c(K.cyan, '▶ 执行:')} memoria ${cmd}\n`);

      if (cmd === 'generate') {
        const srcIndex = path.join(PKG_ROOT, 'dist', 'src', 'index');
        execSync(`node "${srcIndex}" --root "${currentProject}"`, { cwd: currentProject, stdio: 'inherit' });
        console.log(`\n${c(K.green, '✅ 构建完成！')}\n`);
      } else if (cmd === 'bundle') {
        const srcIndex = path.join(PKG_ROOT, 'dist', 'src', 'index');
        execSync(`node "${srcIndex}" --root "${currentProject}"`, { cwd: currentProject, stdio: 'inherit' });
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const zipName = `memoria-${date}.zip`;
        const zipPath = path.join(currentProject, zipName);
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        execSync(`cd "${path.join(currentProject, 'dist')}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
        console.log(`\n${c(K.green, '✅ 打包完成:')} ${zipName}（${(fs.statSync(zipPath).size / 1024).toFixed(1)} KB）\n`);
      } else if (cmd === 'server') {
        const srcIndex = path.join(PKG_ROOT, 'dist', 'src', 'index');
        execSync(`node "${srcIndex}" --root "${currentProject}" --watch`, { cwd: currentProject, stdio: 'inherit' });
      } else if (cmd === 'theme') {
        const themeScript = path.join(PKG_ROOT, 'dist', 'bin', 'memoria.js');
        execSync(`node "${themeScript}" theme`, { cwd: currentProject, stdio: 'inherit' });
      } else if (cmd === 'deploy') {
        const deployScript = path.join(PKG_ROOT, 'dist', 'bin', 'memoria.js');
        execSync(`node "${deployScript}" deploy`, { cwd: currentProject, stdio: 'inherit' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`\n${c(K.red, '❌ 执行失败:')} ${msg}\n`);
    }
  }

  function executeCommand(cmd: string) {
    if (!cmd) return;

    // Normalize: strip leading slash
    const normalized = cmd.replace(/^\/+/, '');

    if (normalized === 'create') {
      setScreen('create');
    } else if (normalized === 'open') {
      setScreen('open');
    } else if (normalized === 'exit' || normalized === 'quit') {
      console.log('\n 再见！👋\n');
      process.exit(0);
    } else if (normalized === 'help' || normalized === '?') {
      showCommandHelp();
    } else if (currentProject && ['generate', 'bundle', 'server', 'new', 'theme', 'deploy'].includes(normalized)) {
      runProjectCommand(normalized);
    } else if (!currentProject && ['generate', 'bundle', 'server', 'theme', 'deploy'].includes(normalized)) {
      console.log(`\n${c(K.yellow, '⚠️  请先打开一个项目')}\n`);
    } else if (normalized.startsWith('new:')) {
      // parse new:blog, new:vlog, new:photo
      const type = normalized.split(':')[1];
      if (['blog', 'vlog', 'photo'].includes(type)) {
        if (!currentProject) {
          console.log(`\n${c(K.yellow, '⚠️  请先打开一个项目')}\n`);
        } else {
          setScreen('newContent');
        }
      } else {
        console.log(`\n${c(K.red, '❓ 未知命令:')} new:${type}\n`);
        showCommandHelp();
      }
    } else {
      console.log(`\n${c(K.red, '❓ 未知命令:')} ${cmd}\n`);
      showCommandHelp();
    }
  }

  function showCommandHelp() {
    const projCmds = [
      '  /generate   构建站点',
      '  /bundle     构建 + 打包 zip',
      '  /server     本地预览 + 热重载',
      '  /new:blog   新建文章',
      '  /new:vlog   新建视频',
      '  /new:photo  新建相册',
      '  /theme      切换主题',
      '  /deploy     部署站点',
    ];
    console.log(`\n${c(K.cyan, '┌─ TUI 命令 ──────────────────────────────────')}`);
    console.log(`  ${c(K.green, '/create')}  新建站点`);
    console.log(`  ${c(K.blue, '/open')}    打开已有站点`);
    if (currentProject) {
      console.log(`${c(K.cyan, '┌─ 项目命令 ──────────────────────────────────')}`);
      projCmds.forEach(l => console.log(`  ${l}`));
    }
    console.log(`${c(K.cyan, '┌─ 其他 ───────────────────────────────────────')}`);
    console.log(`  ${c(K.gray, '/help')}    显示帮助`);
    console.log(`  ${c(K.gray, '/exit')}    退出 TUI`);
    console.log(`${c(K.cyan, '└─────────────────────────────────────────────')}\n`);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (screen === 'create') {
    return (
      <Box flexDirection="column" padding={1}>
        <Logo />
        <CreateWizard onComplete={(path) => {
          if (path) openProject(path);
          else setScreen('main');
        }} />
      </Box>
    );
  }

  if (screen === 'open') {
    return (
      <Box flexDirection="column" padding={1}>
        <Logo />
        <RecentList
          recents={recents}
          onSelect={root => openProject(root)}
          onBack={() => setScreen('main')}
        />
      </Box>
    );
  }

  if (screen === 'newContent') {
    return (
      <Box flexDirection="column" padding={1}>
        <Logo />
        <Text dimColor>项目: {currentProject}</Text>
        <Box marginBottom={1} />
        <NewContentWizard projectRoot={currentProject!} onComplete={() => setScreen('main')} />
      </Box>
    );
  }

  // Main screen
  return (
    <Box flexDirection="column" padding={1}>
      <Logo />

      {currentProject ? (
        <>
          <Text dimColor>项目: <Text color="cyan">{getProjectName(currentProject)}</Text></Text>
          <Text dimColor>路径: {currentProject}</Text>
          <Box marginBottom={1} />
          <Menu
            items={[
              { label: 'generate  构建站点', emoji: '🔨', color: 'green' },
              { label: 'bundle     构建 + 打包', emoji: '📦', color: 'yellow' },
              { label: 'server     本地预览', emoji: '🌐', color: 'blue' },
              { label: 'new        新建内容', emoji: '📝', color: 'magenta' },
              { label: 'theme      切换主题', emoji: '🎨', color: 'cyan' },
              { label: 'deploy     部署站点', emoji: '🚀', color: 'green' },
              { label: 'exit       退出项目', emoji: 'x', color: 'grayDim' },
            ]}
            selected={selected}
            onSelect={setSelected}
          />
          <Box marginTop={1} />
          <Text dimColor>输入 / 查看所有命令 | /help 显示帮助</Text>
        </>
      ) : (
        <>
          {recents.length > 0 && (
            <>
              <Text color="grayDim">  ─── 最近项目 ───</Text>
              {recents.slice(0, 3).map(r => (
                <Text key={r.root} color="blue" dimColor>  {r.name}</Text>
              ))}
              <Box marginBottom={1} />
            </>
          )}
          <Menu
            items={[
              { label: '新建站点', emoji: '➕', color: 'green' },
              { label: '打开已有站点', emoji: '📂', color: 'blue' },
              { label: '退出', emoji: 'x', color: 'grayDim' },
            ]}
            selected={selected}
            onSelect={setSelected}
          />
          <Box marginTop={1} />
          <Text dimColor>输入 / 进入命令模式 | /help 显示帮助</Text>
        </>
      )}

      {commandMode && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="cyan">{'>'} {commandInput}<Text color="grayDim">_</Text></Text>
          <Text dimColor>按 Enter 执行 | Esc 取消</Text>
        </Box>
      )}
    </Box>
  );
}

// ── Export ───────────────────────────────────────────────────────────────────

export async function showHub(): Promise<void> {
  return new Promise((resolve) => {
    const { waitUntilExit } = render(<Hub />);
    waitUntilExit().then(() => resolve());
  });
}
