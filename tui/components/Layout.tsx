/**
 * Layout — 四区布局：Header + Sidebar(30%) + Detail(70%) + StatusBar + CommandInput
 */
import React from 'react';
import { Box, Text } from 'ink';
import { C } from '../contexts/TUIContext';
import { StatusBar } from './StatusBar';
import { CommandInput } from './CommandInput';

interface LayoutProps {
  children: [React.ReactNode, React.ReactNode]; // [Sidebar, Detail]
  siteName?: string;
  sitePath?: string;
  serverRunning: boolean;
  height?: number;
  showCommandInput?: boolean;
  onCommand?: (cmd: string) => void;
}

export function Layout({ children, siteName, sitePath, serverRunning, height, showCommandInput, onCommand }: LayoutProps): React.ReactElement {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <Box flexDirection="column" flexGrow={1} height={height}>
      {/* ── Header ──────────────────────────────────────── */}
      <Box
        borderStyle="round"
        borderColor={C.purple}
        paddingX={1}
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text bold color={C.purple}>📚 Memoria v1.0</Text>
        {siteName && (
          <Text dimColor>📂 {siteName}</Text>
        )}
        {sitePath && (
          <Text dimColor color={C.muted}>{sitePath}</Text>
        )}
        <Text dimColor>{dateStr}</Text>
      </Box>

      {/* ── Main Body ────────────────────────────────────── */}
      <Box flexDirection="row" flexGrow={1} marginTop={1}>
        {/* Left Sidebar — 30% */}
        <Box
          width={30}
          minWidth={24}
          maxWidth={40}
          borderStyle="round"
          borderColor={C.cyan}
          paddingX={1}
          flexDirection="column"
          marginRight={1}
        >
          <Text bold color={C.cyan}>📁 资源</Text>
          <Box flexDirection="column" flexGrow={1} marginTop={1}>
            {children[0]}
          </Box>
        </Box>

        {/* Right Detail/Log — 70% */}
        <Box
          flexGrow={1}
          borderStyle="round"
          borderColor={C.orange}
          paddingX={1}
          flexDirection="column"
        >
          <Text bold color={C.orange}>📋 详情</Text>
          <Box flexDirection="column" flexGrow={1} marginTop={1}>
            {children[1]}
          </Box>
        </Box>
      </Box>

      {/* ── StatusBar ────────────────────────────────────── */}
      <Box marginTop={1}>
        {showCommandInput && onCommand && (
          <Box marginBottom={1}>
            <CommandInput visible={showCommandInput} onCommand={onCommand} />
          </Box>
        )}
        <StatusBar serverRunning={serverRunning} />
      </Box>
    </Box>
  );
}