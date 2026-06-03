/**
 * App — TUI top-level state machine
 * 顶层状态机：状态管理 + 路由 + 事件分发
 * 所有业务逻辑委托给 lib/ 层
 */
import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useWindowSize, useApp } from 'ink';

import { C } from './contexts/TUIContext';
import { ConfirmBox } from './components/ConfirmBox';
import { SelectableList } from './components/SelectableList';

import { getRecentProjects, addRecentProject, isMemoriaProject, getProjectName } from '../../lib/recent';
import { buildSite, bundleSite, startPreview } from '../../lib/build';
import { CreateWizard } from './views/CreateWizard';
import { NewContentWizard } from './views/NewContentWizard';
import { ThemePicker } from './views/ThemePicker';
import { RecentList } from './views/RecentList';
import { PathInput } from './views/PathInput';
import { CommandPalette } from './views/CommandPalette';

type Screen = 'main' | 'create' | 'open' | 'browse' | 'newContent' | 'theme';

interface MenuItem {
  label: string;
  color: string;
  cmd: string | null; // null = navigation/非命令项
}

function App(): React.ReactElement {
  const { exit } = useApp();
  const { columns } = useWindowSize();
  const W = Math.max(80, columns);

  const [screen, setScreen] = useState<Screen>('main');
  const [selected, setSelected] = useState(0);
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ cmd: string; label: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err' | 'warn' | 'info'; msg: string } | null>(null);

  const recents = getRecentProjects().slice(0, 5);

  // 自动检测当前目录
  useEffect(() => {
    const cwd = process.cwd();
    if (isMemoriaProject(cwd)) {
      openProject(cwd);
    }
  }, []);

  // 键盘输入分发
  useInput((input, key) => {
    if (showPalette || confirmTarget) return;
    if (key.ctrl && input === 'c') { doExit(); return; }

    if (screen === 'main') {
      if (input === '/') { setShowPalette(true); return; }
      if (key.upArrow) setSelected(s => Math.max(0, s - 1));
      else if (key.downArrow) setSelected(s => Math.min(maxMenuItems() - 1, s + 1));
      else if (key.return) handleMainSelect();
      else if (input === 'x' || input === 'X') doExit();
    }
  });

  // ── helpers ────────────────────────────────────────────────────────────

  function maxMenuItems(): number {
    return currentProject ? 7 : 2;
  }

  function openProject(root: string): void {
    addRecentProject(root);
    setCurrentProject(root);
    setScreen('main');
    setFeedback({ type: 'ok', msg: `✓ 已打开: ${getProjectName(root)}` });
  }

  // ── menu handlers ───────────────────────────────────────────────────────

  function handleMainSelect(): void {
    if (!currentProject) {
      if (selected === 0) setScreen('create');
      else if (selected === 1) setScreen('open');
      else doExit();
    } else {
      const cmds = ['generate', 'bundle', 'server', 'new', 'theme', 'deploy', 'exit'] as const;
      const cmd = cmds[selected];
      if (cmd === 'exit') doExit();
      else if (cmd === 'new') { setScreen('newContent'); }
      else if (cmd === 'theme') { setScreen('theme'); }
      else { setConfirmTarget({ cmd, label: cmd }); }
    }
  }

  async function executeCmd(cmd: string): Promise<void> {
    if (!currentProject) return;
    setConfirmTarget(null);
    setFeedback({ type: 'info', msg: `▶ 执行: memoria ${cmd}` });

    try {
      if (cmd === 'generate') {
        const result = buildSite({ rootDir: currentProject });
        if (result.success) {
          setFeedback({ type: 'ok', msg: `✓ 构建完成 (${result.stats.blogs} blogs, ${result.stats.vlogs} vlogs, ${result.stats.photos} photos)` });
        } else {
          setFeedback({ type: 'err', msg: `✗ 构建失败: ${result.errors.join(', ')}` });
        }
      } else if (cmd === 'bundle') {
        const result = bundleSite({ rootDir: currentProject });
        if (result.success) {
          setFeedback({ type: 'ok', msg: `✓ 打包完成` });
        } else {
          setFeedback({ type: 'err', msg: `✗ 打包失败: ${result.errors.join(', ')}` });
        }
      } else if (cmd === 'server') {
        setFeedback({ type: 'info', msg: '🌐 启动预览服务器...' });
        await startPreview({ rootDir: currentProject });
      } else if (cmd === 'deploy') {
        setFeedback({ type: 'warn', msg: '⚠ deploy 功能开发中' });
      }
    } catch (err) {
      setFeedback({ type: 'err', msg: `✗ 执行失败: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  function handleCommand(input: string): void {
    const c = input.trim();
    if (!c) return;
    if (c === '/create') { setScreen('create'); return; }
    if (c === '/open') { setScreen('open'); return; }
    if (c === '/exit' || c === '/quit') { doExit(); return; }

    const bare = c.replace(/^\/+/, '');
    if (['generate', 'bundle', 'server', 'deploy'].includes(bare)) {
      if (!currentProject) {
        setFeedback({ type: 'warn', msg: '⚠ 请先打开一个项目' });
        return;
      }
      void executeCmd(bare);
    } else {
      setFeedback({ type: 'err', msg: `✗ 未知命令: ${c}` });
    }
  }

  function doExit(): void {
    setFeedback({ type: 'info', msg: '再见！👋' });
    setTimeout(() => exit(), 100);
  }

  // ── screen routing ─────────────────────────────────────────────────────

  if (screen === 'create') {
    return (
      <Box flexDirection="column" width={W} minWidth={80}>
        <CreateWizard onComplete={(p) => { if (p) openProject(p); setScreen('main'); }} />
      </Box>
    );
  }

  if (screen === 'open') {
    return (
      <Box flexDirection="column" width={W} minWidth={80}>
        <RecentList
          recents={recents}
          onSelect={root => openProject(root)}
          onBack={() => setScreen('main')}
          onBrowse={() => setScreen('browse')}
        />
      </Box>
    );
  }

  if (screen === 'browse') {
    return (
      <Box flexDirection="column" width={W} minWidth={80}>
        <PathInput
          onSubmit={(dir) => {
            if (isMemoriaProject(dir)) openProject(dir);
            else if (process.env.DEV) {
              setFeedback({ type: 'warn', msg: '⚠ 该目录不是 Memoria 项目' });
              setScreen('open');
            } else {
              setFeedback({ type: 'err', msg: '✗ 目录不存在或不是项目' });
              setScreen('open');
            }
          }}
          onCancel={() => setScreen('open')}
        />
      </Box>
    );
  }

  if (screen === 'theme') {
    return (
      <Box flexDirection="column" width={W} minWidth={80}>
        <ThemePicker projectRoot={currentProject!} onClose={() => setScreen('main')} />
      </Box>
    );
  }

  if (screen === 'newContent') {
    return (
      <Box flexDirection="column" width={W} minWidth={80}>
        <NewContentWizard projectRoot={currentProject!} onComplete={() => setScreen('main')} />
      </Box>
    );
  }

  // ── main screen ─────────────────────────────────────────────────────────

  const menuItems: MenuItem[] = currentProject
    ? [
        { label: '🔨  generate   构建站点',    color: C.green, cmd: 'generate' },
        { label: '📦  bundle     构建+打包',   color: C.orange, cmd: 'bundle' },
        { label: '🌐  server     本地预览',    color: C.purple, cmd: 'server' },
        { label: '📝  new        新建内容',    color: C.cyan, cmd: null },
        { label: '🎨  theme      切换主题',    color: C.pink, cmd: null },
        { label: '🚀  deploy     部署站点',    color: C.green, cmd: 'deploy' },
        { label: 'x   exit       退出项目',    color: C.muted, cmd: null },
      ]
    : [
        { label: '➕  create     新建站点',    color: C.green, cmd: null },
        { label: '📂  open       打开项目',    color: C.cyan, cmd: null },
        { label: 'x   exit       退出',        color: C.muted, cmd: null },
      ];

  return (
    <Box flexDirection="column" width={W} minWidth={80}>
      {/* Title bar */}
      <Box borderStyle="round" borderColor={C.purple} paddingX={1} flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold color={C.purple}>📚 Memoria</Text>
          <Text dimColor>{currentProject ? `📂 ${getProjectName(currentProject)}` : 'TUI'}</Text>
        </Box>
      </Box>

      {/* Menu panel */}
      <Box flexGrow={1} flexDirection="column" marginTop={1}>
        <Box borderStyle="round" borderColor={C.cyan} flexDirection="column" flexGrow={1} paddingX={1}>
          <Text color={C.muted} bold>● 主菜单</Text>
          <Box flexDirection="column" marginTop={1} gap={0}>
            {menuItems.map((item, i) => (
              <Box key={i} flexDirection="row">
                <Text
                  color={i === selected ? item.color : C.muted}
                  bold={i === selected}
                  wrap="truncate"
                >
                  {i === selected ? '▶ ' : '  '}{item.label}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Feedback */}
      {feedback && (
        <Box marginTop={1} borderStyle="round" borderColor={feedback.type === 'err' ? C.red : feedback.type === 'warn' ? C.yellow : feedback.type === 'ok' ? C.green : C.muted} paddingX={1}>
          <Text color={feedback.type === 'err' ? C.red : feedback.type === 'warn' ? C.yellow : feedback.type === 'ok' ? C.green : C.muted}>
            {feedback.msg}
          </Text>
        </Box>
      )}

      {/* Recent projects */}
      {!currentProject && recents.length > 0 && (
        <Box marginTop={1} borderStyle="round" borderColor={C.muted} paddingX={1} flexDirection="column">
          <Text dimColor bold>● 最近项目</Text>
          <Box flexDirection="column" marginTop={1} gap={0}>
            {recents.slice(0, 3).map(r => (
              <Text key={r.root} color={C.cyan} wrap="truncate">  {r.name}</Text>
            ))}
          </Box>
        </Box>
      )}

      {/* Status bar */}
      <Box marginTop={1} borderStyle="round" borderColor={C.muted} paddingX={1}>
        <Text dimColor>
          按 <Text color={C.yellow} bold>/</Text> 打开命令面板 · <Text dimColor>↑↓</Text> 导航 · <Text dimColor>Enter</Text> 确认 · <Text dimColor>x</Text> 退出
        </Text>
      </Box>

      {/* Command palette */}
      {showPalette && (
        <Box position="absolute" top={0} left={0} right={0} bottom={0}>
          <CommandPalette
            onCommand={(cmd) => { setShowPalette(false); handleCommand(cmd); }}
            onClose={() => setShowPalette(false)}
          />
        </Box>
      )}

      {/* Confirm dialog */}
      {confirmTarget && (
        <Box position="absolute" top={0} left={0} right={0} bottom={0}>
          <ConfirmBox
            message={`执行 /${confirmTarget.label}？`}
            onConfirm={() => void executeCmd(confirmTarget.cmd)}
            onCancel={() => setConfirmTarget(null)}
          />
        </Box>
      )}
    </Box>
  );
}

export async function showApp(cwd?: string): Promise<void> {
  return new Promise((resolve) => {
    if (cwd && isMemoriaProject(cwd)) {
      addRecentProject(cwd);
    }
    const { waitUntilExit } = render(<App />, {
      alternateScreen: true,
      exitOnCtrlC: false,
    });
    waitUntilExit().then(() => resolve());
  });
}
