/**
 * BlinkingCursor — animated cursor for text input
 */
import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { C } from '../core/theme';

export function BlinkingCursor(): React.ReactElement {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setVisible(v => !v), 530);
    return () => clearInterval(id);
  }, []);
  return <Text color={C.cyan} bold={visible}>▎</Text>;
}
