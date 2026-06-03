/**
 * Ink 类型补丁 — 让 tsc 能识别 Ink 组件的常用 props
 * 项目使用 esbuild 打包，tsc 仅做类型检查
 */
declare module 'ink' {
  // Box props 扩展
  interface BoxProps {
    flexGrow?: number;
    flexDirection?: 'row' | 'column';
    justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';
    alignItems?: 'flex-start' | 'flex-end' | 'center';
    marginTop?: number;
    marginBottom?: number;
    marginRight?: number;
    marginLeft?: number;
    minWidth?: number;
    maxWidth?: number;
    overflow?: 'hidden';
  }

  // Text props 扩展
  interface TextProps {
    bold?: boolean;
    italic?: boolean;
    dimColor?: boolean;
    wrap?: 'wrap' | 'truncate' | 'clip' | 'none';
    alignText?: 'left' | 'right' | 'center';
    onClick?: () => void;
  }
}