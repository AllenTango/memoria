/**
 * SiteRecentsPanel — SiteSelector 左下"站点记录"区域(只读)
 *
 * 用途:显示最近打开过的 Memoria 项目列表
 * 约束:只读,user 唔能 navigate / Enter 触发操作
 *   (要操作最近项目 → 用 SiteSelector 菜单的"打开项目"指令)
 *
 * 滚动:
 * - 默认显示最新嘅 N 项
 * - recents 数量变化时自动 scroll 到末尾
 * - 顶部 ▲ 指示 + 底部 ▼ 指示
 */
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { C } from '../contexts/TUIContext';

interface RecentEntry {
  root: string;
  name: string;
  lastOpened: number;
}

interface Props {
  recents: RecentEntry[];
  /** 可视行数(由父级传,用于滚动) */
  visibleRows: number;
}

export function SiteRecentsPanel({ recents, visibleRows }: Props): React.ReactElement {
  // 内部 scroll offset — 默认显示最新嘅 N 项(recents 按 lastOpened 降序已经 sort 好)
  const [scrollOffset, setScrollOffset] = useState(0);

  // recents 数量变化时,自动滚到末尾(显示最新)
  useEffect(() => {
    const newOffset = Math.max(0, recents.length - visibleRows);
    setScrollOffset(newOffset);
  }, [recents.length, visibleRows]);

  if (recents.length === 0) {
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Text dimColor>暂无最近项目</Text>
        <Text dimColor>(只读,通过菜单"打开项目"操作)</Text>
      </Box>
    );
  }

  const visible = recents.slice(scrollOffset, scrollOffset + visibleRows);
  const hasAbove = scrollOffset > 0;
  const hasBelow = scrollOffset + visibleRows < recents.length;

  return (
    <Box flexDirection="column" flexGrow={1}>
      {hasAbove && (
        <Text dimColor>▲ 还有 {scrollOffset} 项</Text>
      )}
      <Box flexDirection="column" flexGrow={1}>
        {visible.map((r) => {
          const daysAgo = Math.round((Date.now() - r.lastOpened) / 86400000);
          const timeAgo = daysAgo === 0 ? '今天' : daysAgo === 1 ? '昨天' : `${daysAgo}天前`;
          return (
            <Box key={r.root} flexDirection="row" gap={1}>
              <Text color={C.cyan}>📂</Text>
              <Box flexGrow={1}>
                <Text color={C.fg} wrap="truncate">{r.name}</Text>
              </Box>
              <Text color={C.muted} dimColor wrap="truncate">{timeAgo}</Text>
            </Box>
          );
        })}
      </Box>
      {hasBelow && (
        <Text dimColor>▼ 还有 {recents.length - scrollOffset - visibleRows} 项</Text>
      )}
    </Box>
  );
}
