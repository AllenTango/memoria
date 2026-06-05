/**
 * App — TUI 顶层状态机
 *
 * 简化后只剩两个 page:
 *   - 'selector': 未打开项目,显示 SiteSelector
 *   - 'dashboard': 已打开项目,显示 SiteDashboard
 *
 * 原本"开新页面"嘅操作(CreateWizard / NewContentWizard / ThemePicker /
 *  RecentList / PathInput)都嵌入 SiteSelector / SiteDashboard 嘅右栏,
 * 由各 view 内部 mode 状态管理,Layout 不知道 mode
 *
 * 父级职责:
 *   - 维护 currentProject / logs / activeCommand / serverRunning
 *   - 处理 /generate /bundle /server /stop /open /deploy 6 个项目命令
 *   - 透传 /new /theme 俾 SiteDashboard 嘅 onCommand(由其切右栏 mode)
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { render, useApp } from 'ink';

import { type LogEntry } from './components/DetailPanel';

import {
  addRecentProject,
  isMemoriaProject,
  getProjectName,
} from '../lib/recent';
import { buildSite, bundleSite } from '../lib/build';
import { startServer, stopServer, isServerRunning } from '../lib/server-manager';
import { openDir } from '../lib/editor';
import { SiteSelector } from './views/SiteSelector';
import { SiteDashboard } from './views/SiteDashboard';

// 日志保留条数上限
const LOG_CAP = 200;

type Page = 'selector' | 'dashboard';

export function App(): React.ReactElement {
  const { exit } = useApp();

  // ── Page 状态 ──
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const page: Page = currentProject ? 'dashboard' : 'selector';

  // ── Logs / Server 状态 ──
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeCommand, setActiveCommand] = useState<string | null>(null);
  const [serverRunning, setServerRunning] = useState(false);

  // ── 反馈(toast) ──
  const [, setFeedback] = useState<{ type: 'ok' | 'err' | 'warn' | 'info'; msg: string } | null>(null);

  // ── Ref 镜像(避免 useCallback stale closure) ──
  const currentProjectRef = useRef<string | null>(null);
  useEffect(() => { currentProjectRef.current = currentProject; }, [currentProject]);

  // ── 日志操作 ──
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

  // ── 项目操作 ──
  const openProject = useCallback((root: string): void => {
    addRecentProject(root);
    setCurrentProject(root);
    clearLogs();
    setFeedback({ type: 'ok', msg: `✓ 已打开: ${getProjectName(root)}` });
  }, [clearLogs]);

  // ── 退出 ──
  const doExit = useCallback((): void => {
    if (isServerRunning()) {
      stopServer().catch(() => {});
    }
    setFeedback({ type: 'info', msg: '再见！👋' });
    setTimeout(() => exit(), 100);
  }, [exit]);

  // ── 父级命令处理(只处理 6 个项目命令) ──
  // /new / /theme 由 SiteDashboard 拦截处理(切右栏 mode)
  // 唔识嘅命令静默忽略(SiteDashboard 已拦截常用命令)
  const handleCommand = useCallback((input: string): void => {
    const c = input.trim();
    if (!c) return;
    const bare = c.replace(/^\/+/, '').trim();
    const project = currentProjectRef.current;
    if (!project) {
      // Selector 阶段:CommandInput 收到命令但冇项目,SiteSelector 会自己处理 /exit
      // 这里静默
      return;
    }
    if (['generate', 'bundle', 'deploy', 'open', 'server', 'stop'].includes(bare)) {
      void executeCmd(bare, project, appendLog, setFeedback, setActiveCommand, setServerRunning, setLogs, clearLogs);
    }
    // 其他命令已经被 SiteDashboard 拦截(/new / /theme)
  }, [appendLog, clearLogs]);

  // ── 渲染 ──
  if (page === 'selector') {
    return (
      <SiteSelector
        serverRunning={serverRunning}
        onOpenProject={openProject}
        onExit={doExit}
      />
    );
  }

  return (
    <SiteDashboard
      currentProject={currentProject!}
      logs={logs}
      activeCommand={activeCommand}
      serverRunning={serverRunning}
      onCommand={handleCommand}
      onExit={doExit}
    />
  );
}

// ── executeCmd 抽成顶层函数,避免闭包 ──

async function executeCmd(
  cmd: string,
  project: string,
  appendLog: (level: LogEntry['level'], message: string) => void,
  setFeedback: (f: { type: 'ok' | 'err' | 'warn' | 'info'; msg: string } | null) => void,
  setActiveCommand: (s: string | null) => void,
  setServerRunning: (b: boolean) => void,
  setLogs: (updater: (prev: LogEntry[]) => LogEntry[]) => void,
  clearLogs: () => void
): Promise<void> {
  if (cmd === 'generate') {
    setActiveCommand('/generate');
    setLogs(() => []);
    appendLog('info', '开始构建站点...');
    const result = buildSite({ rootDir: project });
    if (result.success) {
      appendLog('success', `✓ 构建完成 (${result.stats?.blogs} blogs, ${result.stats?.vlogs} vlogs, ${result.stats?.photos} photos)`);
      setFeedback({ type: 'ok', msg: '✓ 构建完成' });
    } else {
      result.errors.forEach(e => appendLog('error', e));
      setFeedback({ type: 'err', msg: '✗ 构建失败' });
    }
    setTimeout(() => setActiveCommand(null), 1500);
    return;
  }

  if (cmd === 'bundle') {
    setActiveCommand('/bundle');
    setLogs(() => []);
    appendLog('info', '开始打包站点...');
    const result = bundleSite({ rootDir: project });
    if (result.success) {
      appendLog('success', '✓ 打包完成');
      setFeedback({ type: 'ok', msg: '✓ 打包完成' });
    } else {
      result.errors.forEach(e => appendLog('error', e));
      setFeedback({ type: 'err', msg: '✗ 打包失败' });
    }
    setTimeout(() => setActiveCommand(null), 1500);
    return;
  }

  if (cmd === 'server') {
    if (isServerRunning()) {
      setFeedback({ type: 'warn', msg: '⚠ 服务器已在运行' });
      return;
    }
    setActiveCommand('/server');
    setLogs(() => []);
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
    setTimeout(() => setActiveCommand(null), 2000);
    return;
  }

  if (cmd === 'stop') {
    if (!isServerRunning()) {
      setFeedback({ type: 'warn', msg: '⚠ 服务器未运行' });
      return;
    }
    setActiveCommand('/stop');
    setLogs(() => []);
    appendLog('info', '正在停止服务器...');
    await stopServer();
    setServerRunning(false);
    appendLog('success', '✓ 服务器已停止');
    setFeedback({ type: 'ok', msg: '✓ 服务器已停止' });
    setTimeout(() => setActiveCommand(null), 1500);
    return;
  }

  if (cmd === 'open') {
    try {
      await openDir(project);
      appendLog('success', '✓ 已在文件管理器中打开项目目录');
      setFeedback({ type: 'ok', msg: '✓ 已在文件管理器中打开' });
    } catch (err) {
      appendLog('error', err instanceof Error ? err.message : String(err));
      setFeedback({ type: 'err', msg: '✗ 打开目录失败' });
    }
    return;
  }

  if (cmd === 'deploy') {
    setFeedback({ type: 'warn', msg: '⚠ deploy 功能开发中' });
    return;
  }
}

// ── 暴露给 CLI 入口 ──

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
