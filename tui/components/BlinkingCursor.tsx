/**
 * BlinkingCursor — animated cursor for text input
 */
import React, { useState, useEffect, memo } from 'react';
import { Text } from 'ink';
import { C } from '../contexts/TUIContext';

export const BlinkingCursor = memo(function BlinkingCursor(): React.ReactElement {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setVisible(v => !v), 530);
    return () => clearInterval(id);
  }, []);
  return <Text color={C.cyan} bold={visible}>▎</Text>;
});
