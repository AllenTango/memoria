/**
 * CreateWizard — 新建站点向导（简化版）
 * Step 0: 居中输入框输入站点名称
 * Step 1: 初始化日志显示（顶栏与输入框之间）
 * 布局: 顶栏(标题) + 中部(日志) + 底栏(快捷键提示)
 */
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import * as path from 'path';
import { C } from '../contexts/TUIContext';
import { Spinner } from '../components/Spinner';
import { BlinkingCursor } from '../components/BlinkingCursor';
import { LogView, LogEntry } from '../components/DetailPanel';
import { initSiteNonInteractive } from '../../lib/init';
import { addRecentProject } from '../../lib/recent';
import { applyTheme } from '../../lib/apply-theme';

const THEMES = [
  { label: 'Dracula', name: 'dracula', color: C.pink, emoji: '🌙' },
  { label: 'Peach',    name: 'peach',   color: C.orange, emoji: '☀️' },
];

interface Props {
  onComplete: (projectPath?: string) => void;
}

export function CreateWizard({ onComplete }: Props): React.ReactElement {
  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<{ name: string; path: string } | null>(null);

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

  async function doCreate(siteName: string): Promise<void> {
    setStep(1);
    const targetPath = path.resolve(process.cwd(), siteName);

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
        setTimeout(() => onComplete(), 2000);
        return;
      }

      applyTheme(targetPath, 'dracula');
      addRecentProject(targetPath);
      addLog('success', `✓ ${siteName} 创建完成`);
      setResult({ name: siteName, path: targetPath });
    } catch (err) {
      addLog('error', err instanceof Error ? err.message : String(err));
      setTimeout(() => onComplete(), 2000);
    }
  }

  // ── Step 1: 等待用户按 Enter 返回 ──
  useInput((input, key) => {
    if (step !== 1) return;
    if (result && (key.return || key.escape)) {
      onComplete(result.path);
    } else if (!result && key.escape) {
      onComplete();
    }
  });

  // ── 渲染 ──────────────────────────────────────────

  // Step 0: 输入名称
  if (step === 0) {
    return (
      <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
        <Box flexDirection="column" alignItems="center" gap={1}>
          <Text bold color={C.green}>🆕 新建站点</Text>
          <Text dimColor>输入站点名称后按 Enter 确认</Text>
        </Box>

        <Box marginTop={2} flexDirection="column" alignItems="center" gap={1} width={40}>
          <Box flexDirection="row" gap={1}>
            <Text color={C.muted}>名称：</Text>
            <Text bold color={name ? C.cyan : C.muted} wrap="truncate">
              {name || <Text dimColor><i>&lt;输入中&gt;</i></Text>}
            </Text>
            {name && <BlinkingCursor />}
          </Box>
          {error && <Text color={C.red}>✗ {error}</Text>}
        </Box>

        <Box marginTop={2}>
          <Text dimColor>↑↓选择 · Enter 确认 · Esc 退出</Text>
        </Box>
      </Box>
    );
  }

  // Step 1: 初始化日志
  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* 顶栏 */}
      <Box borderStyle="round" borderColor={C.green} paddingX={1} flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold color={C.green}>🆕 新建站点</Text>
          {result && (
            <Text dimColor>✓ 完成</Text>
          )}
          {!result && (
            <Box flexDirection="row" gap={1}>
              <Spinner label="" />
              <Text dimColor>初始化中...</Text>
            </Box>
          )}
        </Box>

        {/* 顶栏与输入框之间: 日志区 */}
        <Box flexDirection="column" flexGrow={1} marginTop={1} overflow="hidden">
          {logs.length > 0 && <LogView logs={logs} />}
        </Box>
      </Box>

      {/* 底栏 */}
      <Box marginTop={1}>
        {result ? (
          <Text dimColor>按 Enter 进入项目 · Esc 返回主菜单</Text>
        ) : (
          <Text dimColor>初始化中，请稍候...</Text>
        )}
      </Box>
    </Box>
  );
}
