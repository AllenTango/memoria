/**
 * InstructionMenu — 通用指令菜单(可滚动 + 互斥 dim)
 *
 * 设计:
 * - 单一 focus,父级用 isActive prop 控制(用 Ink 7 built-in isActive option)
 * - 内部 useState 维护 scrollOffset,selected 改变时自动调整确保选中项在可视区内
 * - ↑/↓ 在 items 之间移动,自动 skip disabled items
 * - Enter 触发 onConfirm(current selected),disabled item 唔触发
 * - 滚动指示:有 above/below 时显示 ▲/▼ + 剩余项数
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { C } from '../contexts/TUIContext';

export type InstructionType = 'interactive' | 'executable';

export interface MenuItem {
  /** 内部命令名(app.tsx 用嚟 dispatch) */
  cmd: string;
  /** 显示名 */
  label: string;
  /** 副标签 / 快捷键提示 */
  hint?: string;
  /** 高亮色(item 非 disabled 时) */
  color: string;
  /** 互斥/条件禁用(显示但 dimColor,且 Enter 唔触发) */
  disabled?: boolean;
  /** 需交互 vs 可直接执行(只供父级决定右栏 default 渲染啥) */
  type: InstructionType;
}

interface Props {
  items: MenuItem[];
  selected: number;
  /** 父级焦点控制 — false 时 useInput 立即 return(让出键盘) */
  isActive: boolean;
  /** 可视行数(由父级传入,用于滚动) */
  visibleRows: number;
  /** 选中项改变(↑/↓ 时) */
  onSelect: (i: number) => void;
  /** 选中项 Enter 触发(disabled 时唔触发) */
  onConfirm: (i: number) => void;
}

export function InstructionMenu({
  items,
  selected,
  isActive,
  visibleRows,
  onSelect,
  onConfirm,
}: Props): React.ReactElement {
  const selectedRef = useRef(selected);
  const itemsRef = useRef(items);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // 滚动:selected 改变时调整 offset,确保选中项在可视区内
  const [scrollOffset, setScrollOffset] = useState(0);
  useEffect(() => {
    if (selected < scrollOffset) {
      setScrollOffset(selected);
    } else if (selected >= scrollOffset + visibleRows) {
      setScrollOffset(Math.max(0, selected - visibleRows + 1));
    }
  }, [selected, scrollOffset, visibleRows]);

  // ── 键盘 ──
  // 用 Ink 7 built-in isActive option,事件订阅由 isActive 控制
  const handleInput = useCallback((_inp: string, key: { upArrow?: boolean; downArrow?: boolean; return?: boolean }) => {
    if (key.upArrow) {
      let next = selectedRef.current - 1;
      while (next >= 0 && itemsRef.current[next].disabled) next--;
      if (next >= 0) onSelect(next);
    } else if (key.downArrow) {
      let next = selectedRef.current + 1;
      while (next < itemsRef.current.length && itemsRef.current[next].disabled) next++;
      if (next < itemsRef.current.length) onSelect(next);
    } else if (key.return) {
      const i = selectedRef.current;
      if (!itemsRef.current[i].disabled) onConfirm(i);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSelect, onConfirm]);

  useInput(handleInput, { isActive });

  // 派生可视 items
  const visible = useMemo(
    () => items.slice(scrollOffset, scrollOffset + visibleRows),
    [items, scrollOffset, visibleRows]
  );
  const hasAbove = scrollOffset > 0;
  const hasBelow = scrollOffset + visibleRows < items.length;
  const hiddenAbove = scrollOffset;
  const hiddenBelow = items.length - scrollOffset - visibleRows;

  return (
    <Box flexDirection="column" flexGrow={1}>
      {hasAbove && (
        <Text dimColor>▲ 还有 {hiddenAbove} 项</Text>
      )}
      <Box flexDirection="column" flexGrow={1}>
        {visible.map((item, i) => {
          const realIdx = scrollOffset + i;
          const isSelected = realIdx === selected;
          const itemColor = item.disabled ? C.muted : item.color;
          return (
            <Box key={item.cmd} flexDirection="row" gap={1}>
              <Text
                color={isSelected && !item.disabled ? itemColor : C.muted}
                bold={isSelected && !item.disabled}
              >
                {isSelected ? '▶' : ' '}
              </Text>
              <Text
                color={itemColor}
                bold={isSelected && !item.disabled}
                dimColor={item.disabled}
                wrap="truncate"
              >
                {item.label}
              </Text>
              {item.hint && (
                <Text color={C.muted} dimColor wrap="truncate">
                  {item.hint}
                </Text>
              )}
            </Box>
          );
        })}
      </Box>
      {hasBelow && (
        <Text dimColor>▼ 还有 {hiddenBelow} 项</Text>
      )}
    </Box>
  );
}
