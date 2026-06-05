/**
 * Layout — 通用三区布局：Header + Content + Footer
 * Content 区域由具体组件自行决定布局（可以是无侧栏居中，也可以是 Sidebar+Detail）
 */
import React, { useMemo } from 'react';
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
  // 日期只在分钟级变化,useMemo + 每分钟重算即可,避免每帧都 new Date()
  // (TUI 大约 100ms 一次重绘,直接 new Date() 会浪费 GC)
  const dateStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    // 这里故意不依赖任何 state,只在组件挂载时算一次
    // 真实场景:用户长时间挂着 TUI 日期可能不刷新,可以接受
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box flexDirection="column" flexGrow={1} flexShrink={0} height={height} borderStyle="round" borderColor={C.pink}>
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
      <Box flexDirection="column" flexGrow={1} flexShrink={0} marginTop={1} borderStyle="round" borderColor={C.muted}>
        {children}
      </Box>

      {/* ── Footer（固定底部）──────────────────────────────── */}
      <Box flexShrink={0} flexDirection="column" gap={1} marginTop={1}>
        <StatusBar serverRunning={serverRunning} />
      </Box>
    </Box>
  );
}
