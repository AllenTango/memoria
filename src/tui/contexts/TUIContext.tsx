/**
 * TUIContext — global layout context (theme colors + dynamic width)
 */
import React, { createContext, useContext } from 'react';

/** Theme colors — Dracula */
export const C = {
  bg: '#282a36',
  surface: '#44475a',
  fg: '#f8f8f2',
  muted: '#6272a4',
  cyan: '#8be9fd',
  green: '#50fa7b',
  orange: '#ffb86c',
  pink: '#ff79c6',
  purple: '#bd93f9',
  red: '#ff5559',
  yellow: '#f1fa8c',
};

interface TUIContextValue {
  W: number;        // layout width (= terminal columns)
  C: typeof C;
  minW: number;      // min width (80)
}

const TUIContext = createContext<TUIContextValue>({
  W: 80,
  C,
  minW: 80,
});

export function useTUI(): TUIContextValue {
  return useContext(TUIContext);
}

interface Props {
  children: React.ReactNode;
  W: number;
}

export function TUIProvider({ children, W }: Props): React.ReactElement {
  const minW = Math.max(80, W);
  return (
    <TUIContext.Provider value={{ W: minW, C, minW }}>
      {children}
    </TUIContext.Provider>
  );
}
