/**
 * DetailPanel — 右栏：日志滚动模式
 * 元数据模式已被简化(由 FileTree 内部承担),这里专注于日志
 */
import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { C } from '../contexts/TUIContext';

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  /** 关联的指令名(app.tsx 嘅 onCommand 传入),用于 SiteDashboard 按 cmd filter logs */
  command?: string;
}

// 渲染时只保留末尾 N 条,避免长会话下 Box/Text 节点线性增长导致渲染卡顿
const RENDER_LOG_CAP = 80;

const LEVEL_COLOR: Record<LogEntry['level'], string> = {
  success: C.green,
  error: C.red,
  warn: C.yellow,
  info: C.fg,
};

const LEVEL_PREFIX: Record<LogEntry['level'], string> = {
  success: '✓',
  error: '✗',
  warn: '⚠',
  info: '▷',
};

interface LogViewProps {
  logs: LogEntry[];
  activeCommand?: string;
}

function LogViewImpl({ logs, activeCommand }: LogViewProps): React.ReactElement {
  // 取末尾 N 条,加 useMemo 避免每次 render 都重新切片
  const visible = useMemo(() => {
    if (logs.length <= RENDER_LOG_CAP) return logs;
    return logs.slice(logs.length - RENDER_LOG_CAP);
  }, [logs]);

  const hidden = logs.length - visible.length;

  // 时间格式用 Intl.DateTimeFormat 缓存(避免每次 render 重建 formatter)
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    []
  );

  return (
    <Box flexDirection="column" flexGrow={1} overflow="hidden">
      {activeCommand && (
        <Box marginBottom={1} flexDirection="row" gap={1}>
          <Text color={C.purple} bold>▶ 执行:</Text>
          <Text color={C.yellow} bold>{activeCommand}</Text>
        </Box>
      )}

      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visible.length === 0 ? (
          <Text color={C.muted}>等待指令输出...</Text>
        ) : (
          <>
            {hidden > 0 && (
              <Text dimColor color={C.muted}>…已折叠 {hidden} 条更早日志</Text>
            )}
            {visible.map((entry) => (
              <Box key={entry.timestamp + ':' + entry.message.slice(0, 8)} flexDirection="row" gap={1}>
                <Text color={C.muted} dimColor>
                  {timeFormatter.format(entry.timestamp)}
                </Text>
                <Text color={LEVEL_COLOR[entry.level]}>
                  {LEVEL_PREFIX[entry.level]}
                </Text>
                <Text color={LEVEL_COLOR[entry.level]} wrap="truncate">
                  {entry.message}
                </Text>
              </Box>
            ))}
          </>
        )}
      </Box>
    </Box>
  );
}

// React.memo: logs 引用没变就不重渲染父级传入
export const LogView = React.memo(LogViewImpl, (prev, next) => {
  return prev.logs === next.logs && prev.activeCommand === next.activeCommand;
});

export function DetailPanel({ logs = [], activeCommand }: { logs: LogEntry[]; activeCommand?: string }): React.ReactElement {
  return <LogView logs={logs} activeCommand={activeCommand} />;
}
