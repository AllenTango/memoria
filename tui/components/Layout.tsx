/**
 * Layout — 统一三段式布局:Header + Body(左栏 + 右栏) + Footer
 *
 * 关键设计:
 * - 顶层 Box 用 `width={safeCols} height={safeRows}`(custom useViewportSize 同步拿)
 *   **必须 explicit numeric** — Ink 7 alternateScreen 模式下 Fragment 顶层 Ink root
 *   嘅 height = content height(auto),`flexGrow=1` fill 0,Layout 缩到内容高度
 *   (顶部 ~50% viewport 全黑就系呢个原因)
 * - useViewportSize 用 useStdout 同步 initial(避免 useWindowSize 嘅 0 issue)
 * - 顶层 Box 加 outer border(粉红色),inner content 靠 flexGrow=1 fill border 内部
 *   (height={safeRows} 系 outer height,border 吃 2 行,inner area = safeRows - 2)
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
import React, { useMemo, useState, useEffect } from 'react';
import { Box, Text, useStdout } from 'ink';
import { C } from '../contexts/TUIContext';
import { StatusBar } from './StatusBar';

/**
 * 同步从 useStdout 拿 size + 监听 resize re-render
 * - 关键:initial state lazy 同步从 stdout.columns/rows 拿(避免 useWindowSize 嘅异步 setState issue)
 * - fallback 80x24(terminal 最小 size,而非 useWindowSize 嘅 80x24 fallback)
 * - resize 监听让 user resize terminal 时 Layout 重新 render
 */
function useViewportSize(): { columns: number; rows: number } {
  const { stdout } = useStdout();
  const [size, setSize] = useState(() => ({
    columns: stdout.columns > 0 ? stdout.columns : 80,
    rows: stdout.rows > 0 ? stdout.rows : 24,
  }));
  useEffect(() => {
    const onResize = () => setSize({
      columns: stdout.columns > 0 ? stdout.columns : 80,
      rows: stdout.rows > 0 ? stdout.rows : 24,
    });
    stdout.on('resize', onResize);
    return () => { stdout.off('resize', onResize); };
  }, [stdout]);
  return size;
}

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
  // 同步从 useStdout 拿 size(避免 useWindowSize 首次 render 拿 0 嘅 issue)
  const { columns: safeCols, rows: safeRows } = useViewportSize();

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
          {/* 左栏 — 固定 40%(28-50 columns) */}
          <Box
            width="40%"
            minWidth={28}
            maxWidth={50}
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
