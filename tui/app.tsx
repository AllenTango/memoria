/**
 * App — TUI 顶层状态机
 * Layout: Header + Sidebar(30%) + Detail(70%) + StatusBar
 * 状态：Selector(站点选择) ↔ Dashboard(站点管理)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { render, Box, Text, useInput, useWindowSize, useApp } from 'ink';
import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

import { C } from './contexts/TUIContext';
import { Layout } from './components/Layout';
import { StatusBar } from './components/StatusBar';
import { FileTree } from './components/FileTree';
import { DetailPanel, type LogEntry } from './components/DetailPanel';
import { ConfirmBox } from './components/ConfirmBox';
import { SelectableList } from './components/SelectableList';
import { Spinner } from './components/Spinner';
import { BlinkingCursor } from './components/BlinkingCursor';

import { getRecentProjects, addRecentProject, isMemoriaProject, getProjectName } from '../lib/recent';
import { buildSite, bundleSite } from '../lib/build';
import { startServer, stopServer, isServerRunning } from '../lib/server-manager';
import { openInEditor } from '../lib/editor';
import { CreateWizard } from './views/CreateWizard';
import { NewContentWizard } from './views/NewContentWizard';
import { ThemePicker } from './views/ThemePicker';
import { RecentList } from './views/RecentList';
import { PathInput } from './views/PathInput';
import { CommandPalette } from './views/CommandPalette';

// ── 类型 ──────────────────────────────────────────────

type Screen = 'main' | 'create' | 'open' | 'browse' | 'newContent' | 'theme';
type DetailMode = 'metadata' | 'log';

interface FileMetadata {
  type: 'directory' | 'blog' | 'vlog' | 'photo';
  name: string;
  path: string;
  date?: string;
  tags?: string[];
  description?: string;
  childCount?: number;
}

// ── App 主组件 ────────────────────────────────────────

function App(): React.ReactElement {
  const { exit } = useApp();
  const { columns, rows } = useWindowSize();
  const W = Math.max(80, columns);

  // ── 状态 ──────────────────────────────────────────

  const [screen, setScreen] = useState<Screen>('main');
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ cmd: string; label: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err' | 'warn' | 'info'; msg: string } | null>(null);

  // FileTree 状态
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);

  // Menu 状态（站点选择器）
  const [menuSelected, setMenuSelected] = useState(0);
  const menuItems = [
    { label: '新建站点', color: C.green },
    { label: '打开项目', color: C.cyan },
  ];

  // DetailPanel 状态
  const [detailMode, setDetailMode] = useState<DetailMode>('metadata');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeCommand, setActiveCommand] = useState<string | null>(null);

  // Server 状态
  const [serverRunning, setServerRunning] = useState(false);

  const recents = getRecentProjects().slice(0, 5);

  // ── 文件元数据加载 ──────────────────────────────────

  const loadFileMetadata = useCallback((filePath: string | null) => {
    if (!filePath) {
      setFileMetadata(null);
      return;
    }

    try {
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        const entries = fs.readdirSync(filePath, { withFileTypes: true });
        const childCount = entries.filter(e => !e.name.startsWith('.')).length;
        setFileMetadata({
          type: 'directory',
          name: path.basename(filePath),
          path: filePath,
          childCount,
        });
      } else if (filePath.endsWith('.md')) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const { data: fm } = matter(raw);
        const typeMap: Record<string, 'blog' | 'vlog' | 'photo'> = {
          blog: 'blog', vlog: 'vlog', photo: 'photo',
        };
        const type = typeMap[fm.type] || 'blog';
        setFileMetadata({
          type,
          name: fm.title || path.basename(filePath, '.md'),
          path: filePath,
          date: fm.date ? String(fm.date).slice(0, 10) : undefined,
          tags: Array.isArray(fm.tags) ? fm.tags : [],
          description: fm.description || undefined,
        });
      }
    } catch {
      setFileMetadata(null);
    }
  }, []);

  // ── 日志操作 ────────────────────────────────────────

  const appendLog = useCallback((level: LogEntry['level'], message: string) => {
    setLogs(prev => [...prev, { timestamp: Date.now(), level, message }]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setActiveCommand(null);
  }, []);

  const showLogsForCommand = useCallback((cmdName: string, executor: () => Promise<void>) => {
    return (): Promise<void> => {
      return new Promise(async (resolve) => {
        setDetailMode('log');
        setActiveCommand(cmdName);
        setLogs([]);
        appendLog('info', `开始执行: ${cmdName}`);

        try {
          await executor();
          appendLog('success', `${cmdName} 完成`);
          setTimeout(() => {
            setDetailMode('metadata');
            setActiveCommand(null);
          }, 1500);
          resolve();
        } catch (err) {
          appendLog('error', err instanceof Error ? err.message : String(err));
          setTimeout(() => {
            setDetailMode('metadata');
            setActiveCommand(null);
          }, 2000);
          resolve();
        }
      });
    };
  }, [appendLog]);

  // ── 键盘输入 ───────────────────────────────────────

  useInput((input, key) => {
    // 命令面板开启时忽略其他输入
    if (showPalette || confirmTarget) return;

    // 全局快捷键
    if (key.ctrl && input === 'c') { doExit(); return; }

    if (screen === 'main' && currentProject) {
      // Dashboard 快捷键
      if (input === 'p' || input === 'P') {
        void handleStartServer();
        return;
      }
      if (input === 's' || input === 'S') {
        void handleStopServer();
        return;
      }
      if (input === '/') { setShowPalette(true); return; }
      if (input === 'x' || input === 'X') {
        // 关闭项目，返回站点选择
        setCurrentProject(null);
        setSelectedFilePath(null);
        setFileMetadata(null);
        setScreen('main');
        return;
      }
    }

    if (screen === 'main' && !currentProject) {
      if (input === 'c' || input === 'C') { setScreen('create'); return; }
      if (input === 'o' || input === 'O') { setScreen('open'); return; }
      if (input === '/') { setShowPalette(true); return; }
      if (input === 'x' || input === 'X') { doExit(); return; }
    }
  });

  // ── 项目操作 ────────────────────────────────────────

  function openProject(root: string): void {
    addRecentProject(root);
    setCurrentProject(root);
    setScreen('main');
    setFeedback({ type: 'ok', msg: `✓ 已打开: ${getProjectName(root)}` });
    clearLogs();
    setDetailMode('metadata');
    setSelectedFilePath(null);
    setFileMetadata(null);
  }

  async function handleStartServer(): Promise<void> {
    if (!currentProject) return;
    if (isServerRunning()) {
      setFeedback({ type: 'warn', msg: '⚠ 服务器已在运行' });
      return;
    }

    setDetailMode('log');
    setActiveCommand('/server');
    setLogs([]);
    appendLog('info', '正在构建站点...');

    try {
      await startServer(currentProject);
      setServerRunning(true);
      appendLog('success', '🌐 预览服务器已启动 http://localhost:3000');
      setFeedback({ type: 'ok', msg: '✓ 服务器已启动' });
    } catch (err) {
      appendLog('error', err instanceof Error ? err.message : String(err));
      setFeedback({ type: 'err', msg: '✗ 启动失败' });
    }
    setTimeout(() => setDetailMode('metadata'), 2000);
  }

  async function handleStopServer(): Promise<void> {
    if (!isServerRunning()) {
      setFeedback({ type: 'warn', msg: '⚠ 服务器未运行' });
      return;
    }

    setDetailMode('log');
    setActiveCommand('/stop');
    setLogs([]);
    appendLog('info', '正在停止服务器...');

    await stopServer();
    setServerRunning(false);
    appendLog('success', '✓ 服务器已停止');
    setFeedback({ type: 'ok', msg: '✓ 服务器已停止' });
    setTimeout(() => setDetailMode('metadata'), 1500);
  }

  async function executeCmd(cmd: string): Promise<void> {
    if (!currentProject) return;
    setConfirmTarget(null);

    const tasks: Record<string, () => Promise<void>> = {
      generate: showLogsForCommand('/generate', async () => {
        appendLog('info', '开始构建站点...');
        const result = buildSite({ rootDir: currentProject });
        if (result.success) {
          appendLog('success', `✓ 构建完成 (${result.stats?.blogs} blogs, ${result.stats?.vlogs} vlogs, ${result.stats?.photos} photos)`);
          setFeedback({ type: 'ok', msg: `✓ 构建完成` });
        } else {
          result.errors.forEach(e => appendLog('error', e));
          setFeedback({ type: 'err', msg: `✗ 构建失败` });
        }
      }),
      bundle: showLogsForCommand('/bundle', async () => {
        appendLog('info', '开始打包站点...');
        const result = bundleSite({ rootDir: currentProject });
        if (result.success) {
          appendLog('success', '✓ 打包完成');
          setFeedback({ type: 'ok', msg: '✓ 打包完成' });
        } else {
          result.errors.forEach(e => appendLog('error', e));
          setFeedback({ type: 'err', msg: '✗ 打包失败' });
        }
      }),
      server: async () => { await handleStartServer(); },
      deploy: async () => {
        setFeedback({ type: 'warn', msg: '⚠ deploy 功能开发中' });
      },
    };

    const task = tasks[cmd];
    if (task) await task();
  }

  function handleCommand(input: string): void {
    const c = input.trim();
    if (!c) return;
    if (c === '/create') { setScreen('create'); return; }
    if (c === '/open') { setScreen('open'); return; }
    if (c === '/exit' || c === '/quit') { doExit(); return; }

    const bare = c.replace(/^\/+/, '');
    if (['generate', 'b', 'bundle', 'server', 'deploy'].includes(bare)) {
      if (!currentProject) {
        setFeedback({ type: 'warn', msg: '⚠ 请先打开一个项目' });
        return;
      }
      // b is alias for generate
      void executeCmd(bare === 'b' ? 'generate' : bare);
    } else if (bare === 'theme') {
      if (!currentProject) {
        setFeedback({ type: 'warn', msg: '⚠ 请先打开一个项目' });
        return;
      }
      setScreen('theme');
    } else {
      setFeedback({ type: 'err', msg: `✗ 未知命令: ${c}` });
    }
  }

  // ── 文件树回调 ────────────────────────────────────

  const handleFileSelect = useCallback(async (filePath: string) => {
    if (!currentProject) return;
    setSelectedFilePath(filePath);
    loadFileMetadata(filePath);
    setDetailMode('metadata');

    // 唤起编辑器
    try {
      await openInEditor(filePath);
      appendLog('info', `✓ 已保存: ${path.basename(filePath)}`);
      // 刷新元数据（可能用户修改了标题/日期等）
      loadFileMetadata(filePath);
    } catch (err) {
      if (err instanceof Error && err.message.includes('文件不存在')) {
        appendLog('error', `✗ 文件不存在: ${filePath}`);
      } else if (err instanceof Error && err.message.includes('无法启动编辑器')) {
        appendLog('error', `✗ ${err.message}`);
        setFeedback({ type: 'err', msg: `✗ 无法启动编辑器` });
      }
    }
  }, [currentProject, loadFileMetadata, appendLog]);

  // ── 退出 ──────────────────────────────────────────

  function doExit(): void {
    if (isServerRunning()) {
      stopServer().catch(() => {});
    }
    setFeedback({ type: 'info', msg: '再见！👋' });
    setTimeout(() => exit(), 100);
  }

  // ── SiteSelector 视图 ─────────────────────────────

  if (!currentProject && screen !== 'main') {
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
              else {
                setFeedback({ type: 'err', msg: '✗ 目录不存在或不是项目' });
                setScreen('open');
              }
            }}
            onCancel={() => setScreen('open')}
          />
        </Box>
      );
    }
  }

  // ── SiteSelector 视图（未打开项目）───────────────

  if (!currentProject && screen === 'main') {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return (
      <Layout siteName={undefined} sitePath={undefined} serverRunning={serverRunning} height={rows}>
        <>
          {/* Left Sidebar — 菜单列表 */}
          <Box flexDirection="column" flexGrow={1}>
            <SelectableList
              items={menuItems}
              selected={menuSelected}
              onSelect={setMenuSelected}
              onConfirm={(i) => {
                if (i === 0) setScreen('create');
                else setScreen('open');
              }}
            />
          </Box>
        </>

        <>
          {/* Right Detail — 最近项目 + 快捷键提示 */}
          <Box flexDirection="column" flexGrow={1} gap={1}>
            {recents.length > 0 && (
              <Box flexDirection="column">
                <Text dimColor bold>最近项目</Text>
                <Box flexDirection="column" marginTop={0} gap={0}>
                  {recents.slice(0, 5).map((r) => (
                    <Text
                      key={r.root}
                      color={C.cyan}
                      wrap="truncate"
                      onClick={() => openProject(r.root)}
                    >
                      📂 {r.name}
                    </Text>
                  ))}
                </Box>
              </Box>
            )}
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor>↑↓ 选择 · Enter 确认 · Esc 退出</Text>
            </Box>
          </Box>
        </>
      </Layout>
    );
  }

  // ── Create Wizard 视图（统一 Layout）─────────────
  if (!currentProject && screen === 'create') {
    return (
      <Layout siteName="新建站点" sitePath={undefined} serverRunning={serverRunning} height={rows}>
        <>
          {/* Left Sidebar — 创建引导 */}
          <Box flexDirection="column" gap={1}>
            <Text bold color={C.green}>🆕 新建站点</Text>
            <Text dimColor>填写名称和路径即可创建新站点</Text>
            <Box flexDirection="column" marginTop={1} gap={0}>
              <Text color={C.muted}>① 输入名称</Text>
              <Text color={C.muted}>② 确认路径</Text>
              <Text color={C.muted}>③ 选择主题</Text>
              <Text color={C.muted}>④ 创建完成</Text>
            </Box>
            <Text dimColor marginTop={2}>Esc 返回</Text>
          </Box>
        </>

        <>
          {/* Right Detail — 创建向导 */}
          <CreateWizard onComplete={(p) => { if (p) openProject(p); setScreen('main'); }} />
        </>
      </Layout>
    );
  }

  // ── Command Palette Overlay ───────────────────────
  if (showPalette) {
    return (
      <Box position="absolute" top={0} left={0} right={0} bottom={0}>
        <CommandPalette
          onCommand={(cmd) => { setShowPalette(false); handleCommand(cmd); }}
          onClose={() => setShowPalette(false)}
        />
      </Box>
    );
  }

  // ── SiteDashboard 视图（已打开项目）───────────────

  return (
    <Layout
      siteName={currentProject ? getProjectName(currentProject) : undefined}
      sitePath={currentProject}
      serverRunning={serverRunning}
      height={rows}
    >
      <>
        {/* Left Sidebar — FileTree */}
        <FileTree
          rootDir={currentProject || ''}
          selectedPath={selectedFilePath}
          onSelectFile={handleFileSelect}
        />
      </>

      <>
        {/* Right Detail/Log */}
        <DetailPanel
          mode={detailMode}
          metadata={fileMetadata || undefined}
          logs={logs}
          activeCommand={activeCommand || undefined}
        />
      </>
    </Layout>
  );
}

// ── 暴露给 CLI 入口 ─────────────────────────────────

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