/**
 * CreateWizard — 新建站点向导（Layout版）
 * Step 0: 输入名称
 * Step 1: 初始化日志（成功→引导进入，失败→允许重试）
 */
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import * as path from 'path';
import * as fs from 'fs';
import { C } from '../contexts/TUIContext';
import { LogView, LogEntry } from '../components/DetailPanel';
import { BlinkingCursor } from '../components/BlinkingCursor';
import { initSiteNonInteractive } from '../../lib/init';
import { addRecentProject } from '../../lib/recent';
import { applyTheme } from '../../lib/apply-theme';

interface Props {
  onComplete: (projectPath?: string) => void;
}

export function CreateWizard({ onComplete }: Props): React.ReactElement {
  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<{ name: string; path: string } | null>(null);
  const [failed, setFailed] = useState(false);

  // Step 0: 输入站点名称
  useInput((input, key) => {
    if (step !== 0) return;

    if (key.return) {
      if (!name.trim()) { setError('名称不能为空'); return; }
      doCreate(name.trim());
    } else if (key.backspace) {
      setName((n: string) => n.slice(0, -1));
      setError('');
    } else if (key.escape) {
      onComplete();
    } else if (input) {
      setName((n: string) => n + input);
      setError('');
    }
  });

  // Step 1: 创建完成后的按键
  useInput((input, key) => {
    if (step !== 1) return;

    if (result) {
      // 成功：Enter 进入站点，x 退出
      if (key.return) {
        onComplete(result.path);
      } else if (input === 'x' || input === 'X') {
        onComplete(); // 不传路径，回到主菜单（间接实现退出）
      }
    } else if (failed && key.escape) {
      // 失败：Esc 重试
      setStep(0);
      setLogs([]);
      setFailed(false);
    } else if (failed && key.return) {
      // 失败：Enter 返回主菜单
      onComplete();
    }
  });

  async function doCreate(siteName: string): Promise<void> {
    const targetPath = path.resolve(process.cwd(), siteName);

    // 拦截已存在的目录
    if (fs.existsSync(targetPath)) {
      setStep(1);
      setFailed(true);
      setLogs(prev => [...prev, { timestamp: Date.now(), level: 'error', message: `目录 ${siteName} 已存在，请使用其他名称` }]);
      return;
    }

    setStep(1);
    setFailed(false);

    const addLog = (level: LogEntry['level'], message: string) => {
      setLogs(prev => [...prev, { timestamp: Date.now(), level, message }]);
    };

    try {
      const res = await initSiteNonInteractive(
        targetPath, siteName, 'Your Name', '', '', true, true, 'dracula',
        (level, message) => addLog(level, message)
      );

      if (!res.success) {
        addLog('error', res.error || '创建失败');
        setFailed(true);
        return;
      }

      applyTheme(targetPath, 'dracula');
      addRecentProject(targetPath);
      setResult({ name: siteName, path: targetPath });
    } catch (err) {
      addLog('error', err instanceof Error ? err.message : String(err));
      setFailed(true);
    }
  }

  // ── Step 0: 输入名称 ─────────────────────────────────
  if (step === 0) {
    return (
      <Box flexDirection="column" justifyContent="center" alignItems="center" flexGrow={1}>
        <Box flexDirection="column" alignItems="center" gap={1}>
          <Text bold color={C.green}>新建站点</Text>
          <Text dimColor>输入站点名称后按 Enter 确认</Text>
        </Box>

        <Box marginTop={2} flexDirection="column" alignItems="center" gap={1} width={40}>
          <Box flexDirection="row" gap={1}>
            <Text color={C.muted}>名称：</Text>
            <Text bold color={name ? C.cyan : C.muted}>{name || '<输入中>'}</Text>
            {name && <BlinkingCursor />}
          </Box>
          {error && <Text color={C.red}>✗ {error}</Text>}
        </Box>
      </Box>
    );
  }

  // ── Step 1: 初始化日志 ───────────────────────────────
  return (
    <Box flexDirection="column" justifyContent="center" alignItems="center" flexGrow={1}>
      <Box marginBottom={1}>
        <Text bold color={C.green}>🆕 新建站点</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {logs.length > 0 ? (
          <LogView logs={logs} />
        ) : (
          <Text dimColor>准备初始化...</Text>
        )}
      </Box>
      {/* 底部引导提示 */}
      {result && (
        <Box marginTop={1}>
          <Text bold color={C.cyan}>→ 按 Enter 进入 {result.name} 站点</Text>
        </Box>
      )}
      {failed && (
        <Box marginTop={1} flexDirection="column" gap={0}>
          <Text dimColor>Esc 重新输入 · Enter 返回主菜单</Text>
        </Box>
      )}
    </Box>
  );
}