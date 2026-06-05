/**
 * App — TUI 顶层状态机
 *
 * 简化后只剩两个 page:
 *   - 'selector': 未打开项目,显示 SiteSelector
 *   - 'dashboard': 已打开项目,显示 SiteDashboard
 *
 * 命令触发:
 *   - SiteSelector / SiteDashboard 内部维护指令菜单,Enter 触发
 *   - executable 指令通过 onCommand 回调传上嚟(app.tsx 内部 executeCmd 处理)
 *   - interactive 指令(新建/切换主题等)view 自己处理,唔经 onCommand
 *
 * 父级职责:
 *   - 维护 currentProject / logs / serverRunning
 *   - 维护 appendLog(支持 command field,SiteDashboard 按 cmd filter)
 *   - executeCmd 内部 appendLog 时带 cmd 名(用 'info' 'warn' 'error' 'success' 级别)
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
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

const LOG_CAP = 200;

type Page = 'selector' | 'dashboard';

export function App(): React.ReactElement {
  const { exit } = useApp();

  // ── Page 状态 ──
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const page: Page = currentProject ? 'dashboard' : 'selector';

  // ── Logs / Server 状态 ──
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [serverRunning, setServerRunning] = useState(false);

  // ── Ref 镜像 ──
  const currentProjectRef = useRef<string | null>(null);
  useEffect(() => { currentProjectRef.current = currentProject; }, [currentProject]);

  // ── 日志操作(支持 command field,SiteDashboard 按 cmd filter) ──
  const appendLog = useCallback((level: LogEntry['level'], message: string, command?: string) => {
    setLogs(prev => {
      const next = prev.length >= LOG_CAP ? prev.slice(prev.length - LOG_CAP + 1) : prev.slice();
      next.push({ timestamp: Date.now(), level, message, command });
      return next;
    });
  }, []);

  // ── 项目操作 ──
  const openProject = useCallback((root: string): void => {
    addRecentProject(root);
    setCurrentProject(root);
    setLogs([]);
    setServerRunning(false);
  }, []);

  // ── 退出 ──
  const doExit = useCallback((): void => {
    if (isServerRunning()) {
      stopServer().catch(() => {});
    }
    setTimeout(() => exit(), 100);
  }, [exit]);

  // ── 父级命令处理(SiteDashboard 菜单的 executable 指令触发) ──
  // 6 个命令 + syncTheme(占位)
  const handleCommand = useCallback((cmd: string): void => {
    const project = currentProjectRef.current;
    if (!project) return; // Selector 阶段冇项目
    void executeCmd(cmd, project, appendLog, setServerRunning, setLogs);
  }, [appendLog]);

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
      serverRunning={serverRunning}
      onCommand={handleCommand}
      onExit={doExit}
    />
  );
}

// ── executeCmd 抽成顶层函数(避免闭包 stale state) ──
// SiteDashboard 嘅 menu 触发 onCommand(cmd) 传上嚟,呢度处理 6 个 cmd + syncTheme
async function executeCmd(
  cmd: string,
  project: string,
  appendLog: (level: LogEntry['level'], message: string, command?: string) => void,
  setServerRunning: (b: boolean) => void,
  setLogs: (updater: (prev: LogEntry[]) => LogEntry[]) => void,
): Promise<void> {
  if (cmd === 'generate') {
    appendLog('info', '开始构建站点...', 'generate');
    setLogs(() => []);
    const result = buildSite({ rootDir: project });
    if (result.success) {
      appendLog('success', `✓ 构建完成 (${result.stats?.blogs} blogs, ${result.stats?.vlogs} vlogs, ${result.stats?.photos} photos)`, 'generate');
    } else {
      result.errors.forEach(e => appendLog('error', e, 'generate'));
    }
    return;
  }

  if (cmd === 'bundle') {
    appendLog('info', '开始打包站点...', 'bundle');
    setLogs(() => []);
    const result = bundleSite({ rootDir: project });
    if (result.success) {
      appendLog('success', '✓ 打包完成', 'bundle');
    } else {
      result.errors.forEach(e => appendLog('error', e, 'bundle'));
    }
    return;
  }

  if (cmd === 'server') {
    if (isServerRunning()) {
      appendLog('warn', '⚠ 服务器已在运行', 'server');
      return;
    }
    appendLog('info', '正在构建站点...', 'server');
    setLogs(() => []);
    try {
      await startServer(project, 3000, (level, msg) => appendLog(level, msg, 'server'));
      setServerRunning(true);
      appendLog('success', '🌐 预览服务器已启动 http://localhost:3000', 'server');
    } catch (err) {
      appendLog('error', err instanceof Error ? err.message : String(err), 'server');
    }
    return;
  }

  if (cmd === 'stop') {
    if (!isServerRunning()) {
      appendLog('warn', '⚠ 服务器未运行', 'stop');
      return;
    }
    appendLog('info', '正在停止服务器...', 'stop');
    setLogs(() => []);
    await stopServer();
    setServerRunning(false);
    appendLog('success', '✓ 服务器已停止', 'stop');
    return;
  }

  if (cmd === 'openDir') {
    try {
      await openDir(project);
      appendLog('success', '✓ 已在文件管理器中打开项目目录', 'openDir');
    } catch (err) {
      appendLog('error', err instanceof Error ? err.message : String(err), 'openDir');
    }
    return;
  }

  if (cmd === 'deploy') {
    appendLog('warn', '⚠ deploy 功能开发中', 'deploy');
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
