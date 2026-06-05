/**
 * Layout — 统一三段式布局:Header + Body(左栏 + 右栏) + Footer
 *
 * 关键设计:
 * - 顶层 Box 用 `flexGrow=1 flexShrink=0`,靠 alternateScreen mode 自动 fill viewport
 *   **避免 `width={safeCols} height={safeRows}` + outer border 互冲**
 *   (useWindowSize 喺 alternateScreen 下 height detection 失效,safeRows fallback 40,
 *    outer border 吃 2 行,Layout 实际只剩 38 行,Header 被压扁)
 * - 顶层 Box 加 outer border(粉红色),inner content 靠 flexGrow=1 fill border 内部
 * - Header / Footer 都加 flexShrink={0} 防止被压扁
 * - Body flexGrow={1} 填满剩余空间
 * - Body 内部 top row(左栏 + 右栏)flexGrow={1}
 * - 左栏固定 30%(24-40 columns),右栏 flexGrow={1} 吃剩余
 *
 * **CommandInput 不在此组件内** — 它用 position="absolute" 浮层,
 *   必须放在 view 顶层 Fragment(同 Layout 兄弟节点),否则会占据 flow 空间
 *   把 CommandInput 推到 viewport 之外
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
  siteName,
  sitePath,
  serverRunning,
}: LayoutProps): React.ReactElement {
  // 用 useWindowSize 拿 explicit numeric columns,做响应式 header 内容
  // (避免 path 太长时 Header overflow)
  const { columns } = useWindowSize();
  const safeCols = columns > 0 ? columns : 120;

  // 日期只在分钟级变化,useMemo + mount 时算一次即可
  const dateStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      flexShrink={0}
      borderStyle="round"
      borderColor={C.pink}
    >
      {/* ── Header(顶栏) ───────────────────────────────────── */}
      <Box
        flexShrink={0}
        paddingX={1}
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text bold color={C.pink}>📚 Memoria v1.0</Text>
        {siteName && <Text dimColor wrap="truncate">📂 {siteName}</Text>}
        {sitePath && (
          <Text dimColor color={C.muted} wrap="truncate">
            {sitePath.length > Math.max(20, safeCols - 40)
              ? '...' + sitePath.slice(-(Math.max(20, safeCols - 40)))
              : sitePath}
          </Text>
        )}
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
      </Box>

      {/* ── Footer(底栏 StatusBar) ────────────────────────── */}
      <Box flexShrink={0} marginTop={1}>
        <StatusBar serverRunning={serverRunning} />
      </Box>
    </Box>
  );
}
