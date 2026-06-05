/**
 * CommandInput — 固定底部命令输入框,常驻 Layout 底部
 *
 * 设计参考 opencode / claude-code / deepcode-cli:
 * - 输入行永远在屏幕底部 1 行(borderStyle="round" 包裹)
 * - 按 / 唤出命令面板时,下拉用 position="absolute" 浮在屏幕底部**上方**,
 *   覆盖在主视图上,**不挤占**主视图布局,不会因为下拉高而让 logs/file tree 缩小
 * - 不会从屏幕底部溢出(absolute 定位 + bottom={2} 给输入行让位)
 * - ↑/↓ 选择,Enter 执行,j/k 留给 FileTree,Esc 退出
 *
 * 性能:
 * - 状态镜像到 ref 同步,setState 立即更新 ref(避免 Ink useInput 批处理陷阱)
 * - 派生 filtered 用 useMemo 缓存
 * - 最多渲染 6 条下拉 + 隐藏指示
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { C } from '../contexts/TUIContext';
import {
  processKey,
  filterCommands,
  INITIAL_STATE,
  type HandlerKey,
  type HandlerState,
} from './commandInputHandler';
import { ALL_COMMANDS, type CommandItem } from './commandItems';

interface CommandInputProps {
  onCommand: (cmd: string) => void;
  onActiveChange?: (active: boolean) => void;
  /**
   * 父级焦点控制:
   * - true:正常监听所有按键(用户正在命令面板输入)
   * - false:只监听 `/`(激活命令面板),其他按键 return 让出
   *   给左/右栏的 panel(避免多 useInput 冲突)
   */
  isActive?: boolean;
}

export function CommandInput({ onCommand, onActiveChange, isActive = true }: CommandInputProps): React.ReactElement {
  const [input, setInputState] = useState(INITIAL_STATE.input);
  const [selected, setSelected] = useState(INITIAL_STATE.selected);
  const [showHints, setShowHintsState] = useState(INITIAL_STATE.showHints);

  // 关键:isActive 用 ref 镜像,useInput 嘅 useCallback 不依赖 isActive
  // (避免 isActive 改变时 useCallback 重新 create,导致 useInput 重新 subscribe 丢 keypress)
  const isActiveRef = useRef(isActive);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  // 派生列表
  const filtered = useMemo(
    () => filterCommands(ALL_COMMANDS as CommandItem[], input, showHints),
    [input, showHints]
  );
  const safeSelected = filtered.length > 0 ? selected % filtered.length : 0;

  // ── 同步 ref 镜像 ──
  const inputRef = useRef(input);
  const selectedRef = useRef(selected);
  const showHintsRef = useRef(showHints);
  useEffect(() => { inputRef.current = input; }, [input]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { showHintsRef.current = showHints; }, [showHints]);

  useEffect(() => {
    onActiveChange?.(showHints);
  }, [showHints, onActiveChange]);

  const setInput = useCallback((v: string | ((p: string) => string)) => {
    if (typeof v === 'function') {
      setInputState(prev => {
        const next = (v as (p: string) => string)(prev);
        inputRef.current = next;
        return next;
      });
    } else {
      inputRef.current = v;
      setInputState(v);
    }
  }, []);

  const setShowHints = useCallback((v: boolean | ((p: boolean) => boolean)) => {
    if (typeof v === 'function') {
      setShowHintsState(prev => {
        const next = (v as (p: boolean) => boolean)(prev);
        showHintsRef.current = next;
        return next;
      });
    } else {
      showHintsRef.current = v;
      setShowHintsState(v);
    }
  }, []);

  const setSelectedSync = useCallback((updater: number | ((p: number) => number)) => {
    if (typeof updater === 'function') {
      setSelected(prev => {
        const next = (updater as (p: number) => number)(prev);
        selectedRef.current = next;
        return next;
      });
    } else {
      selectedRef.current = updater;
      setSelected(updater);
    }
  }, []);

  // ── 稳定的 handler(isActive 不在 deps,用 isActiveRef 守) ──
  const handleInput = useCallback((inp: string, key: HandlerKey) => {
    // 焦点不在命令面板时,只接 `/`(激活命令面板),其他键让出给左/右栏
    if (!isActiveRef.current) {
      if (inp === '/') {
        setShowHints(true);
        setSelectedSync(0);
      }
      return;
    }
    if (inp === 'j' || inp === 'k') {
      return; // 留给 FileTree
    }
    const state: HandlerState = {
      input: inputRef.current,
      showHints: showHintsRef.current,
      selected: selectedRef.current,
    };
    const result = processKey(ALL_COMMANDS as CommandItem[], state, inp, key);

    if (result.command) onCommand(result.command);
    setInput(result.next.input);
    setShowHints(result.next.showHints);
    setSelectedSync(result.next.selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCommand, setInput, setShowHints, setSelectedSync]);

  useInput(handleInput);

  // ── 渲染 ──
  // Dracula 主题风格 — 关键是文字/背景对比度:
  // - 下拉用 surface(#44475a) 背景浮在主视图上
  // - 未选中文字用 fg(#f8f8f2 浅白),在 surface 上有足够对比度
  // - 选中项紫底(#bd93f9) + 深色字(#282a36) 反色,跟未选中项对比强烈
  // - 间距 bottom=3: 1 行输入行 + 1 行间距 + 1 行间距
  return (
    <>
      {/* 下拉浮层(覆盖式,绝对定位) */}
      {showHints && filtered.length > 0 && (
        <Box
          position="absolute"
          bottom={3}
          left={2}
          right={2}
          flexDirection="column"
          borderStyle="round"
          borderColor={C.purple}
          backgroundColor={C.surface}
          paddingX={1}
          paddingY={1}
        >
          {/* 标题行 */}
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={C.yellow} bold backgroundColor={C.surface}>◆ COMMAND PALETTE</Text>
            <Text color={C.fg} backgroundColor={C.surface}>{filtered.length} 条 · ↑↓选择 · Enter</Text>
          </Box>
          <Text backgroundColor={C.surface}> </Text>
          {/* 命令列表 — 完整显示所有(ALL_COMMANDS=8,不需要滚动) */}
          {filtered.map((c, i) => {
            const isSelected = i === safeSelected;
            return (
              <Box
                key={c.cmd}
                flexDirection="row"
                gap={1}
                paddingX={1}
                backgroundColor={isSelected ? C.purple : C.surface}
              >
                <Text
                  backgroundColor={isSelected ? C.purple : C.surface}
                  color={isSelected ? C.bg : C.fg}
                  bold
                >
                  {isSelected ? '▶ ' : '   '}
                </Text>
                {/* 命令名:始终 fg(浅白)保证可读,选中加粗 + 反色 */}
                <Text
                  backgroundColor={isSelected ? C.purple : C.surface}
                  color={isSelected ? C.bg : C.fg}
                  bold={isSelected}
                >
                  {c.cmd}
                </Text>
                <Text
                  backgroundColor={isSelected ? C.purple : C.surface}
                  color={isSelected ? C.bg : C.fg}
                >
                  — {c.desc}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      {/* 下拉无匹配提示(也用 absolute) */}
      {showHints && filtered.length === 0 && input.length > 0 && (
        <Box
          position="absolute"
          bottom={3}
          left={2}
          right={2}
          flexDirection="column"
          borderStyle="round"
          borderColor={C.red}
          backgroundColor={C.surface}
          paddingX={1}
        >
          <Text color={C.red} bold backgroundColor={C.surface}>✗ 未找到匹配命令</Text>
        </Box>
      )}

      {/* 底部输入行 — 永远 1 行,固定在屏幕底部(无背景,跟下拉区分) */}
      <Box
        flexShrink={0}
        borderStyle="round"
        borderColor={showHints ? C.purple : C.muted}
        paddingX={1}
        flexDirection="row"
        alignItems="center"
        gap={1}
      >
        <Text color={showHints ? C.purple : C.muted} bold>⌘</Text>
        <Text color={C.muted}>›</Text>
        {showHints ? (
          <>
            <Text color={C.yellow} bold wrap="truncate">{input}</Text>
            <Text color={C.cyan} bold>|</Text>
            <Text color={C.muted} dimColor> · ↑↓选择 · Enter执行 · Esc退出</Text>
          </>
        ) : (
          <Text color={C.muted} dimColor>键入 / 激活指令</Text>
        )}
      </Box>
    </>
  );
}
