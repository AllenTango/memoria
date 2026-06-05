/**
 * SiteSelector — 未打开项目时的站点选择视图
 *
 * 布局(由 Layout 决定,左栏 40% / 右栏 60%):
 *   - 顶栏(无站点)
 *   - 左栏:
 *     - 上半:指令菜单(2 项:新建站点 / 打开项目)
 *     - 下半:站点记录(最近项目,只读不操作)
 *   - 右栏:
 *     - 没按 Enter:该指令历史日志(可执行) / "按 Enter 触发"提示(需交互)
 *     - 按 Enter:进入 form(创建站点 / 打开项目)
 *   - 底栏
 *
 * 焦点(不用 Tab):
 *   - 'menu'(默认):InstructionMenu 接管 ↑/↓ + Enter
 *   - 'form':右栏 form 接管输入,Esc 退回 menu
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Box, Text, useInput, useWindowSize } from 'ink';
import { Layout } from '../components/Layout';
import { InstructionMenu, type MenuItem } from '../panels/InstructionMenu';
import { SiteRecentsPanel } from '../panels/SiteRecentsPanel';
import { LogPanel } from '../panels/LogPanel';
import { CreateSitePanel } from '../panels/CreateSitePanel';
import { OpenProjectPanel } from '../panels/OpenProjectPanel';
import { C } from '../contexts/TUIContext';
import { getRecentProjects } from '../../lib/recent';

type Mode = 'idle' | 'create' | 'open';
type Focus = 'menu' | 'form';

interface Props {
  serverRunning: boolean;
  onOpenProject: (root: string) => void;
  onExit: () => void;
}

export function SiteSelector({ serverRunning, onOpenProject, onExit }: Props): React.ReactElement {
  const { rows } = useWindowSize();

  // ── State ──
  const [menuSelected, setMenuSelected] = useState(0);
  const [mode, setMode] = useState<Mode>('idle');
  const [focus, setFocus] = useState<Focus>('menu');

  const menuSelectedRef = useRef(menuSelected);
  const modeRef = useRef(mode);
  const focusRef = useRef(focus);
  useEffect(() => { menuSelectedRef.current = menuSelected; }, [menuSelected]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { focusRef.current = focus; }, [focus]);

  // 缓存最近项目(只在 mount 时读一次)
  const recents = useMemo(() => getRecentProjects().slice(0, 20), []);

  // ── 菜单项定义 ──
  const menuItems: MenuItem[] = useMemo(() => [
    { cmd: 'create', label: '新建站点', hint: 'C', color: C.green, type: 'interactive' },
    { cmd: 'open',   label: '打开项目', hint: 'O', color: C.cyan,  type: 'interactive' },
  ], []);

  // ── Menu Enter 触发 ──
  const handleMenuConfirm = useCallback((i: number) => {
    const cmd = menuItems[i]?.cmd;
    if (!cmd) return;
    if (cmd === 'create') {
      setMode('create');
      setFocus('form');
    } else if (cmd === 'open') {
      setMode('open');
      setFocus('form');
    }
  }, [menuItems]);

  // ── 取消 form 退到 menu ──
  const handleFormCancel = useCallback(() => {
    setMode('idle');
    setFocus('menu');
  }, []);

  // ── 全局 useInput(Ctrl+C / Esc) ──
  const handleGlobalInput = useCallback((_inp: string, key: { ctrl?: boolean; escape?: boolean }) => {
    if (key.ctrl && _inp === 'c') {
      onExit();
      return;
    }
    if (key.escape && focusRef.current === 'form') {
      handleFormCancel();
      return;
    }
  }, [onExit, handleFormCancel]);

  useInput(handleGlobalInput);

  // ── 高度分配 ──
  // Layout 入面 Body height = safeRows - header(1) - border(2) - marginTop(1) - footer(3) - marginTop(1)
  // ≈ safeRows - 8
  // 左栏上半 menu:固定 8 行(标题 1 + 2 项 + 滚动指示预留)
  // 左栏下半 record:flexGrow=1 吃剩余
  const bodyHeight = Math.max(10, (rows > 0 ? rows : 40) - 8);
  const menuHeight = Math.min(8, Math.max(4, Math.floor(bodyHeight * 0.35)));
  const recordVisibleRows = Math.max(3, bodyHeight - menuHeight - 4);

  // ── 左栏 = 上 menu + 下 record ──
  const leftPanel = (
    <Box flexDirection="column" flexGrow={1}>
      {/* 上半:指令菜单 */}
      <Box flexShrink={0} flexDirection="column" height={menuHeight}>
        <Text dimColor>指令 (↑↓ 切换 · Enter 触发)</Text>
        <Box flexDirection="column" flexGrow={1} marginTop={0}>
          <InstructionMenu
            items={menuItems}
            selected={menuSelected}
            isActive={focus === 'menu'}
            visibleRows={menuHeight - 2}
            onSelect={setMenuSelected}
            onConfirm={handleMenuConfirm}
          />
        </Box>
      </Box>

      {/* 下半:站点记录(只读) */}
      <Box flexGrow={1} flexDirection="column" marginTop={1}>
        <Text dimColor>站点记录 (只读)</Text>
        <Box flexDirection="column" flexGrow={1} marginTop={0}>
          <SiteRecentsPanel recents={recents} visibleRows={recordVisibleRows - 1} />
        </Box>
      </Box>
    </Box>
  );

  // ── 右栏 ──
  const currentItem = menuItems[menuSelected];
  const isForm = mode !== 'idle';

  const rightPanel = isForm ? (
    mode === 'create' ? (
      <CreateSitePanel
        isActive={focus === 'form'}
        onComplete={(root) => onOpenProject(root)}
        onCancel={handleFormCancel}
      />
    ) : (
      <OpenProjectPanel
        isActive={focus === 'form'}
        recents={recents}
        visibleRows={Math.max(5, (rows > 0 ? rows : 40) - 10)}
        onSelect={(root) => onOpenProject(root)}
        onCancel={handleFormCancel}
      />
    )
  ) : (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1}>
        <Text bold color={C.cyan}>· {currentItem?.label || '指令'}</Text>
      </Box>
      <LogPanel
        logs={[]}
        emptyHint="按 Enter 触发该指令"
      />
      <Box marginTop={1}>
        <Text dimColor>提示: ↑↓ 切换指令 · Enter 触发 · Esc 取消(在 form 中)</Text>
      </Box>
    </Box>
  );

  return (
    <Layout
      siteName={undefined}
      sitePath={undefined}
      serverRunning={serverRunning}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}
