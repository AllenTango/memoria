/**
 * ConfirmBox — yes/no confirmation dialog (modern FlexBox)
 */
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { C, useTUI } from '../contexts/TUIContext';

interface ConfirmBoxProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmBox({ message, onConfirm, onCancel }: ConfirmBoxProps): React.ReactElement {
  const { W } = useTUI();
  const [sel, setSel] = useState(0);
  useInput((_, key) => {
    if (key.leftArrow || key.rightArrow) setSel((s: number) => 1 - s);
    else if (key.return) sel === 0 ? onConfirm() : onCancel();
    else if (key.escape) onCancel();
  });

  const opts = [
    { label: '确认', color: C.green },
    { label: '取消', color: C.red },
  ];

  return (
    <Box flexDirection="column" width={Math.min(W, 60)} marginLeft={Math.floor((W - Math.min(W, 60)) / 2)} marginTop={5}>
      <Box borderStyle="round" borderColor={C.yellow} paddingX={1} paddingY={1} flexDirection="column">
        <Text bold color={C.yellow}>⚠ 确认</Text>
        <Text color={C.fg}>{message}</Text>
      </Box>
      <Box flexDirection="row" gap={3} justifyContent="center" marginTop={1}>
        {opts.map((o, i) => (
          <Text key={o.label} color={i === sel ? o.color : C.muted} bold={i === sel} wrap="truncate">
            {i === sel ? `▶ ${o.label}` : `  ${o.label}`}
          </Text>
        ))}
      </Box>
      <Text dimColor alignText="center" marginTop={1}>← → 切换 · Enter 确认 · Esc 取消</Text>
    </Box>
  );
}
