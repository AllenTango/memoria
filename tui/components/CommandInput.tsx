/**
 * CommandInput — 固定命令输入框，常驻 StatusBar 上方
 * 类似 opencode 底部命令条：预填 ⌘ > /，支持 fuzzy 搜索下拉
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { C } from '../contexts/TUIContext';
import { BlinkingCursor } from './BlinkingCursor';

interface CommandItem {
  cmd: string;
  desc: string;
  color: string;
}

const ALL_COMMANDS: CommandItem[] = [
  { cmd: '/create',   desc: '新建站点',        color: C.green },
  { cmd: '/open',     desc: '打开项目',          color: C.cyan },
  { cmd: '/generate', desc: '构建站点 (/b)',     color: C.orange },
  { cmd: '/bundle',   desc: '构建 + 打包',       color: C.yellow },
  { cmd: '/server',   desc: '本地预览',          color: C.purple },
  { cmd: '/deploy',   desc: '部署站点',          color: C.green },
  { cmd: '/new:blog', desc: '新建文章',          color: C.green },
  { cmd: '/new:vlog', desc: '新建视频',          color: C.cyan },
  { cmd: '/new:photo',desc: '新建相册',          color: C.pink },
  { cmd: '/theme',    desc: '切换主题',          color: C.orange },
  { cmd: '/exit',     desc: '退出',              color: C.red },
];

function fuzzyMatch(cmd: string, input: string): boolean {
  if (!input) return true;
  const needle = input.toLowerCase();
  let j = 0;
  for (const ch of cmd.toLowerCase()) {
    if (ch === needle[j]) j++;
    if (j === needle.length) return true;
  }
  return false;
}

interface CommandInputProps {
  onCommand: (cmd: string) => void;
  visible: boolean;   // 是否显示输入框
}

export function CommandInput({ onCommand, visible }: CommandInputProps): React.ReactElement {
  const [input, setInput] = useState('/');
  const [selected, setSelected] = useState(0);
  const [showHints, setShowHints] = useState(false);

  const filtered = input === '/'
    ? ALL_COMMANDS
    : ALL_COMMANDS.filter(c => fuzzyMatch(c.cmd, input) || fuzzyMatch(c.desc, input));

  // 重置选择idx当过滤结果变化
  useEffect(() => { setSelected(0); }, [filtered]);

  // 外部隐藏时清空
  useEffect(() => {
    if (!visible) {
      setInput('/');
      setShowHints(false);
    }
  }, [visible]);

  useInput((inp, key) => {
    if (!visible) return;

    if (key.return) {
      const trimmed = input.trim();
      if (!trimmed) return;
      if (trimmed.startsWith('/') && filtered.length > 0) {
        // fuzzy 模式下用选中项
        onCommand(filtered[selected].cmd);
      } else {
        // 直接执行
        onCommand(trimmed);
      }
      setInput('/');
      setShowHints(false);
    } else if (key.backspace) {
      setInput(prev => {
        const next = prev.slice(0, -1) || '/';
        return next;
      });
      setShowHints(false);
    } else if (key.upArrow) {
      if (showHints) setSelected(s => Math.max(0, s - 1));
    } else if (key.downArrow) {
      if (showHints) setSelected(s => Math.min(filtered.length - 1, s + 1));
    } else if (key.escape) {
      setInput('/');
      setShowHints(false);
    } else if (inp && inp !== '/') {
      const next = input + inp;
      setInput(next);
      setShowHints(true);
    } else if (inp === '/') {
      // 直接按 / 重置为 / 并显示全部
      setInput('/');
      setShowHints(true);
    }
  });

  if (!visible) return <Box />;

  return (
    <Box
      borderStyle="round"
      borderColor={C.purple}
      paddingX={1}
      paddingY={0}
      flexDirection="column"
    >
      {/* 输入行 */}
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text color={C.purple} bold>⌘</Text>
        <Text color={C.muted}>›</Text>
        <Text color={C.yellow} bold wrap="truncate">{input}</Text>
        <BlinkingCursor />
        <Text color={C.muted} dimColor> · ↑↓选择 · Enter执行</Text>
      </Box>

      {/* 匹配下拉 */}
      {showHints && filtered.length > 0 && (
        <Box flexDirection="column" marginTop={1} gap={0}>
          {filtered.slice(0, 6).map((c, i) => (
            <Box key={c.cmd} flexDirection="row" gap={1}>
              <Text color={i === selected ? c.color : C.muted} wrap="truncate">
                {i === selected ? '▶' : ' '}
              </Text>
              <Text color={i === selected ? c.color : C.muted} bold={i === selected} wrap="truncate">
                {c.cmd}
              </Text>
              <Text color={C.muted} dimColor>— {c.desc}</Text>
            </Box>
          ))}
        </Box>
      )}

      {showHints && filtered.length === 0 && (
        <Text color={C.red} dimColor>未找到匹配命令</Text>
      )}
    </Box>
  );
}