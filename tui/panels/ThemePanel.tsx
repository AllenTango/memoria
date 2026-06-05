/**
 * ThemePanel — 右栏内嵌:主题选择
 *
 * 用法: ↑/↓ 切换主题,Enter 应用,Esc 取消
 * 应用成功(applyTheme success)后立即调 onApply 关闭面板
 */
import React, { useState, useRef, useEffect } from 'react';
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
  isActive: boolean;
  projectRoot: string;
  /** 应用成功时调用(可用于触发 rebuild / 刷新) */
  onApply: (themeName: string) => void;
  /** 取消时调用 */
  onCancel: () => void;
}

export function ThemePanel({ isActive, projectRoot, onApply, onCancel }: Props): React.ReactElement {
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState('');
  const selectedRef = useRef(selected);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  useInput((input, key) => {
    if (!isActive) return;
    if (key.upArrow) {
      setSelected(s => (s - 1 + BUILT_IN_THEMES.length) % BUILT_IN_THEMES.length);
    } else if (key.downArrow) {
      setSelected(s => (s + 1) % BUILT_IN_THEMES.length);
    } else if (key.return) {
      const theme = BUILT_IN_THEMES[selectedRef.current];
      const r = applyTheme(projectRoot, theme.name);
      if (r.success) {
        onApply(theme.name);
      } else {
        setError(r.error || '应用失败');
      }
    } else if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1}>
        <Text bold color={C.cyan}>选择主题</Text>
        <Text dimColor> · ↑/↓ 切换 · Enter 应用 · Esc 取消</Text>
      </Box>
      <Box flexDirection="column" gap={1}>
        {BUILT_IN_THEMES.map((t, i) => {
          const isSelected = i === selected;
          return (
            <Box key={t.name} flexDirection="row" gap={1}>
              <Text color={isSelected ? C.green : C.muted} bold={isSelected}>
                {isSelected ? '▶' : ' '}
              </Text>
              <Text color={isSelected ? C.green : C.muted} bold={isSelected} wrap="truncate">
                {t.emoji} {t.name} — {t.desc}
              </Text>
            </Box>
          );
        })}
      </Box>
      {error && <Text color={C.red} marginTop={1}>✗ {error}</Text>}
    </Box>
  );
}
