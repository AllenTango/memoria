/**
 * ThemePicker — built-in theme selector (modern FlexBox)
 */
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { C } from '../contexts/TUIContext';
import { applyTheme } from '../../lib/apply-theme';

const BUILT_IN_THEMES = [
  { name: 'dracula', emoji: '🌙', desc: 'Dracula 暗黑系' },
  { name: 'peach',   emoji: '☀️', desc: 'Peach 暖橙系' },
  { name: 'nord',    emoji: '❄️',  desc: 'Nord 冷淡蓝' },
  { name: 'mint',    emoji: '🌿', desc: 'Mint 清新绿' },
];

interface Props {
  projectRoot: string;
  onClose: () => void;
}

export function ThemePicker({ projectRoot, onClose }: Props): React.ReactElement {
  const [selected, setSelected] = useState(0);

  useInput((_, key) => {
    if (key.upArrow) setSelected((s: number) => (s - 1 + BUILT_IN_THEMES.length) % BUILT_IN_THEMES.length);
    else if (key.downArrow) setSelected((s: number) => (s + 1) % BUILT_IN_THEMES.length);
    else if (key.return) { applyTheme(projectRoot, BUILT_IN_THEMES[selected].name); onClose(); }
    else if (key.escape) onClose();
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box borderStyle="round" borderColor={C.pink} paddingX={1} flexDirection="column">
        <Text bold color={C.pink}>🎨 切换主题</Text>
        <Box flexDirection="column" marginTop={1} gap={0}>
          {BUILT_IN_THEMES.map((t, i) => (
            <Box key={t.name} flexDirection="row" gap={1}>
              <Text color={i === selected ? C.green : C.muted} wrap="truncate">
                {i === selected ? '▶' : ' '}
              </Text>
              <Text color={i === selected ? C.green : C.muted} bold={i === selected} wrap="truncate">
                {t.emoji} {t.name} — {t.desc}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
      <Text dimColor marginTop={1}>↑↓ 选择 · Enter 确认 · Esc 返回</Text>
    </Box>
  );
}