/**
 * SiteSelector — 未打开项目时的站点选择主视图
 * 包含主菜单 + 最近项目列表
 */
import React, { useState } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { Layout } from '../components/Layout';
import { SelectableList } from '../components';
import { C } from '../contexts/TUIContext';
import { getRecentProjects } from '../../lib/recent';

interface MenuItem {
  label: string;
  color: string;
}

interface Props {
  onMenuConfirm: (index: number) => void;
  onRecentSelect: (root: string) => void;
}

export function SiteSelector({ onMenuConfirm, onRecentSelect }: Props): React.ReactElement {
  const { rows } = useWindowSize();
  const [menuSelected, setMenuSelected] = useState(0);

  const recents = getRecentProjects().slice(0, 5);
  const menuItems: MenuItem[] = [
    { label: '新建站点', color: C.green },
    { label: '打开项目', color: C.cyan },
  ];

  return (
    <Layout siteName={undefined} sitePath={undefined} serverRunning={false} height={rows}>
      <Box flexDirection="row" justifyContent="center" alignItems="center" flexGrow={1}>
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
          flexGrow={1}
        >
          {/* 主菜单列表 */}
          <SelectableList
            items={menuItems}
            selected={menuSelected}
            onSelect={setMenuSelected}
            onConfirm={(i) => {
              if (i === 0) onMenuConfirm(0);
              else onMenuConfirm(1);
            }}
          />
        </Box>

        {/* Right Detail/Log — 70% */}
        <Box
          flexGrow={1}
          borderStyle="round"
          borderColor={C.orange}
          paddingX={1}
          flexDirection="column"
        >
          {/* 最近项目 */}

          <Box flexDirection="column">
            <Text dimColor bold>最近项目</Text>
            <Box flexDirection="column" marginTop={0} gap={0}>
              {recents.slice(0, 5).map((r) => (
                <Text
                  key={r.root}
                  color={C.cyan}
                  wrap="truncate"
                  onClick={() => onRecentSelect(r.root)}
                >
                  📂 {r.name}
                </Text>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Layout>
  );
}