/**
 * PathInput — directory path input screen (Layout版)
 */
import React, { useState } from 'react';
import { Box, Text, useInput, useWindowSize } from 'ink';
import { Layout } from '../components/Layout';
import { BlinkingCursor } from '../components';
import { C } from '../contexts/TUIContext';

interface Props {
  onSubmit: (path: string) => void;
  onCancel: () => void;
  serverRunning: boolean;
}

export function PathInput({ onSubmit, onCancel, serverRunning }: Props): React.ReactElement {
  const { rows } = useWindowSize();
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
    <Layout
      siteName="输入路径"
      sitePath=""
      serverRunning={serverRunning}
    >
      <Box flexDirection="column" justifyContent="center" alignItems="center"  height={rows} gap={1}>
        <Box flexDirection="row">
          <Text color={C.muted}>路径: </Text>
          <Text color={value ? C.cyan : C.muted} wrap="truncate">
            {value || '<输入路径>'}
          </Text>
          {value && <BlinkingCursor />}
        </Box>
      </Box>
    </Layout>
  );
}