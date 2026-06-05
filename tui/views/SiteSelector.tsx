/**
 * SiteSelector — 未打开项目时的站点选择主视图
 *
 * 布局:左侧主菜单(新建/打开) + 右侧最近项目(只读展示,点浏览目录选)
 * 键盘:↑/↓ 移动主菜单,Enter 确认
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useWindowSize } from 'ink';
import { Layout } from '../components/Layout';
import { SelectableList, type MenuItem } from '../components/SelectableList';
import { C } from '../contexts/TUIContext';
import { getRecentProjects } from '../../lib/recent';

interface Props {
  onMenuConfirm: (index: number) => void;
  onRecentSelect: (root: string) => void;
}

export function SiteSelector({ onMenuConfirm, onRecentSelect }: Props): React.ReactElement {
  const { rows } = useWindowSize();
  const [menuSelected, setMenuSelected] = useState(0);
  const [recentSelected, setRecentSelected] = useState(0);
  const menuSelectedRef = useRef(menuSelected);
  const recentSelectedRef = useRef(recentSelected);
  useEffect(() => { menuSelectedRef.current = menuSelected; }, [menuSelected]);
  useEffect(() => { recentSelectedRef.current = recentSelected; }, [recentSelected]);

  const recents = getRecentProjects().slice(0, 5);
  const menuItems: MenuItem[] = [
    { label: '新建站点', color: C.green },
    { label: '打开项目', color: C.cyan },
  ];
  const recentItems: MenuItem[] = recents.map(r => ({
    label: `📂 ${r.name}`,
    color: C.cyan,
  }));

  // 焦点:用 Tab 切换,默认在左侧主菜单
  // ↑/↓ 在当前焦点区域内移动,Enter 触发对应区域动作
  // 这比两个独立 useInput 简单,行为可预测
  const [focus, setFocus] = useState<'menu' | 'recents'>('menu');

  const handleInput = useCallback((_inp: string, key: { upArrow?: boolean; downArrow?: boolean; return?: boolean; tab?: boolean }) => {
    if (key.tab) {
      setFocus(f => f === 'menu' ? 'recents' : 'menu');
      return;
    }
    if (focus === 'menu') {
      if (key.upArrow) {
        setMenuSelected(s => Math.max(0, s - 1));
      } else if (key.downArrow) {
        setMenuSelected(s => Math.min(menuItems.length - 1, s + 1));
      } else if (key.return) {
        onMenuConfirm(menuSelectedRef.current);
      }
    } else {
      // recents
      if (recents.length === 0) return;
      if (key.upArrow) {
        setRecentSelected(s => Math.max(0, s - 1));
      } else if (key.downArrow) {
        setRecentSelected(s => Math.min(recents.length - 1, s + 1));
      } else if (key.return) {
        onRecentSelect(recents[recentSelectedRef.current].root);
      }
    }
  }, [focus, menuItems.length, recents, onMenuConfirm, onRecentSelect]);

  useInput(handleInput);

  return (
    <Layout siteName={undefined} sitePath={undefined} serverRunning={false} height={rows}>
      <Box flexDirection="row" justifyContent="center" alignItems="center" flexGrow={1}>
        {/* Left Sidebar — 主菜单 */}
        <Box
          width={30}
          minWidth={24}
          maxWidth={40}
          borderStyle="round"
          borderColor={focus === 'menu' ? C.cyan : C.muted}
          paddingX={1}
          flexDirection="column"
          marginRight={1}
          flexGrow={0}
        >
          <Text dimColor>主菜单 (Tab 切换焦点)</Text>
          <Box flexDirection="column" marginTop={1}>
            <SelectableList
              items={menuItems}
              selected={menuSelected}
              onSelect={setMenuSelected}
              marker={focus === 'menu' ? '▶' : ' '}
            />
          </Box>
        </Box>

        {/* Right Detail — 最近项目 */}
        <Box
          flexGrow={1}
          borderStyle="round"
          borderColor={focus === 'recents' ? C.orange : C.muted}
          paddingX={1}
          flexDirection="column"
        >
          <Text dimColor>最近项目</Text>
          {recents.length === 0 ? (
            <Text color={C.muted} dimColor>暂无最近项目</Text>
          ) : (
            <Box flexDirection="column" marginTop={1} gap={0}>
              {recents.slice(0, 5).map((r, i) => (
                <Box key={r.root} flexDirection="row" gap={1}>
                  <Text
                    color={focus === 'recents' && recentSelected === i ? C.cyan : C.muted}
                    bold={focus === 'recents' && recentSelected === i}
                    wrap="truncate"
                  >
                    {focus === 'recents' && recentSelected === i ? '▶' : ' '}
                  </Text>
                  <Text
                    color={focus === 'recents' && recentSelected === i ? C.cyan : C.cyan}
                    dimColor={!(focus === 'recents' && recentSelected === i)}
                    wrap="truncate"
                  >
                    📂 {r.name}
                  </Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Layout>
  );
}
