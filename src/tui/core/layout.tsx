/**
 * Layout helpers — ASCII box dimensions and spacing utilities
 */
import React from 'react';
import { Text, Box } from 'ink';
import { C, W } from './theme';

/** Horizontal divider line */
export function Divider(): React.ReactElement {
  return <Text color={C.muted}>{'─'.repeat(W)}</Text>;
}

/** ASCII box top border with optional title */
export function BoxTop(title: string): React.ReactElement {
  const pad = Math.max(0, W - 2 - title.length);
  return <Text color={C.purple}>┌─ {title} {'─'.repeat(pad)}┐</Text>;
}

/** ASCII box bottom border */
export function BoxBottom(): React.ReactElement {
  return <Text color={C.purple}>{'└' + '─'.repeat(W) + '┘'}</Text>;
}

/** ASCII box middle border */
export function BoxMid(): React.ReactElement {
  return <Text color={C.purple}>{'├' + '─'.repeat(W) + '┤'}</Text>;
}

/** Right-padded line inside a box row */
export function BoxRow(content: string, padColor = C.muted): React.ReactElement {
  const pad = Math.max(0, W - 2 - content.length);
  return <Text color={padColor}>│ {content}{' '.repeat(pad)}│</Text>;
}

/** Two-segment row: left (colored) + right (muted, padded) */
export function BoxRow2(left: React.ReactNode, right: string): React.ReactElement {
  const rightPad = Math.max(0, W - 2 - (left.props ? (left.props.children?.length || 0) : String(left).length) - right.length);
  return (
    <Text color={C.muted}>│{' '}</Text>
  );
}
