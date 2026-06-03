/**
 * CommandPalette — slash-command fuzzy finder (modern FlexBox, no ASCII)
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { C, useTUI } from '../contexts/TUIContext';
import { BlinkingCursor } from '../components/BlinkingCursor';

interface CommandItem {
  cmd: string;
  desc: string;
  color: string;
}

interface Props {
  onCommand: (cmd: string) => void;
  onClose: () => void;
}

const ALL_COMMANDS: CommandItem[] = [
  { cmd: '/create',     desc: '新建站点',        color: C.green },
  { cmd: '/open',       desc: '打开项目',         color: C.cyan },
  { cmd: '/generate',   desc: '构建站点',         color: C.orange },
  { cmd: '/bundle',     desc: '构建 + 打包',      color: C.yellow },
  { cmd: '/server',     desc: '本地预览',         color: C.purple },
  { cmd: '/deploy',     desc: '部署站点',         color: C.green },
  { cmd: '/new:blog',   desc: '新建文章',         color: C.green },
  { cmd: '/new:vlog',   desc: '新建视频',         color: C.cyan },
  { cmd: '/new:photo',  desc: '新建相册',         color: C.pink },
  { cmd: '/theme',      desc: '切换主题',         color: C.orange },
  { cmd: '/exit',       desc: '退出',             color: C.red },
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

export function CommandPalette({ onCommand, onClose }: Props): React.ReactElement {
  const { W } = useTUI();
  const [input, setInput] = useState('/');
  const [selected, setSelected] = useState(0);

  const filtered = useMemo(() => {
    if (input === '/') return ALL_COMMANDS;
    return ALL_COMMANDS.filter(c => fuzzyMatch(c.cmd, input) || fuzzyMatch(c.desc, input));
  }, [input]);

  useEffect(() => { setSelected(0); }, [filtered]);

  useInput((inp, key) => {
    if (key.return) {
      if (filtered.length > 0) {
        onCommand(filtered[selected].cmd);
      } else if (input.trim()) {
        onCommand(input.trim());
      }
    } else if (key.backspace) {
      setInput((v: string) => v.slice(0, -1) || '/');
    } else if (key.upArrow) {
      setSelected((s: number) => Math.max(0, s - 1));
    } else if (key.downArrow) {
      setSelected((s: number) => Math.min(filtered.length - 1, s + 1));
    } else if (key.escape) {
      onClose();
    } else if (inp && input.length < 30) {
      setInput((v: string) => v + inp);
    }
  });

  function renderCmd(cmd: string): React.ReactElement {
    if (cmd.startsWith(input)) {
      return (
        <>
          <Text bold color={C.yellow}>{input}</Text>
          <Text color={C.cyan}>{cmd.slice(input.length)}</Text>
        </>
      );
    }
    return <Text color={C.cyan} bold>{cmd}</Text>;
  }

  return (
    <Box
      flexDirection="column"
      width={Math.min(W, 72)}
      marginTop={3}
      marginLeft={Math.floor((W - Math.min(W, 72)) / 2)}
      borderStyle="round"
      borderColor={C.purple}
      paddingX={1}
      paddingY={1}
    >
      <Text bold color={C.purple}>⌘ 命令面板</Text>
      <Box flexDirection="row" marginTop={1} gap={1}>
        <Text color={C.yellow} bold>{input}</Text>
        <BlinkingCursor />
      </Box>

      <Box flexDirection="column" marginTop={1} gap={0}>
        {filtered.length === 0 ? (
          <Text color={C.red}>未找到匹配命令</Text>
        ) : (
          filtered.slice(0, 8).map((c, i) => (
            <Box key={c.cmd} flexDirection="row" gap={1}>
              <Text color={i === selected ? c.color : C.muted} wrap="truncate">
                {i === selected ? '▶' : ' '}
              </Text>
              {renderCmd(c.cmd)}
              <Text color={C.muted} dimColor> — {c.desc}</Text>
            </Box>
          ))
        )}
      </Box>

      <Text dimColor marginTop={1}>↑↓ 选择 · Enter 执行 · Esc 关闭 ({filtered.length} 条)</Text>
    </Box>
  );
}
