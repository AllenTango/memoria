// @ts-nocheck
/**
 * Memoria TUI - Pure ink + React
 * Entry hub for creating/opening sites
 */
import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { getRecentProjects, addRecentProject, isMemoriaProject, getProjectName } from './recent.js';
import * as path from 'path';
import * as fs from 'fs';

// ── Types ─────────────────────────────────────────────────────────────────

interface RecentProject {
  root: string;
  name: string;
  lastOpened: number;
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

// ── ConfirmInput ─────────────────────────────────────────────────────────────

function ConfirmInput({ question, onConfirm }: { question: string; onConfirm: () => void }) {
  const [value, setValue] = useState('');
  useInput((input, key) => {
    if (key.return) {
      onConfirm();
    } else if (key.escape || input === 'n' || input === 'N') {
      process.exit(0);
    } else if (input) {
      setValue(v => v + input);
    }
  });
  return <Text color="gray">{question} (Enter 确定, n/N 取消): {value}</Text>;
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
    else if (key.return) confirmSelect();
  });

  function confirmSelect() {
    if (selected === items.length - 1) {
      process.exit(0);
    }
    onSelect(selected);
  }

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
    else if (key.downArrow) setSelected(s => Math.min(recents.length - 1, s + 1));
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
      <Text
        color={selected === recents.length ? 'yellow' : 'grayDim'}
        bold={selected === recents.length}
      >
        {selected === recents.length ? '▶ ↩ 返回' : '  ↩ 返回'}
      </Text>
    </Box>
  );
}

// ── PathInput ───────────────────────────────────────────────────────────────

function PathInput({ label, defaultValue, onSubmit }: {
  label: string;
  defaultValue: string;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [inputRef, setInputRef] = useState<React.ReactNode>(null);

  useInput((input, key) => {
    if (key.return) {
      onSubmit(value);
    } else if (key.backspace) {
      setValue(v => v.slice(0, -1));
    } else if (key.escape) {
      process.exit(0);
    } else if (input) {
      setValue(v => v + input);
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="cyan">{label}</Text>
      <Text>
        <Text color="white">{value}</Text>
        <Text color="grayDim">_</Text>
      </Text>
      <Text color="gray" dimColor>按 Enter 确认，Esc 退出</Text>
    </Box>
  );
}

// ── CreateWizard ─────────────────────────────────────────────────────────────

function CreateWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0); // 0=name, 1=path, 2=theme, 3=creating, 4=done
  const [siteName, setSiteName] = useState('my-blog');
  const [targetPath, setTargetPath] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ name: string; path: string } | null>(null);

  useInput((input, key) => {
    if (step === 0) {
      // Name input
      if (key.return) {
        if (!siteName.trim()) {
          setError('名称不能为空');
          return;
        }
        setTargetPath(path.resolve(process.cwd(), siteName.trim()));
        setStep(1);
      } else if (key.backspace) {
        setSiteName(s => s.slice(0, -1));
        setError('');
      } else if (key.escape) {
        onComplete();
      } else if (input) {
        setSiteName(s => s + input);
        setError('');
      }
    } else if (step === 1) {
      // Path input
      if (key.return) {
        const resolved = targetPath.trim() || path.resolve(process.cwd(), siteName);
        if (fs.existsSync(resolved) && fs.readdirSync(resolved).length > 0) {
          setError('目录非空，请使用空目录或更换路径');
          return;
        }
        setTargetPath(resolved);
        setStep(2);
      } else if (key.backspace) {
        setTargetPath(p => p.slice(0, -1));
        setError('');
      } else if (key.escape) {
        onComplete();
      } else if (input) {
        setTargetPath(p => p + input);
        setError('');
      }
    } else if (step === 2) {
      // Theme selection
      if (key.upArrow) setSelectedTheme(0);
      else if (key.downArrow) setSelectedTheme(1);
      else if (key.return) {
        setStep(3);
        doCreate();
      } else if (key.escape) {
        setStep(0);
      }
    } else if (step === 4) {
      // Done
      if (key.return || key.escape) onComplete();
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
          <Text>
            <Text dimColor>[ 路径将基于名称自动生成 ]  </Text>
          </Text>
          <Text>
            <Text bold>{siteName || '<输入中>'}</Text>
            <Text color="grayDim">_</Text>
          </Text>
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
          <Text>
            <Text color="cyan">{targetPath}</Text>
            <Text color="grayDim">_</Text>
          </Text>
          {error && <Text color="red">{error}</Text>}
          <Text color="gray" dimColor>按 Enter 确认 | Esc 返回</Text>
        </Box>
      )}

      {step === 2 && (
        <Box flexDirection="column">
          <Text bold color="cyan">🎨 选择主题</Text>
          <Box marginBottom={1} />
          <Text color={selectedTheme === 0 ? 'magenta' : 'grayDim'}>
            {selectedTheme === 0 ? '▶ ' : '  '}1. 🌙 Dracula (暗色)
          </Text>
          <Text color={selectedTheme === 1 ? 'yellow' : 'grayDim'}>
            {selectedTheme === 1 ? '▶ ' : '  '}2. ☀️ Peach (亮色)
          </Text>
          <Box marginBottom={1} />
          <Text color="gray" dimColor>↑↓ 选择 | Enter 确认 | Esc 返回</Text>
        </Box>
      )}

      {step === 3 && (
        <Box flexDirection="column">
          <Spinner label="正在创建站点..." />
        </Box>
      )}

      {step === 4 && result && (
        <Box flexDirection="column">
          <Text bold color="green">✅ 站点 "{result.name}" 创建成功！</Text>
          <Box marginBottom={1} />
          <Text dimColor>路径: <Text color="cyan">{result.path}</Text></Text>
          <Text dimColor>主题: {selectedTheme === 0 ? '🌙 Dracula' : '☀️ Peach'}</Text>
          <Box marginBottom={1} />
          <Text dimColor>memoria preview  — 预览站点</Text>
          <Text dimColor>memoria new blog "标题"  — 新建内容</Text>
          <Box marginBottom={1} />
          <Text color="gray" dimColor>按 Enter 返回主菜单</Text>
        </Box>
      )}
    </Box>
  );
}

// ── Main Hub ───────────────────────────────────────────────────────────────

type Screen = 'main' | 'open' | 'create';

function Hub() {
  const [screen, setScreen] = useState<Screen>('main');
  const [selected, setSelected] = useState(0);
  const recents = getRecentProjects().slice(0, 3);

  useInput((input, key) => {
    if (screen === 'main') {
      if (key.upArrow) setSelected(s => Math.max(0, s - 1));
      else if (key.downArrow) setSelected(s => Math.min(2, s + 1));
      else if (key.return) handleMainSelect();
      else if (input === 'x' || input === 'X') {
        console.log('\n 再见！👋\n');
        process.exit(0);
      }
    } else if (screen === 'open') {
      // handled by RecentList
    }
  });

  function handleMainSelect() {
    if (selected === 0) setScreen('create');
    else if (selected === 1) setScreen('open');
    else {
      console.log('\n 再见！👋\n');
      process.exit(0);
    }
  }

  function handleOpenSelect(root: string) {
    addRecentProject(root);
    console.log(`\n📂 已打开: ${getProjectName(root)}`);
    console.log(`   ${root}\n`);
    setTimeout(() => setScreen('main'), 1500);
  }

  if (screen === 'create') {
    return (
      <Box flexDirection="column" padding={1}>
        <Logo />
        <CreateWizard onComplete={() => { setSelected(0); setScreen('main'); }} />
      </Box>
    );
  }

  if (screen === 'open') {
    return (
      <Box flexDirection="column" padding={1}>
        <Logo />
        <RecentList
          recents={recents}
          onSelect={handleOpenSelect}
          onBack={() => setScreen('main')}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Logo />

      {recents.length > 0 && (
        <>
          <Text color="grayDim">  ─── 最近项目 ───</Text>
          {recents.map(r => (
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
