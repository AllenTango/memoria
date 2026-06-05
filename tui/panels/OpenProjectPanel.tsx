/**
 * OpenProjectPanel — 右栏内嵌:打开项目(最近项目 + 浏览目录)
 *
 * 阶段:
 *  - 'recents':浏览/选择最近项目(↑/↓ + Enter)
 *  - 'browse':调用系统文件管理器选个 folder
 *
 * 滚动:最近项目超出可视范围时,支持 ↑/↓ 滚动
 *
 * 系统文件管理器选目录:用 lib/pick-directory 跨平台弹原生 dialog
 * - Windows: PowerShell + FolderBrowserDialog(内置 .NET)
 * - macOS:   osascript + Finder choose folder
 * - Linux:   zenity → kdialog → python3 tkinter fallback
 *
 * 默认打开 initialPath = process.cwd()(memoria 调用嘅当前路径)
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { C } from '../contexts/TUIContext';
import { isMemoriaProject } from '../../lib/recent';
import { pickDirectory } from '../../lib/pick-directory';

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
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');

  const selectedRef = useRef(selected);
  const phaseRef = useRef(phase);
  const pickingRef = useRef(picking);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { pickingRef.current = picking; }, [picking]);

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

  // ── 触发系统文件管理器 ──
  const launchPicker = useCallback(async () => {
    setPicking(true);
    setError('');
    try {
      // 默认打开 memoria 调用嘅当前路径
      const path = await pickDirectory(process.cwd());
      if (!path) {
        // user cancel / 工具不可用:返回 recents phase
        setPhase('recents');
        return;
      }
      if (!isMemoriaProject(path)) {
        setError(`不是 Memoria 项目: ${path}`);
        return;
      }
      onSelect(path);
    } catch (err) {
      setError(`调用系统文件管理器失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPicking(false);
    }
  }, [onSelect]);

  // ── 键盘 ──
  useInput((_input, key) => {
    if (!isActive) return;
    // picking 期间系统文件管理器接管,disable 键盘交互
    if (pickingRef.current) return;

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
          // "浏览目录"项:弹系统文件管理器
          setPhase('browse');
          void launchPicker();
        }
      } else if (key.escape) {
        onCancel();
      }
    } else if (cur === 'browse') {
      // 弹系统文件管理器时,picking 期间所有键 disable
      // picking 完(launchPicker setPhase('recents') or error),phase 自动 reset
      if (key.escape) {
        setPhase('recents');
        setError('');
      }
    }
  });

  // ── 渲染 ──
  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1}>
        <Text bold color={C.cyan}>打开项目</Text>
      </Box>

      {/* 弹 dialog 状态指示 */}
      {picking && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={C.yellow} bold>⏳ 正在打开系统文件管理器...</Text>
          <Text dimColor>初始路径: {process.cwd()}</Text>
          <Text dimColor>(在弹出的 dialog 中选择 Memoria 项目目录)</Text>
        </Box>
      )}

      {/* picking 期间显示 loading,不显示 recents 列表(避免干扰) */}
      {!picking && recents.length === 0 && (
        <Box flexDirection="column">
          <Text color={C.muted}>暂无最近项目</Text>
          <Text dimColor>按 Enter 浏览目录(系统文件管理器)</Text>
        </Box>
      )}

      {!picking && recents.length > 0 && (
        <>
          {scrollOffset > 0 && (
            <Text dimColor>▲ 上方还有 {scrollOffset} 项</Text>
          )}
          <Box flexDirection="column">
            {recents.slice(scrollOffset, scrollOffset + visibleRows).map((r, i) => {
              const realIdx = scrollOffset + i;
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
            {/* "浏览目录" 项(总是 visible 在 recents 后) */}
            {scrollOffset <= recents.length && scrollOffset + visibleRows > recents.length && (() => {
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
          {scrollOffset + visibleRows < totalItems && (
            <Text dimColor>▼ 下方还有 {totalItems - scrollOffset - visibleRows} 项</Text>
          )}
        </>
      )}

      {error && <Text color={C.red}>✗ {error}</Text>}

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>{picking
          ? '等待系统 dialog...'
          : '↑/↓ 移动 · Enter 选择 · 浏览目录 弹系统文件管理器 · Esc 取消'}
        </Text>
      </Box>
    </Box>
  );
}
