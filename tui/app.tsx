/**
 * App — TUI 顶层状态机
 * Layout: Header + Sidebar(30%) + Detail(70%) + StatusBar
 * 状态：Selector(站点选择) ↔ Dashboard(站点管理)
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { render, useInput, useApp } from 'ink';
import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

import { type LogEntry } from './components/DetailPanel';

import { getRecentProjects, addRecentProject, isMemoriaProject, getProjectName } from '../lib/recent';
import { buildSite, bundleSite } from '../lib/build';
import { startServer, stopServer, isServerRunning } from '../lib/server-manager';
import { openInEditor, openDir } from '../lib/editor';
import {
  CreateWizard,
  NewContentWizard,
  ThemePicker,
  RecentList,
  PathInput,
  SiteSelector,
  SiteDashboard,
} from './views';

// 日志保留条数上限,超过后丢弃最早条数,避免长会话累积导致渲染卡顿
const LOG_CAP = 200;

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

  // ── 状态 ──────────────────────────────────────────

  const [screen, setScreen] = useState<Screen>('main');
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ cmd: string; label: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err' | 'warn' | 'info'; msg: string } | null>(null);

  // FileTree 状态
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);

  // DetailPanel 状态
  const [detailMode, setDetailMode] = useState<DetailMode>('metadata');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeCommand, setActiveCommand] = useState<string | null>(null);

  // Server 状态
  const [serverRunning, setServerRunning] = useState(false);

  // 缓存:home 目录解析/读盘只在 currentProject/screen 切换时重做,避免每帧都重读 recent.json
  const recents = useMemo(() => {
    // 仅在站点选择相关页面才需要读最近项目
    if (screen !== 'main' && screen !== 'open' && screen !== 'browse') return [] as ReturnType<typeof getRecentProjects>;
    return getRecentProjects().slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, currentProject]);

  // ── Ref 镜像 ──
  // 把高频回调(handleCommand / useInput 等)依赖的几个 state 镜像到 ref,
  // 这样回调本身可以保持稳定引用,避免下游 React.memo 组件被无效重渲染。
  const currentProjectRef = useRef<string | null>(null);
  const screenRef = useRef<Screen>('main');
  const confirmTargetRef = useRef<typeof confirmTarget>(null);
  useEffect(() => { currentProjectRef.current = currentProject; }, [currentProject]);
  useEffect(() => { screenRef.current = screen; }, [screen]);
  useEffect(() => { confirmTargetRef.current = confirmTarget; }, [confirmTarget]);

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
    setLogs(prev => {
      const next = prev.length >= LOG_CAP ? prev.slice(prev.length - LOG_CAP + 1) : prev.slice();
      next.push({ timestamp: Date.now(), level, message });
      return next;
    });
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
  // 全局快捷键 handler:用 useCallback 稳定 + ref 拿最新 state,避免 useInput 频繁 unregister/register
  const handleGlobalInput = useCallback((input: string, key: { ctrl?: boolean }) => {
    // 命令面板开启时忽略其他输入
    if (confirmTargetRef.current) return;

    // 全局快捷键
    if (key.ctrl && input === 'c') { doExit(); return; }

    const s = screenRef.current;
    const proj = currentProjectRef.current;
    if (s === 'main' && proj) {
      if (input === 'x' || input === 'X') { doExit(); return; }
    }
    if (s === 'main' && !proj) {
      if (input === 'c' || input === 'C') { setScreen('create'); return; }
      if (input === 'o' || input === 'O') { setScreen('open'); return; }
      if (input === 'x' || input === 'X') { doExit(); return; }
    }
  }, []);
  useInput(handleGlobalInput);

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
    // 关键:从 ref 拿最新 currentProject,而不是闭包 React state
    // (因为 handleCommand 是 useCallback([]),executeCmd 内的 server 任务
    //  捕获的是 mount 时的 handleStartServer,闭包 currentProject=null)
    const project = currentProjectRef.current;
    if (!project) {
      setFeedback({ type: 'err', msg: '✗ 项目未打开' });
      return;
    }
    if (isServerRunning()) {
      setFeedback({ type: 'warn', msg: '⚠ 服务器已在运行' });
      return;
    }

    setDetailMode('log');
    setActiveCommand('/server');
    setLogs([]);
    appendLog('info', '正在构建站点...');

    try {
      await startServer(project, 3000, appendLog);
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
    // 用 ref 拿最新 project,避免 stale closure(因为本函数被 useCallback 的 handleCommand 调用)
    const project = currentProjectRef.current;
    if (!project) return;
    setConfirmTarget(null);

    const tasks: Record<string, () => Promise<void>> = {
      generate: showLogsForCommand('/generate', async () => {
        appendLog('info', '开始构建站点...');
        const result = buildSite({ rootDir: project });
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
        const result = bundleSite({ rootDir: project });
        if (result.success) {
          appendLog('success', '✓ 打包完成');
          setFeedback({ type: 'ok', msg: '✓ 打包完成' });
        } else {
          result.errors.forEach(e => appendLog('error', e));
          setFeedback({ type: 'err', msg: `✗ 打包失败` });
        }
      }),
      server: async () => { await handleStartServer(); },
      stop: async () => { await handleStopServer(); },
      open: async () => {
        try {
          await openDir(project);
          appendLog('success', `✓ 已在文件管理器中打开项目目录`);
          setFeedback({ type: 'ok', msg: '✓ 已在文件管理器中打开' });
        } catch (err) {
          appendLog('error', err instanceof Error ? err.message : String(err));
          setFeedback({ type: 'err', msg: `✗ 打开目录失败` });
        }
      },
      deploy: async () => {
        setFeedback({ type: 'warn', msg: '⚠ deploy 功能开发中' });
      },
    };

    const task = tasks[cmd];
    if (task) await task();
  }

  const handleCommand = useCallback((input: string): void => {
    const c = input.trim();
    if (!c) return;
    const bare = c.replace(/^\/+/, '');
    const project = currentProjectRef.current;
    if (['generate', 'bundle', 'deploy', 'open', 'server', 'stop'].includes(bare)) {
      if (!project) {
        setFeedback({ type: 'warn', msg: '⚠ 请先打开一个项目' });
        return;
      }
      void executeCmd(bare);
    } else if (bare === 'theme') {
      if (!project) {
        setFeedback({ type: 'warn', msg: '⚠ 请先打开一个项目' });
        return;
      }
      setScreen('theme');
    } else if (bare === 'new') {
      if (!project) {
        setFeedback({ type: 'warn', msg: '⚠ 请先打开一个项目' });
        return;
      }
      setScreen('newContent');
    } else {
      setFeedback({ type: 'err', msg: `✗ 未知命令: ${c}` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 文件树回调 ────────────────────────────────────

  const handleFileSelect = useCallback(async (filePath: string) => {
    if (!currentProjectRef.current) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadFileMetadata, appendLog]);

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
        <RecentList
          recents={recents}
          onSelect={root => openProject(root)}
          onBack={() => setScreen('main')}
          onBrowse={() => setScreen('browse')}
          serverRunning={serverRunning}
        />
      );
    }

    if (screen === 'browse') {
      return (
        <PathInput
          onSubmit={(dir) => {
            if (isMemoriaProject(dir)) openProject(dir);
            else {
              setFeedback({ type: 'err', msg: '✗ 目录不存在或不是项目' });
              setScreen('open');
            }
          }}
          onCancel={() => setScreen('open')}
          serverRunning={serverRunning}
        />
      );
    }
  }

  // ── SiteSelector 视图（未打开项目）───────────────

  if (!currentProject && screen === 'main') {
    return (
      <SiteSelector
        onMenuConfirm={(i) => { if (i === 0) setScreen('create'); else setScreen('open'); }}
        onRecentSelect={(root) => openProject(root)}
      />
    );
  }

  // ── Create Wizard 视图（统一 Layout）─────────────────────────
  if (!currentProject && screen === 'create') {
    return <CreateWizard onComplete={(p) => { if (p) openProject(p); setScreen('main'); }} />;
  }

  // ── ThemePicker 视图 ────────────────────────────────
  if (screen === 'theme' && currentProject) {
    return (
      <ThemePicker
        projectRoot={currentProject}
        onClose={() => setScreen('main')}
      />
    );
  }

  // ── NewContentWizard 视图（Layout 在 view 内部）─────────
  if (screen === 'newContent' && currentProject) {
    return (
      <NewContentWizard
        projectRoot={currentProject}
        onComplete={() => setScreen('main')}
        serverRunning={serverRunning}
      />
    );
  }

  // ── SiteDashboard 视图（已打开项目）───────────────

  return (
    <SiteDashboard
      currentProject={currentProject}
      logs={logs}
      activeCommand={activeCommand}
      serverRunning={serverRunning}
      onCommand={handleCommand}
    />
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