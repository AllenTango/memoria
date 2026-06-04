/**
 * ThemePicker — built-in theme selector (modern FlexBox)
 * Wrapped in Layout for consistent header/footer chrome.
 */
import React, { useState } from 'react';
import { Box, Text, useInput, useWindowSize } from 'ink';
import { C } from '../contexts/TUIContext';
import { Layout } from '../components/Layout';
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
  const { rows } = useWindowSize();
  const [selected, setSelected] = useState(0);

  useInput((_, key) => {
    if (key.upArrow) setSelected((s: number) => (s - 1 + BUILT_IN_THEMES.length) % BUILT_IN_THEMES.length);
    else if (key.downArrow) setSelected((s: number) => (s + 1) % BUILT_IN_THEMES.length);
    else if (key.return) { applyTheme(projectRoot, BUILT_IN_THEMES[selected].name); onClose(); }
    else if (key.escape) onClose();
  });

  return (
    <Layout siteName="选择主题" sitePath={projectRoot} serverRunning={false} height={rows}>
      <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
        <Box flexDirection="column" gap={0}>
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
    </Layout>
  );
}