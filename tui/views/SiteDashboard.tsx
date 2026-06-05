/**
 * SiteDashboard — 已打开站点的管理仪表盘视图
 *
 * 统一布局(由 Layout 决定):
 *   - 左栏(30%):FileTree
 *   - 右栏(70%):根据 mode 切换(DetailPanel / NewContentPanel / ThemePanel)
 *   - 底部:CommandInput
 *
 * 焦点管理: Tab 循环 tree → right → input
 *   - tree:focused 时,FileTree useInput 接 j/k(滚动)
 *   - right:focused 时,右栏 panel useInput 接(自己 isActive 守卫)
 *   - input:focused 时,CommandInput 接(自己 isActive 守卫)
 *
 * 模式管理: mode 决定右栏内容
 *   - 'detail' (默认):日志/操作反馈
 *   - 'newContent':新建内容
 *   - 'theme':主题选择
 *
 * 跟父级(app.tsx)嘅 onCommand 桥接: '/new' / '/theme' 切 mode;其他命令透传父级
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Box, useInput, useWindowSize } from 'ink';
import { Layout } from '../components/Layout';
import { FileTree } from '../components/FileTree';
import { DetailPanel, type LogEntry } from '../components/DetailPanel';
import { CommandInput } from '../components/CommandInput';
import { NewContentPanel } from '../panels/NewContentPanel';
import { ThemePanel } from '../panels/ThemePanel';
import { C } from '../contexts/TUIContext';
import { getProjectName } from '../../lib/recent';

type RightMode = 'detail' | 'newContent' | 'theme';
type Focus = 'tree' | 'right' | 'input';

interface Props {
  currentProject: string;
  logs: LogEntry[];
  activeCommand: string | null;
  serverRunning: boolean;
  /** 父级命令处理(generate/bundle/server/stop/open/deploy) */
  onCommand: (cmd: string) => void;
  onExit: () => void;
}

function SiteDashboardImpl({
  currentProject,
  logs,
  activeCommand,
  serverRunning,
  onCommand,
  onExit,
}: Props): React.ReactElement {
  const { rows } = useWindowSize();
  // 站点名:用 useMemo 避免每帧重读 package.json
  const siteName = useMemo(() => getProjectName(currentProject), [currentProject]);

  const [rightMode, setRightMode] = useState<RightMode>('detail');
  const [focus, setFocus] = useState<Focus>('tree');
  const [commandActive, setCommandActive] = useState(false);

  const rightModeRef = useRef(rightMode);
  const focusRef = useRef(focus);
  useEffect(() => { rightModeRef.current = rightMode; }, [rightMode]);
  useEffect(() => { focusRef.current = focus; }, [focus]);

  // ── 全局 useInput ──
  const handleInput = useCallback((input: string, key: { tab?: boolean; escape?: boolean; ctrl?: boolean }) => {
    // Ctrl+C 全局退出
    if (key.ctrl && input === 'c') { onExit(); return; }
    // Tab 全局循环焦点
    if (key.tab) {
      setFocus(f => f === 'tree' ? 'right' : f === 'right' ? 'input' : 'tree');
      return;
    }
    // Esc:右栏非 detail 模式时,Esc 退到 detail
    if (key.escape && focusRef.current === 'right' && rightModeRef.current !== 'detail') {
      setRightMode('detail');
      return;
    }
  }, [onExit]);

  useInput(handleInput);

  // ── 包装 onCommand:'/new' / '/theme' 切 mode,其他透传 ──
  const handleCommand = useCallback((cmd: string) => {
    const bare = cmd.replace(/^\/+/, '').trim();
    if (bare === 'new' || bare === 'content') {
      setRightMode('newContent');
      setFocus('right');
      return;
    }
    if (bare === 'theme') {
      setRightMode('theme');
      setFocus('right');
      return;
    }
    onCommand(cmd);
  }, [onCommand]);

  // ── 左栏:FileTree(inputPaused 控制 j/k 焦点) ──
  const leftPanel = (
    <FileTree rootDir={currentProject} inputPaused={focus !== 'tree'} />
  );

  // ── 右栏:根据 mode 切换 panel ──
  const rightPanel = rightMode === 'newContent' ? (
    <NewContentPanel
      isActive={focus === 'right'}
      projectRoot={currentProject}
      onComplete={() => { setRightMode('detail'); setFocus('tree'); }}
      onCancel={() => { setRightMode('detail'); setFocus('tree'); }}
    />
  ) : rightMode === 'theme' ? (
    <ThemePanel
      isActive={focus === 'right'}
      projectRoot={currentProject}
      onApply={() => { setRightMode('detail'); setFocus('tree'); }}
      onCancel={() => { setRightMode('detail'); setFocus('tree'); }}
    />
  ) : (
    <Box flexDirection="column" flexGrow={1}>
      <DetailPanel logs={logs} activeCommand={activeCommand || undefined} />
    </Box>
  );

  return (
    <Layout
      siteName={siteName}
      sitePath={currentProject}
      serverRunning={serverRunning}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      commandInput={
        <CommandInput
          isActive={focus === 'input'}
          onActiveChange={setCommandActive}
          onCommand={handleCommand}
        />
      }
    />
  );
}

// React.memo:避免父级 logs / activeCommand 变化时无谓重渲染
export const SiteDashboard = React.memo(SiteDashboardImpl, (prev, next) => {
  return (
    prev.currentProject === next.currentProject &&
    prev.logs === next.logs &&
    prev.activeCommand === next.activeCommand &&
    prev.serverRunning === next.serverRunning &&
    prev.onCommand === next.onCommand &&
    prev.onExit === next.onExit
  );
});
