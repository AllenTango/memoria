/**
 * SelectableList — 键盘可导航列表的**纯展示**组件
 *
 * 设计:不内置 useInput,所有键盘事件由调用方处理
 * 原因:Ink 7 的 useInput 是按"注册的 hook 全部触发"实现的,
 * 如果 SelectableList 和父组件都写 useInput 监听上下键,会同时触发导致状态错乱
 * 全部键盘逻辑集中在父组件(useCallback + ref 镜像),确保事件流单一
 */
import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { C } from '../contexts/TUIContext';

export interface MenuItem {
  label: string;
  sub?: string;
  color: string;
}

interface SelectableListProps {
  items: MenuItem[];
  selected: number;
  onSelect?: (i: number) => void;
  /** 高亮前缀(默认 ▶,可改成 ▸ / ► 等) */
  marker?: string;
}

/**
 * 纯展示列表(无 useInput)
 * 键盘事件由调用方统一处理 — 避免多重 useInput 冲突
 */
export function SelectableList({
  items,
  selected,
  marker = '▶',
}: SelectableListProps): React.ReactElement {
  // maxLabelLen 决定 sub 前的空格,让 sub 排版对齐(纯展示优化)
  const maxLabelLen = useMemo(
    () => Math.max(...items.map(i => i.label.length)),
    [items]
  );

  return (
    <Box flexDirection="column" paddingX={0}>
      {items.map((item, i) => {
        const isSelected = i === selected;
        return (
          <Box key={i} flexDirection="row" gap={1}>
            <Text color={isSelected ? item.color : C.muted} bold={isSelected} wrap="truncate">
              {isSelected ? marker : ' '}
            </Text>
            <Box flexGrow={1}>
              <Text color={isSelected ? item.color : C.muted} bold={isSelected} wrap="truncate">
                {item.label}
              </Text>
            </Box>
            {item.sub && (
              <Text color={C.muted} dimColor={!isSelected} wrap="truncate">{item.sub}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
