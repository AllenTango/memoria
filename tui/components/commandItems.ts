/**
 * CommandInput 可用命令列表
 * 抽到独立文件以便 processKey 纯函数复用
 */
export interface CommandItem {
  cmd: string;
  desc: string;
  color: string;
}

export const ALL_COMMANDS: CommandItem[] = [
  { cmd: '/server', desc: '启动预览服务器', color: '#50fa7b' },
  { cmd: '/stop', desc: '停止预览服务器', color: '#ff5559' },
  { cmd: '/generate', desc: '构建站点', color: '#ffb86c' },
  { cmd: '/bundle', desc: '构建 + 打包', color: '#f1fa8c' },
  { cmd: '/deploy', desc: '部署站点', color: '#50fa7b' },
  { cmd: '/new', desc: '新建 随笔/影像/相册', color: '#50fa7b' },
  { cmd: '/open', desc: '在文件管理器中打开目录', color: '#50fa7b' },
  { cmd: '/theme', desc: '切换主题', color: '#ffb86c' },
];
