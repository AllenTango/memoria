/**
 * DetailPanel — 右栏：元数据显示 / 日志滚动双模式
 * mode='metadata' 时显示文件/目录元数据
 * mode='log' 时实时滚动显示指令执行日志
 */
import React, { useRef, useEffect } from 'react';
import { Box, Text } from 'ink';
import { C } from '../contexts/TUIContext';

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}


// ── 日志模式 ─────────────────────────────────────────────

export function LogView({ logs, activeCommand }: { logs: LogEntry[]; activeCommand?: string }): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 自动滚动到底部
    if (scrollRef.current) {
      const el = scrollRef.current as any;
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  const levelColor = (level: LogEntry['level']): string => {
    switch (level) {
      case 'success': return C.green;
      case 'error': return C.red;
      case 'warn': return C.yellow;
      default: return C.fg;
    }
  };

  const levelPrefix = (level: LogEntry['level']): string => {
    switch (level) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warn': return '⚠';
      default: return '▷';
    }
  };

  return (
    <Box flexDirection="column" flexGrow={1} overflow="hidden">
      {activeCommand && (
        <Box marginBottom={1} flexDirection="row" gap={1}>
          <Text color={C.purple} bold>▶ 执行:</Text>
          <Text color={C.yellow} bold>{activeCommand}</Text>
        </Box>
      )}

      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {logs.length === 0 ? (
          <Text color={C.muted}>等待指令输出...</Text>
        ) : (
          logs.map((entry, i) => (
            <Box key={i} flexDirection="row" gap={1}>
              <Text color={C.muted} dimColor>
                {new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
              </Text>
              <Text color={levelColor(entry.level)}>
                {levelPrefix(entry.level)}
              </Text>
              <Text color={levelColor(entry.level)} wrap="truncate">
                {entry.message}
              </Text>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}

export function DetailPanel({ logs = [], activeCommand }: { logs: LogEntry[]; activeCommand?: string }): React.ReactElement {
  return <LogView logs={logs} activeCommand={activeCommand} />;
}