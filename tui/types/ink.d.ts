// ink 类型声明补丁
// 解决 moduleResolution="bundler" 时 key/onClick/marginTop 等 props 不被识别的问题
declare module 'ink' {
  import type { ComponentType, ReactElement } from 'react';

  export type RenderOptions = {
    stdout?: NodeJS.WriteStream;
    stdin?: NodeJS.ReadStream;
    stderr?: NodeJS.WriteStream;
    exitOnCtrlC?: boolean;
    alternateScreen?: boolean;
  };

  export interface Instance {
    cleanup(): void;
    waitUntilExit(): Promise<void>;
  }

  export interface BoxProps {
    borderStyle?: string;
    borderColor?: string;
    paddingX?: number;
    paddingY?: number;
    flexDirection?: 'row' | 'column';
    flexGrow?: number;
    alignItems?: string;
    justifyContent?: string;
    width?: number | string;
    minWidth?: number;
    maxWidth?: number;
    height?: number | string;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    gap?: number;
    flexWrap?: string;
    key?: string | number;
    onClick?: () => void;
  }
  export const Box: ComponentType<BoxProps>;

  export interface TextProps {
    color?: string;
    bold?: boolean;
    dimColor?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    inverse?: boolean;
    wrap?: 'truncate' | 'wrap' | 'fit';
    key?: string | number;
    onClick?: () => void;
  }
  export const Text: ComponentType<TextProps>;

  export interface Key {
    upArrow: boolean;
    downArrow: boolean;
    leftArrow: boolean;
    rightArrow: boolean;
    pageDown: boolean;
    pageUp: boolean;
    home: boolean;
    end: boolean;
    return: boolean;
    escape: boolean;
    ctrl: boolean;
    shift: boolean;
    tab: boolean;
    backspace: boolean;
    delete: boolean;
    meta: boolean;
    super?: boolean;
    hyper?: boolean;
    capsLock?: boolean;
    numLock?: boolean;
    eventType?: 'press' | 'repeat' | 'release';
  }
  export function useInput(
    handler: (input: string, key: Key) => void,
    options?: { isActive?: boolean }
  ): void;

  export interface WindowSize {
    columns: number;
    rows: number;
  }
  export function useWindowSize(): WindowSize;

  // useStdout 用于直接同步拿 stdout 嘅 size(columns/rows),避开 useWindowSize 首次 render 拿 0 嘅 issue
  export interface Stdout {
    columns: number;
    rows: number;
    on(event: 'resize', listener: () => void): void;
    off(event: 'resize', listener: () => void): void;
    write(data: string): boolean;
  }
  export function useStdout(): { stdout: Stdout };

  export function useApp(): { exit: () => void };

  export default function render(
    element: ReactElement,
    options?: RenderOptions
  ): Instance;

  export { render };
}