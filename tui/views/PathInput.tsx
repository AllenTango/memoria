/**
 * PathInput — directory path input screen (modern FlexBox)
 */
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { C } from '../contexts/TUIContext';
import { Header } from '../components/Frame';
import { BlinkingCursor } from '../components/BlinkingCursor';

interface Props {
  onSubmit: (path: string) => void;
  onCancel: () => void;
}

export function PathInput({ onSubmit, onCancel }: Props): React.ReactElement {
  const [value, setValue] = useState('');

  useInput((input, key) => {
    if (key.return) {
      if (value.trim()) onSubmit(value.trim());
    } else if (key.backspace) {
      setValue((v: string) => v.slice(0, -1));
    } else if (key.escape) {
      onCancel();
    } else if (input) {
      setValue((v: string) => v + input);
    }
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box borderStyle="round" borderColor={C.cyan} paddingX={1} flexDirection="column">
        <Text bold color={C.cyan}>📂 打开目录</Text>
        <Box flexDirection="column" marginTop={1} gap={1}>
          <Box flexDirection="row">
            <Text color={C.muted}>路径: </Text>
            <Text color={value ? C.cyan : C.muted} wrap="truncate">
              {value || '<输入路径>'}
            </Text>
            {value && <BlinkingCursor />}
          </Box>
          <Text dimColor>输入路径后按 Enter · Esc 返回</Text>
        </Box>
      </Box>
    </Box>
  );
}
