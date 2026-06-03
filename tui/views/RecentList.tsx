/**
 * RecentList — recent projects list (modern FlexBox)
 */
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { C } from '../contexts/TUIContext';
import { Header } from '../components/Frame';
import { SelectableList } from '../components/SelectableList';

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
}

export function RecentList({ recents, onSelect, onBack, onBrowse }: Props): React.ReactElement {
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
    { label: '↩ 返回主菜单', color: C.muted },
  ];

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box borderStyle="round" borderColor={C.cyan} paddingX={1} flexDirection="column">
        <Text bold color={C.cyan}>📂 打开项目</Text>
        <Box flexDirection="column" marginTop={1}>
          <SelectableList items={items} selected={selected} onSelect={setSelected} />
        </Box>
      </Box>
      <Text dimColor marginTop={1}>↑↓ 选择 · Enter 确认 · Esc 返回</Text>
    </Box>
  );
}
