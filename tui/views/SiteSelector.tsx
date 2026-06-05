/**
 * SiteSelector — 未打开项目时的站点选择视图
 *
 * 统一布局(由 Layout 决定):
 *   - 左栏(30%):操作菜单(新建站点 / 打开项目)
 *   - 右栏(70%):根据 mode 切换(默认 OpenProjectPanel,可切 CreateSitePanel)
 *   - 底部:CommandInput
 *
 * 焦点管理: Tab 循环 menu → right → input
 *   - menu:focused 时,左栏 useInput 接 ↑/↓ + Enter(切换 mode 后自动跳到 right)
 *   - right:focused 时,右栏 panel useInput 接(自己 isActive 守卫)
 *   - input:focused 时,CommandInput 接(自己 isActive 守卫)
 *
 * 多 useInput 冲突:每个区域自己嘅 useInput 用 isActive 守卫(同 SelectableList 嘅 design 一致)
 */
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Box, Text, useInput, useWindowSize } from 'ink';
import { Layout } from '../components/Layout';
import { CommandInput } from '../components/CommandInput';
import { SelectableList, type MenuItem } from '../components/SelectableList';
import { CreateSitePanel } from '../panels/CreateSitePanel';
import { OpenProjectPanel } from '../panels/OpenProjectPanel';
import { C } from '../contexts/TUIContext';
import { getRecentProjects } from '../../lib/recent';

type Mode = 'create' | 'open';
type Focus = 'menu' | 'right' | 'input';

interface Props {
  serverRunning: boolean;
  onOpenProject: (root: string) => void;
  onExit: () => void;
}

export function SiteSelector({ serverRunning, onOpenProject, onExit }: Props): React.ReactElement {
  const { rows } = useWindowSize();

  const [mode, setMode] = useState<Mode>('open');
  const [menuSelected, setMenuSelected] = useState(0);
  const [focus, setFocus] = useState<Focus>('menu');
  const menuSelectedRef = useRef(menuSelected);
  const modeRef = useRef(mode);
  const focusRef = useRef(focus);
  useEffect(() => { menuSelectedRef.current = menuSelected; }, [menuSelected]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { focusRef.current = focus; }, [focus]);

  // 缓存最近项目(只在 mount 时读一次,跟 FileTree 一样 useMemo 避免每帧读盘)
  const recents = useMemo(() => getRecentProjects().slice(0, 10), []);

  // 左栏菜单项
  const menuItems: MenuItem[] = [
    { label: '新建站点', color: C.green, sub: 'C' },
    { label: '打开项目', color: C.cyan, sub: 'O' },
  ];

  // ── 全局 + 左栏 useInput(单一入口) ──
  const handleInput = useCallback((input: string, key: { upArrow?: boolean; downArrow?: boolean; return?: boolean; tab?: boolean; escape?: boolean; ctrl?: boolean }) => {
    // Ctrl+C 全局退出
    if (key.ctrl && input === 'c') { onExit(); return; }
    // Tab 全局循环焦点
    if (key.tab) {
      setFocus(f => f === 'menu' ? 'right' : f === 'right' ? 'input' : 'menu');
      return;
    }
    // 只在 menu 焦点时处理左栏键位
    if (focusRef.current !== 'menu') return;
    if (key.upArrow) {
      setMenuSelected(s => Math.max(0, s - 1));
    } else if (key.downArrow) {
      setMenuSelected(s => Math.min(menuItems.length - 1, s + 1));
    } else if (key.return) {
      const i = menuSelectedRef.current;
      setMode(i === 0 ? 'create' : 'open');
      setFocus('right');
    }
  }, [menuItems.length, onExit]);

  useInput(handleInput);

  // 计算右栏 panel 嘅可视行数(用于 OpenProjectPanel 滚动)
  // 估算:rows - 6(header + border + 间隔) - 2(指令输入 + 间隔) - 4(panel 内部 padding/标题) ≈ rows - 12
  const visibleRows = Math.max(5, rows - 12);

  // ── 左栏菜单(纯展示) ──
  const leftPanel = (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1}>
        <Text dimColor>主菜单 (Tab 切换)</Text>
      </Box>
      <Box flexDirection="column">
        <SelectableList
          items={menuItems}
          selected={menuSelected}
          marker={focus === 'menu' ? '▶' : ' '}
        />
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text color={focus === 'menu' ? C.green : C.muted} dimColor={focus !== 'menu'}>
          {focus === 'menu' ? '◆ 当前焦点' : ''}
        </Text>
      </Box>
    </Box>
  );

  // ── 右栏 panel(根据 mode 切换) ──
  const rightPanel = mode === 'create' ? (
    <CreateSitePanel
      isActive={focus === 'right'}
      onComplete={(root) => onOpenProject(root)}
      onCancel={() => {
        setMode('open');
        setFocus('menu');
      }}
    />
  ) : (
    <OpenProjectPanel
      isActive={focus === 'right'}
      recents={recents}
      visibleRows={visibleRows}
      onSelect={(root) => onOpenProject(root)}
      onCancel={() => setFocus('menu')}
    />
  );

  return (
    <>
      <Layout
        siteName={undefined}
        sitePath={undefined}
        serverRunning={serverRunning}
        leftPanel={leftPanel}
        rightPanel={rightPanel}
      />
      <CommandInput
        isActive={focus === 'input'}
        onCommand={(cmd) => {
          // Selector 阶段冇项目相关命令,只处理 /exit / x
          const bare = cmd.replace(/^\/+/, '').trim();
          if (bare === 'exit' || bare === 'x') onExit();
          // 其他命令喺 Selector 阶段无效,CommandInput 内部已经过滤
        }}
      />
    </>
  );
}
