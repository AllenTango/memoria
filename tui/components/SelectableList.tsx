/**
 * SelectableList — keyboard-navigable list component (modern FlexBox)
 */
import React from 'react';
import { Box, Text, useInput } from 'ink';
import { C } from '../contexts/TUIContext';

interface MenuItem {
  label: string;
  sub?: string;
  color: string;
}

interface SelectableListProps {
  items: MenuItem[];
  selected: number;
  onSelect: (i: number) => void;
  onConfirm?: (i: number) => void;
}

export function SelectableList({ items, selected, onSelect, onConfirm }: SelectableListProps): React.ReactElement {
  useInput((_, key) => {
    if (key.upArrow) onSelect(Math.max(0, selected - 1));
    else if (key.downArrow) onSelect(Math.min(items.length - 1, selected + 1));
    else if (key.return) {
      if (onConfirm) onConfirm(selected);
      else onSelect(selected);
    }
  });

  return (
    <Box flexDirection="column" paddingX={0}>
      {items.map((item, i) => {
        const isSelected = i === selected;
        return (
          <Box key={i} flexDirection="row" gap={1}>
            <Text color={isSelected ? item.color : C.muted} bold={isSelected} wrap="truncate">
              {isSelected ? '▶' : ' '}
            </Text>
            <Box flexGrow={1}>
              <Text color={isSelected ? item.color : C.muted} bold={isSelected} wrap="truncate">
                {item.label}
              </Text>
            </Box>
            {item.sub && (
              <Text color={C.muted} dimColor={!isSelected} wrap="truncate">{item.sub}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
