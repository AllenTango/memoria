/**
 * OpenProjectPanel — 右栏内嵌:打开项目(最近项目 + 浏览目录)
 *
 * 阶段:
 *  - 'recents':浏览/选择最近项目(↑/↓ + Enter)
 *  - 'browse':手动输入目录路径
 *
 * 滚动:最近项目超出可视范围时,支持 ↑/↓ 滚动
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { C } from '../contexts/TUIContext';
import { BlinkingCursor } from '../components';
import { isMemoriaProject } from '../../lib/recent';

interface RecentEntry {
  root: string;
  name: string;
  lastOpened: number;
}

type Phase = 'recents' | 'browse';

interface Props {
  isActive: boolean;
  recents: RecentEntry[];
  /** 可视行数(由父级传,用于滚动;传 Infinity 表示不滚动) */
  visibleRows: number;
  /** 选中某个项目时调用 */
  onSelect: (root: string) => void;
  /** 取消时调用 */
  onCancel: () => void;
}

export function OpenProjectPanel({ isActive, recents, visibleRows, onSelect, onCancel }: Props): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('recents');
  const [selected, setSelected] = useState(0);
  const [pathInput, setPathInput] = useState('');
  const [error, setError] = useState('');

  const selectedRef = useRef(selected);
  const pathInputRef = useRef(pathInput);
  const phaseRef = useRef(phase);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { pathInputRef.current = pathInput; }, [pathInput]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // 滚动:selected 改变时调整 offset,确保选中行在可视区内
  const [scrollOffset, setScrollOffset] = useState(0);
  const totalRecents = recents.length;
  // 列表实际占用行 = totalRecents + 1(浏览目录行)
  const totalItems = totalRecents + 1;
  // 滚动时确保 selected 在 [scrollOffset, scrollOffset + visibleRows) 内
  useEffect(() => {
    if (selected < scrollOffset) {
      setScrollOffset(selected);
    } else if (selected >= scrollOffset + visibleRows) {
      setScrollOffset(Math.max(0, selected - visibleRows + 1));
    }
  }, [selected, scrollOffset, visibleRows]);

  // ── 键盘 ──
  useInput((input, key) => {
    if (!isActive) return;
    const cur = phaseRef.current;

    if (cur === 'recents') {
      if (key.upArrow) {
        setSelected(s => Math.max(0, s - 1));
      } else if (key.downArrow) {
        setSelected(s => Math.min(totalItems - 1, s + 1));
      } else if (key.return) {
        const cur = selectedRef.current;
        if (cur < recents.length) {
          onSelect(recents[cur].root);
        } else {
          // "浏览目录"项
          setPhase('browse');
          setError('');
        }
      } else if (key.escape) {
        onCancel();
      }
    } else if (cur === 'browse') {
      if (key.return) {
        const p = pathInputRef.current.trim();
        if (!p) { setError('路径不能为空'); return; }
        if (!isMemoriaProject(p)) { setError('目录不存在或不是 Memoria 项目'); return; }
        onSelect(p);
      } else if (key.backspace) {
        setPathInput(s => s.slice(0, -1));
        setError('');
      } else if (key.escape) {
        setPhase('recents');
        setPathInput('');
        setError('');
      } else if (input && !key.ctrl && !key.meta) {
        setPathInput(s => s + input);
        setError('');
      }
    }
  });

  // ── recents 阶段 ──
  if (phase === 'recents') {
    if (recents.length === 0) {
      return (
        <Box flexDirection="column" flexGrow={1}>
          <Box marginBottom={1}>
            <Text bold color={C.cyan}>打开项目</Text>
          </Box>
          <Text color={C.muted}>暂无最近项目</Text>
          <Text dimColor>按 Enter 浏览目录</Text>
          {error && <Text color={C.red}>✗ {error}</Text>}
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>↑/↓ 移动 · Enter 浏览 · Esc 取消</Text>
          </Box>
        </Box>
      );
    }

    const visibleStart = scrollOffset;
    const visibleEnd = Math.min(totalItems, scrollOffset + visibleRows);
    const hasAbove = scrollOffset > 0;
    const hasBelow = visibleEnd < totalItems;

    return (
      <Box flexDirection="column" flexGrow={1}>
        <Box marginBottom={1}>
          <Text bold color={C.cyan}>打开项目</Text>
        </Box>
        {hasAbove && (
          <Text dimColor>▲ 上方还有 {scrollOffset} 项</Text>
        )}
        <Box flexDirection="column">
          {recents.slice(visibleStart, visibleEnd).map((r, i) => {
            const realIdx = visibleStart + i;
            const isSelected = realIdx === selected;
            const daysAgo = Math.round((Date.now() - r.lastOpened) / 86400000);
            const timeAgo = daysAgo === 0 ? '今天' : `${daysAgo}天前`;
            return (
              <Box key={r.root} flexDirection="row" gap={1}>
                <Text color={isSelected ? C.cyan : C.muted} bold={isSelected}>
                  {isSelected ? '▶' : ' '}
                </Text>
                <Box flexGrow={1}>
                  <Text color={isSelected ? C.cyan : C.fg} bold={isSelected} wrap="truncate">
                    📂 {r.name}
                  </Text>
                </Box>
                <Text color={C.muted} dimColor={!isSelected} wrap="truncate">
                  {timeAgo}
                </Text>
              </Box>
            );
          })}
          {/* "浏览目录" 项 */}
          {visibleStart <= recents.length && visibleEnd > recents.length && (() => {
            const isSelected = selected === recents.length;
            return (
              <Box flexDirection="row" gap={1} marginTop={1}>
                <Text color={isSelected ? C.orange : C.muted} bold={isSelected}>
                  {isSelected ? '▶' : ' '}
                </Text>
                <Text color={isSelected ? C.orange : C.muted} bold={isSelected} wrap="truncate">
                  📂 浏览目录...
                </Text>
              </Box>
            );
          })()}
        </Box>
        {hasBelow && (
          <Text dimColor>▼ 下方还有 {totalItems - visibleEnd} 项</Text>
        )}
        {error && <Text color={C.red}>✗ {error}</Text>}
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>↑/↓ 移动 · Enter 选择 · Esc 取消</Text>
        </Box>
      </Box>
    );
  }

  // ── browse 阶段 ──
  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1}>
        <Text bold color={C.cyan}>浏览目录</Text>
      </Box>
      <Box flexDirection="row" gap={1}>
        <Text color={C.muted}>路径:</Text>
        <Text color={pathInput ? C.cyan : C.muted} bold wrap="truncate">
          {pathInput || '<输入绝对路径>'}
        </Text>
        {pathInput && <BlinkingCursor />}
      </Box>
      {error && <Text color={C.red}>✗ {error}</Text>}
      <Box marginTop={1}>
        <Text dimColor>Enter 打开 · Esc 返回最近项目</Text>
      </Box>
    </Box>
  );
}
