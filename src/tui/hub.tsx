/**
 * Hub — TUI main orchestrator
 * Modern FlexBox layout (no ASCII boxes)
 * Uses Ink borderStyle + flexGrow for app-like feel
 */
import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useWindowSize, useApp } from 'ink';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';

import { C } from './contexts/TUIContext';
import { Header, Footer, StatusBar } from './components/Frame';
import { SelectableList } from './components/SelectableList';
import { ConfirmBox } from './components/ConfirmBox';

import { getRecentProjects, addRecentProject, isMemoriaProject, getProjectName } from '../../lib/recent';
import { CreateWizard } from './views/CreateWizard';
import { NewContentWizard } from './views/NewContentWizard';
import { ThemePicker } from './views/ThemePicker';
import { RecentList } from './views/RecentList';
import { PathInput } from './views/PathInput';
import { CommandPalette } from './views/CommandPalette';

type Screen = 'main' | 'create' | 'open' | 'browse' | 'newContent' | 'theme';

function Hub(): React.ReactElement {
  const { exit } = useApp();
  const { columns } = useWindowSize();
  const W = Math.max(80, columns);

  const [screen, setScreen] = useState<Screen>('main');
  const [selected, setSelected] = useState(0);
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ cmd: string; label: string } | null>(null);

  const recents = getRecentProjects().slice(0, 5);

  useEffect(() => {
    const cwd = process.cwd();
    if (isMemoriaProject(cwd)) {
      openProject(cwd);
    }
  }, []);

  useInput((input, key) => {
    if (showPalette || confirmTarget) return;
    if (key.ctrl && input === 'c') { sayBye(); return; }

    if (screen === 'main') {
      if (input === '/') { setShowPalette(true); return; }
      if (key.upArrow) setSelected((s: number) => Math.max(0, s - 1));
      else if (key.downArrow) setSelected((s: number) => Math.min(maxMenuItems() - 1, s + 1));
      else if (key.return) handleMainSelect();
      else if (input === 'x' || input === 'X') sayBye();
    }
  });

  function maxMenuItems(): number {
    return currentProject ? 7 : 2;
  }

  function handleMainSelect(): void {
    if (!currentProject) {
      if (selected === 0) setScreen('create');
      else if (selected === 1) setScreen('open');
      else sayBye();
    } else {
      const cmds = ['generate', 'bundle', 'server', 'new', 'theme', 'deploy', 'exit'];
      const cmd = cmds[selected];
      if (cmd === 'exit') sayBye();
      else if (cmd === 'new') { setScreen('newContent'); }
      else if (cmd === 'theme') { setScreen('theme'); }
      else setConfirmTarget({ cmd, label: cmd });
    }
  }

  function openProject(root: string): void {
    addRecentProject(root);
    setCurrentProject(root);
    setScreen('main');
    console.log(`\n${C.green}✓ 已打开: ${getProjectName(root)}${C.fg}`);
    console.log(`  ${C.muted}${root}${C.fg}\n`);
  }

  function executeProjectCmd(cmd: string): void {
    if (!currentProject) return;
    setConfirmTarget(null);
    const pkgRoot = findPkgRoot();
    try {
      console.log(`\n${C.cyan}▶ 执行: memoria ${cmd}${C.fg}\n`);
      if (cmd === 'generate') {
        execSync(`node "${path.join(pkgRoot, 'dist', 'bin', 'memoria.js')}" build`, { cwd: currentProject, stdio: 'inherit' });
        console.log(`\n${C.green}✓ 构建完成${C.fg}\n`);
      } else if (cmd === 'bundle') {
        execSync(`node "${path.join(pkgRoot, 'dist', 'bin', 'memoria.js')}" build`, { cwd: currentProject, stdio: 'inherit' });
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const zipName = `memoria-${date}.zip`;
        const zipPath = path.join(currentProject, zipName);
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        execSync(`cd "${path.join(currentProject, 'dist')}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
        console.log(`\n${C.green}✓ 打包完成${C.fg}\n`);
      } else if (cmd === 'server') {
        execSync(`node "${path.join(pkgRoot, 'dist', 'bin', 'memoria.js')}" preview --watch`, { cwd: currentProject, stdio: 'inherit' });
      } else if (cmd === 'deploy') {
        console.log(`\n${C.yellow}⚠ deploy 功能开发中${C.fg}\n`);
      }
    } catch {
      console.log(`\n${C.red}✗ 执行失败${C.fg}\n`);
    }
  }

  function findPkgRoot(): string {
    const __filename = fileURLToPath(import.meta.url);
    let dir = path.dirname(__filename);
    for (let i = 0; i < 6; i++) {
      if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
      dir = path.dirname(dir);
    }
    return dir;
  }

  function handleCommand(cmd: string): void {
    const c = cmd.trim();
    if (!c) return;
    if (c === '/create') { setScreen('create'); return; }
    if (c === '/open') { setScreen('open'); return; }
    if (c === '/exit' || c === '/quit') { sayBye(); return; }
    if (currentProject) {
      const bare = c.replace(/^\/+/, '');
      if (['generate', 'bundle', 'server', 'deploy'].includes(bare)) {
        executeProjectCmd(bare); return;
      }
    } else {
      const bare = c.replace(/^\/+/, '');
      if (['generate', 'bundle', 'server', 'deploy'].includes(bare)) {
        console.log(`\n${C.yellow}⚠ 请先打开一个项目${C.fg}\n`);
        return;
      }
    }
    console.log(`\n${C.red}✗ 未知命令: ${c}${C.fg}\n`);
  }

  function sayBye(): void {
    console.log(`\n${C.muted}再见！👋${C.fg}\n`);
    exit();
  }

  // ── Screen routing ───────────────────────────────────────────────

  if (screen === 'create') {
    return (
      <Box flexDirection="column" width={W} minWidth={80}>
        <CreateWizard onComplete={(p) => { if (p) openProject(p); else setScreen('main'); }} />
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
            else if (fs.existsSync(dir)) {
              console.log(`\n${C.yellow}⚠ 该目录不是 Memoria 项目${C.fg}\n`);
              setScreen('open');
            } else {
              console.log(`\n${C.red}✗ 目录不存在${C.fg}\n`);
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

  // ── Main screen ──────────────────────────────────────────────────

  const menuItems = currentProject
    ? [
        { label: '🔨  generate   构建站点',      color: C.green },
        { label: '📦  bundle     构建 + 打包',  color: C.orange },
        { label: '🌐  server     本地预览',      color: C.purple },
        { label: '📝  new        新建内容',      color: C.cyan },
        { label: '🎨  theme      切换主题',      color: C.pink },
        { label: '🚀  deploy     部署站点',      color: C.green },
        { label: 'x   exit       退出项目',      color: C.muted },
      ]
    : [
        { label: '➕  create     新建站点',     color: C.green },
        { label: '📂  open       打开项目',     color: C.cyan },
        { label: 'x   exit       退出',         color: C.muted },
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
                <Text color={i === selected ? item.color : C.muted} bold={i === selected} wrap="truncate">
                  {i === selected ? '▶ ' : '  '}{item.label}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

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

      {/* Command palette overlay */}
      {showPalette && (
        <Box position="absolute" top={0} left={0} right={0} bottom={0}>
          <CommandPalette
            onCommand={(cmd) => { setShowPalette(false); handleCommand(cmd); }}
            onClose={() => setShowPalette(false)}
          />
        </Box>
      )}

      {/* Confirm dialog overlay */}
      {confirmTarget && (
        <Box position="absolute" top={0} left={0} right={0} bottom={0}>
          <ConfirmBox
            message={`执行 /${confirmTarget.label}？`}
            onConfirm={() => executeProjectCmd(confirmTarget.cmd)}
            onCancel={() => setConfirmTarget(null)}
          />
        </Box>
      )}
    </Box>
  );
}

export async function showHub(cwd?: string): Promise<void> {
  return new Promise((resolve) => {
    if (cwd && isMemoriaProject(cwd)) {
      addRecentProject(cwd);
    }
    const { waitUntilExit } = render(<Hub />, {
      alternateScreen: true,
      exitOnCtrlC: false,
    });
    waitUntilExit().then(() => resolve());
  });
}
