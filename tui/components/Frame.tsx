/**
 * Header / Footer / StatusBar — modern Ink border components
 * No ASCII boxes — uses Ink borderStyle instead
 */
import React from 'react';
import { Box, Text } from 'ink';
import { C } from '../contexts/TUIContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps): React.ReactElement {
  return (
    <Box borderStyle="round" borderColor={C.purple} paddingX={1} flexDirection="column">
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color={C.purple}>{title}</Text>
        {subtitle && <Text dimColor>{subtitle}</Text>}
      </Box>
      {subtitle && (
        <Text dimColor>{subtitle}</Text>
      )}
    </Box>
  );
}

export function Footer({ text }: { text: string }): React.ReactElement {
  return (
    <Box paddingX={1} flexDirection="column">
      <Text dimColor>{text}</Text>
    </Box>
  );
}

interface StatusBarProps {
  shortcuts: [string, string][];
}

export function StatusBar({ shortcuts }: StatusBarProps): React.ReactElement {
  const line = shortcuts.map(([k, d]) => (
    <>
      <Text color={C.yellow} bold>{k}</Text>
      <Text dimColor> {d}</Text>
    </>
  ));

  return (
    <Box borderStyle="round" borderColor={C.muted} paddingX={1} flexDirection="column">
      <Box flexDirection="row" gap={2} justifyContent="center" flexWrap="wrap">
        {line}
      </Box>
    </Box>
  );
}
