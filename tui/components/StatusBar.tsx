/**
 * StatusBar — 底部状态栏，Server 状态动态颜色
 */
import React from 'react';
import { Box, Text } from 'ink';
import { C } from '../contexts/TUIContext';

interface StatusBarProps {
  serverRunning: boolean;
  shortcuts?: [string, string][];
}

export function StatusBar({ serverRunning, shortcuts }: StatusBarProps): React.ReactElement {
  const serverColor = serverRunning ? C.green : C.red;
  const serverLabel = serverRunning ? 'RUNNING' : 'STOPPED';

  const defaultShortcuts: [string, string][] = [
    ['/', '指令'],
    ['↑↓', '选择'],
    ['Enter', '确认'],
    ['Esc', '返回/取消'],
    ['x', '退出'],
  ];

  const items = shortcuts || defaultShortcuts;

  return (
    <Box
      borderStyle="round"
      borderColor={C.muted}
      paddingX={1}
      flexDirection="column"
    >
      <Box flexDirection="row" gap={3} flexWrap="wrap" alignItems="center">
        {/* Server status */}
        <Box flexDirection="row" gap={1}>
          <Text color={C.muted}>Server:</Text>
          <Text color={serverColor} bold>
            {serverLabel}
          </Text>
        </Box>

        {/* Separator */}
        <Text color={C.muted}>|</Text>

        {/* Shortcuts */}
        <Box flexDirection="row" gap={1} flexWrap="wrap" alignItems="center">
          {items.map(([key, desc], i) => (
            <React.Fragment key={i}>
              <Text color={C.yellow} bold>{key}</Text>
              <Text color={C.muted}>{desc}</Text>
              {i < items.length - 1 && <Text color={C.muted}> · </Text>}
            </React.Fragment>
          ))}
        </Box>
      </Box>
    </Box>
  );
}