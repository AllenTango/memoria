/**
 * Layout — 统一三段式布局:Header + Body(左栏 + 右栏 + 指令输入) + Footer
 *
 * 关键设计:
 * - 用 useWindowSize 拿 explicit numeric rows/columns,顶层 Box 强制 width/height
 *   (避免 alternateScreen mode 下 fragment 缩到内容高度的 Ink 7 bug)
 * - Header / Footer / 指令输入 都加 flexShrink={0} 防止父级压缩
 * - Body flexGrow={1} 填满剩余空间
 * - Body 内部 top row(左栏 + 右栏)flexGrow={1},bottom row(指令输入)flexShrink={0}
 * - 左栏固定 30%(24-40 columns),右栏 flexGrow={1} 吃剩余
 *
 * 由 SiteSelector / SiteDashboard 各自传入 leftPanel / rightPanel 内容
 * (它们各自维护 mode 状态,Layout 不知道 mode)
 */
import React, { useMemo } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { C } from '../contexts/TUIContext';
import { StatusBar } from './StatusBar';

interface LayoutProps {
  /** 左栏内容(由 view 决定,例如 SiteSelector 的操作菜单 / SiteDashboard 的 FileTree) */
  leftPanel: React.ReactNode;
  /** 右栏内容(由 view 决定,根据 mode 切换 panel) */
  rightPanel: React.ReactNode;
  /** 底部指令输入条(可选;Selector 也支持命令面板) */
  commandInput?: React.ReactNode;
  /** Header 站点名(未打开站点时为 undefined) */
  siteName?: string;
  /** Header 站点路径 */
  sitePath?: string;
  /** StatusBar 显示的 Server 状态 */
  serverRunning: boolean;
}

export function Layout({
  leftPanel,
  rightPanel,
  commandInput,
  siteName,
  sitePath,
  serverRunning,
}: LayoutProps): React.ReactElement {
  // 关键:顶层 Box 用 explicit numeric 强制占满 viewport
  // (避免 fragment 缩到内容高度导致 StatusBar/CommandInput 被挤出)
  const { columns, rows } = useWindowSize();
  const safeRows = rows > 0 ? rows : 40;
  const safeCols = columns > 0 ? columns : 120;

  // 日期只在分钟级变化,useMemo + mount 时算一次即可
  const dateStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      width={safeCols}
      height={safeRows}
      flexDirection="column"
    >
      {/* ── Header(顶栏) ───────────────────────────────────── */}
      <Box
        flexShrink={0}
        borderStyle="round"
        borderColor={C.pink}
        paddingX={1}
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text bold color={C.pink}>📚 Memoria v1.0</Text>
        {siteName && <Text dimColor>📂 {siteName}</Text>}
        {sitePath && <Text dimColor color={C.muted}>{sitePath}</Text>}
        <Text dimColor>{dateStr}</Text>
      </Box>

      {/* ── Body(内容栏) ──────────────────────────────────── */}
      <Box flexGrow={1} flexShrink={0} flexDirection="column" marginTop={1}>
        {/* Top row: 左栏 + 右栏(横排) */}
        <Box flexGrow={1} flexShrink={0} flexDirection="row">
          {/* 左栏 — 固定 30%(24-40 columns) */}
          <Box
            width="30%"
            minWidth={24}
            maxWidth={40}
            flexShrink={0}
            borderStyle="round"
            borderColor={C.cyan}
            paddingX={1}
            flexDirection="column"
            marginRight={1}
          >
            {leftPanel}
          </Box>

          {/* 右栏 — 吃剩余空间 */}
          <Box
            flexGrow={1}
            flexShrink={0}
            borderStyle="round"
            borderColor={C.orange}
            paddingX={1}
            flexDirection="column"
          >
            {rightPanel}
          </Box>
        </Box>

        {/* Bottom row: 指令输入(可选) */}
        {commandInput && (
          <Box flexShrink={0} marginTop={1}>
            {commandInput}
          </Box>
        )}
      </Box>

      {/* ── Footer(底栏 StatusBar) ────────────────────────── */}
      <Box flexShrink={0} marginTop={1}>
        <StatusBar serverRunning={serverRunning} />
      </Box>
    </Box>
  );
}
