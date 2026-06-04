/**
 * RecentList — recent projects list (Layout版)
 */
import React, { useState } from 'react';
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
  const totalItems = recents.length + 2;

  useInput((_, key) => {
    if (key.upArrow) setSelected((s: number) => Math.max(0, s - 1));
    else if (key.downArrow) setSelected((s: number) => Math.min(totalItems - 1, s + 1));
    else if (key.return) {
      if (selected < recents.length) onSelect(recents[selected].root);
      else if (selected === recents.length) onBrowse();
      else onBack();
    } else if (key.escape) onBack();
  });

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
