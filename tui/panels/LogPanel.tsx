/**
 * LogPanel — 右栏默认日志显示(filter by current command)
 *
 * 没按 Enter 时右栏显示该指令的历史日志(filter by command)
 * 需交互的指令(没历史)右栏显示"按 Enter 触发"提示
 * 按 Enter 后切到 form
 *
 * 与 DetailPanel 区别:LogPanel 接受 command prop 做 filter;DetailPanel 接受 activeCommand 做标题
 */
import React, { useMemo } from 'react';
import { Box } from 'ink';
import { LogView, type LogEntry } from '../components/DetailPanel';

interface Props {
  logs: LogEntry[];
  /** Filter by command(undefined = show all) */
  command?: string;
  /** 可选 — 提示"该指令无历史"时显示 */
  emptyHint?: string;
}

export function LogPanel({ logs, command, emptyHint }: Props): React.ReactElement {
  const filtered = useMemo(
    () => command ? logs.filter(l => l.command === command) : logs,
    [logs, command]
  );
  return (
    <Box flexDirection="column" flexGrow={1}>
      <LogView logs={filtered} activeCommand={command} />
      {filtered.length === 0 && emptyHint && (
        <Box marginTop={1}>
          {/* 提示由父级在右栏直接显示,这里 log entries 为空就什么都不显示 */}
        </Box>
      )}
    </Box>
  );
}
