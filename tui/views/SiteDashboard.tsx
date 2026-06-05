/**
 * SiteDashboard — 已打开站点的管理仪表盘视图
 * 左右分栏: FileTree + DetailPanel
 *
 * 状态提升: CommandInput 的 showHints 状态提升到这里,
 * 同步告诉 FileTree 让出 j/k 焦点(避免和命令面板冲突)
 *
 * 性能: getProjectName 同步读盘,用 useMemo 缓存(只在 currentProject 变时重读)
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Box, useWindowSize } from 'ink';
import { Layout } from '../components/Layout';
import { FileTree } from '../components/FileTree';
import { DetailPanel, type LogEntry } from '../components/DetailPanel';
import { C } from '../contexts/TUIContext';
import { getProjectName } from '../../lib/recent';
import { CommandInput } from '../components/CommandInput';

interface FileMetadata {
  type: 'directory' | 'blog' | 'vlog' | 'photo';
  name: string;
  path: string;
  date?: string;
  tags?: string[];
  description?: string;
  childCount?: number;
}

interface Props {
  currentProject: string;
  logs: LogEntry[];
  activeCommand: string | null;
  serverRunning: boolean;
  onCommand: (cmd: string) => void;
}

function SiteDashboardImpl({
  currentProject,
  logs,
  activeCommand,
  serverRunning,
  onCommand,
}: Props): React.ReactElement {
  const { rows } = useWindowSize();
  // 缓存:getProjectName 内部读 package.json,只在 currentProject 变时重读
  const siteName = useMemo(() => getProjectName(currentProject), [currentProject]);
  // CommandInput 是否处于激活态:激活时 FileTree 暂停 j/k 监听
  const [commandActive, setCommandActive] = useState(false);
  const handleCommandActiveChange = useCallback((active: boolean) => {
    setCommandActive(active);
  }, []);

  return (
    <Layout
      siteName={siteName}
      sitePath={currentProject}
      serverRunning={serverRunning}
      height={rows}>
      <Box flexDirection="row" justifyContent="center" alignItems="flex-start" flexGrow={1}>
        {/* Left Sidebar — 资源树 */}
        <Box
          width={30}
          minWidth={24}
          maxWidth={40}
          borderStyle="round"
          borderColor={C.cyan}
          paddingX={1}
          flexDirection="column"
          marginRight={1}
          flexGrow={0}
          flexShrink={0}
        >
          <FileTree rootDir={currentProject} inputPaused={commandActive} />
        </Box>
        <Box
          flexGrow={1}
          height={20}
          flexShrink={0}
          borderStyle="round"
          borderColor={C.orange}
          paddingX={1}
          flexDirection="column"
        >
          <DetailPanel
            logs={logs}
            activeCommand={activeCommand || undefined}
          />
        </Box>
      </Box>
      <CommandInput onCommand={onCommand} onActiveChange={handleCommandActiveChange} />
    </Layout>
  );
}

// React.memo: SiteDashboard 内部不直接依赖 logs 内容,只在 logs 引用变化时重渲染
// (logs 来自 useState 引用稳定,appendLog 才会换引用)
export const SiteDashboard = React.memo(SiteDashboardImpl, (prev, next) => {
  return (
    prev.currentProject === next.currentProject &&
    prev.logs === next.logs &&
    prev.activeCommand === next.activeCommand &&
    prev.serverRunning === next.serverRunning &&
    prev.onCommand === next.onCommand
  );
});
