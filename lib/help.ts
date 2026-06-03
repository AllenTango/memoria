/**
 * lib/help.ts
 * Help text — pure console output, no business logic
 */
export function helpCommand(): void {
  console.log(`
📚 Memoria CLI

用法:
  memoria [命令] [选项]

命令:
  memoria           进入 TUI 交互界面
  memoria -v        显示版本号
  memoria -h        显示帮助信息
  memoria upgrade   同步内置主题到站点

TUI 模式:
  memoria /new      新建站点
  memoria /open     打开已有站点
  memoria /build    构建站点
  memoria /preview  预览站点

示例:
  memoria
  memoria -h
`);
}