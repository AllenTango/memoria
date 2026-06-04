/**
 * CommandInput — 固定命令输入框，常驻 StatusBar 上方
 * 类似 opencode 底部命令条：预填 ⌘ > /，支持 fuzzy 搜索下拉
 */
import React, { useState, useMemo, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { C } from '../contexts/TUIContext';

interface CommandItem {
  cmd: string;
  desc: string;
  color: string;
}

const ALL_COMMANDS: CommandItem[] = [
  { cmd: '/server', desc: '启动预览服务器', color: C.green },
  { cmd: '/stop', desc: '停止预览服务器', color: C.red },
  { cmd: '/generate', desc: '构建站点', color: C.orange },
  { cmd: '/bundle', desc: '构建 + 打包', color: C.yellow },
  { cmd: '/deploy', desc: '部署站点', color: C.green },
  { cmd: '/new', desc: '新建 随笔/影像/相册', color: C.green },
  { cmd: '/open', desc: '在文件管理器中打开目录', color: C.green },
  { cmd: '/theme', desc: '切换主题', color: C.orange },
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
}

export function CommandInput({ onCommand }: CommandInputProps): React.ReactElement {
  const [input, setInput] = useState('/');
  const [selected, setSelected] = useState(0);
  const [showHints, setShowHints] = useState(false);

  const filtered = useMemo(() =>
    input === '/'
      ? ALL_COMMANDS
      : ALL_COMMANDS.filter(c => fuzzyMatch(c.cmd, input) || fuzzyMatch(c.desc, input)),
    [input]
  );

  const visibleCount = useMemo(() => Math.min(filtered.length, 6), [filtered]);
  const visibleIndex = selected % Math.max(visibleCount, 1);

  const handleInput = useCallback((inp: string, key: { return?: boolean; backspace?: boolean; upArrow?: boolean; downArrow?: boolean; escape?: boolean }) => {
    if (key.return) {
      const trimmed = input.trim();
      if (!trimmed) return;
      if (trimmed.startsWith('/') && filtered.length > 0) {
        onCommand(filtered[selected].cmd);
      } else {
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
      if (showHints) setSelected(s => (s - 1 + filtered.length) % filtered.length);
    } else if (key.downArrow) {
      if (showHints) setSelected(s => (s + 1) % filtered.length);
    } else if (key.escape) {
      setInput('/');
      setShowHints(false);
    } else if (inp && inp !== '/') {
      const next = input + inp;
      setInput(next);
      setShowHints(true);
    } else if (inp === '/') {
      setInput('/');
      setShowHints(true);
    }
  }, [input, filtered, selected, showHints, onCommand]);

  useInput(handleInput);

  return (
    <Box
      borderStyle="round"
      borderColor={showHints ? C.purple : C.muted}
      paddingX={1}
      paddingY={0}
      flexDirection="column"
    >
      {/* 输入行 */}
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text color={showHints ? C.purple : C.muted} bold>⌘</Text>
        <Text color={C.muted}>›</Text>
        {showHints ? (
          <>
            <Text color={C.yellow} bold wrap="truncate">{input}</Text>
            <Text color={C.cyan} bold>|</Text>
            <Text color={C.muted} dimColor> · ↑↓选择 · Enter执行</Text>
          </>
        ) : (
          <Text color={C.muted} dimColor>键入 / 激活指令</Text>
        )}
      </Box>

      {/* 匹配下拉 */}
      {showHints && filtered.length > 0 && (
        <Box flexDirection="column" marginTop={1} gap={0}>
          {filtered.slice(0, 6).map((c, i) => {
            const isSelected = i === visibleIndex;
            return (
              <Box key={c.cmd} flexDirection="row" gap={1}>
                <Text color={isSelected ? c.color : C.muted} wrap="truncate">
                  {isSelected ? '▶' : ' '}
                </Text>
                <Text color={isSelected ? c.color : C.muted} bold={isSelected} wrap="truncate">
                  {c.cmd}
                </Text>
                <Text color={C.muted} dimColor>— {c.desc}</Text>
              </Box>
            );
          })}
        </Box>
      )}

      {showHints && filtered.length === 0 && input.length > 0 && (
        <Text color={C.red} dimColor>未找到匹配命令</Text>
      )}
    </Box>
  );
}