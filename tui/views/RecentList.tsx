/**
 * RecentList — recent projects list (Layout版)
 *
 * 键盘: ↑/↓ 移动,Enter 触发(打开项目 / 浏览目录 / 返回),Esc 返回
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, useInput, useWindowSize } from 'ink';
import { Layout } from '../components/Layout';
import { SelectableList } from '../components';
import { C } from '../contexts/TUIContext';

interface RecentProject {
  root: string;
  name: string;
  lastOpened: number;
}

interface Props {
  recents: RecentProject[];
  onSelect: (root: string) => void;
  onBack: () => void;
  onBrowse: () => void;
  serverRunning: boolean;
}

export function RecentList({ recents, onSelect, onBack, onBrowse, serverRunning }: Props): React.ReactElement {
  const { rows } = useWindowSize();
  const [selected, setSelected] = useState(0);
  const selectedRef = useRef(selected);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  // items 数量 = recents + 1(浏览目录),不要多加 1
  const totalItems = recents.length + 1;
  // 项目索引范围: [0, recents.length)  → onSelect
  // "浏览目录"索引: recents.length     → onBrowse
  // 没有"返回"项(用 Esc 即可)

  // ref 镜像 setSelected,避免 stale closure
  const handleInput = useCallback((_inp: string, key: { upArrow?: boolean; downArrow?: boolean; return?: boolean; escape?: boolean }) => {
    if (key.upArrow) {
      setSelected(s => Math.max(0, s - 1));
    } else if (key.downArrow) {
      setSelected(s => Math.min(totalItems - 1, s + 1));
    } else if (key.return) {
      const cur = selectedRef.current;
      if (cur < recents.length) onSelect(recents[cur].root);
      else if (cur === recents.length) onBrowse();
    } else if (key.escape) {
      onBack();
    }
  }, [totalItems, recents, onSelect, onBrowse, onBack]);

  useInput(handleInput);

  const items = [
    ...recents.map(r => {
      const daysAgo = Math.round((Date.now() - r.lastOpened) / 86400000);
      const timeAgo = daysAgo === 0 ? '今天' : `${daysAgo}天前`;
      return { label: r.name, sub: timeAgo, color: C.cyan };
    }),
    { label: '📂 浏览目录...', color: C.orange },
  ];

  return (
    <Layout
      siteName="最近项目"
      sitePath=""
      height={rows}
      serverRunning={serverRunning}
    >
      <Box flexDirection="column" justifyContent="center" alignItems="center"  flexGrow={1}>
      <SelectableList items={items} selected={selected} onSelect={setSelected} />
      </Box>
    </Layout>
  );
}
