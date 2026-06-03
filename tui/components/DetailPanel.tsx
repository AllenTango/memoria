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

interface MetadataProps {
  type: 'directory' | 'blog' | 'vlog' | 'photo';
  name: string;
  path: string;
  date?: string;
  tags?: string[];
  description?: string;
  childCount?: number;
}

interface DetailPanelProps {
  mode: 'metadata' | 'log';
  metadata?: MetadataProps;
  logs?: LogEntry[];
  activeCommand?: string;
}

// ── 元数据模式 ────────────────────────────────────────────

function MetadataView({ metadata }: { metadata: MetadataProps }): React.ReactElement {
  const typeLabels = { directory: '📁 目录', blog: '📝 文章', vlog: '🎬 影像', photo: '📷 相册' };

  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box flexDirection="row" gap={1}>
        <Text color={C.cyan} bold>类型:</Text>
        <Text color={C.fg}>{typeLabels[metadata.type] || metadata.type}</Text>
      </Box>

      <Box flexDirection="row" gap={1}>
        <Text color={C.cyan} bold>名称:</Text>
        <Text color={C.fg} bold wrap="truncate">{metadata.name}</Text>
      </Box>

      {metadata.date && (
        <Box flexDirection="row" gap={1}>
          <Text color={C.cyan} bold>日期:</Text>
          <Text color={C.fg}>{metadata.date}</Text>
        </Box>
      )}

      {metadata.childCount !== undefined && (
        <Box flexDirection="row" gap={1}>
          <Text color={C.cyan} bold>内容:</Text>
          <Text color={C.fg}>{metadata.childCount} 个文件</Text>
        </Box>
      )}

      {metadata.tags && metadata.tags.length > 0 && (
        <Box flexDirection="column" gap={0}>
          <Text color={C.cyan} bold>标签:</Text>
          <Box flexDirection="row" gap={1} flexWrap="wrap">
            {metadata.tags.map((tag, i) => (
              <Text key={i} color={C.purple}>({tag})</Text>
            ))}
          </Box>
        </Box>
      )}

      {metadata.description && (
        <Box flexDirection="column" gap={0}>
          <Text color={C.cyan} bold>描述:</Text>
          <Text color={C.fg} wrap="truncate">{metadata.description}</Text>
        </Box>
      )}

      <Box flexDirection="column" gap={0} marginTop={1}>
        <Text color={C.cyan} bold>路径:</Text>
        <Text color={C.muted} wrap="truncate">{metadata.path}</Text>
      </Box>
    </Box>
  );
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

export function DetailPanel({ mode, metadata, logs = [], activeCommand }: DetailPanelProps): React.ReactElement {
  if (mode === 'log') {
    return <LogView logs={logs} activeCommand={activeCommand} />;
  }

  if (mode === 'metadata' && metadata) {
    return <MetadataView metadata={metadata} />;
  }

  return (
    <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
      <Text color={C.muted}>选中文件查看详情</Text>
      <Text color={C.muted} dimColor>或执行指令查看日志</Text>
    </Box>
  );
}