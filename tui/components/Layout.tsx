/**
 * Layout — 通用三区布局：Header + Content + Footer
 * Content 区域由具体组件自行决定布局（可以是无侧栏居中，也可以是 Sidebar+Detail）
 */
import React from 'react';
import { Box, Text } from 'ink';
import { C } from '../contexts/TUIContext';
import { StatusBar } from './StatusBar';

interface LayoutProps {
  children: React.ReactNode; // 主体内容，由具体视图组件决定布局
  siteName?: string;
  sitePath?: string;
  serverRunning: boolean;
  height?: number;
}

export function Layout({ children, siteName, sitePath, serverRunning, height}: LayoutProps): React.ReactElement {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <Box flexDirection="column" flexGrow={1} flexShrink={0} height={height}>
      {/* ── Header（固定顶部）──────────────────────────────── */}
      <Box flexShrink={0}
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

      {/* ── Content（填满中间）────────────────────────────── */}
      <Box flexDirection="column" flexGrow={1} flexShrink={0} marginTop={1}>
        {children}
      </Box>

      {/* ── Footer（固定底部）──────────────────────────────── */}
      <Box flexShrink={0} flexDirection="column" gap={1} marginTop={1}>
        <StatusBar serverRunning={serverRunning} />
      </Box>
    </Box>
  );
}