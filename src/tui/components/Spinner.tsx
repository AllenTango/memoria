/**
 * Spinner — animated loading indicator
 */
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { C } from '../core/theme';

export function Spinner({ label }: { label: string }): React.ReactElement {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % frames.length), 80);
    return () => clearInterval(id);
  }, []);

  return (
    <Box>
      <Text color={C.purple}>{frames[frame]}</Text>
      <Text color={C.muted}> {label}</Text>
    </Box>
  );
}
