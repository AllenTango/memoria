/**
 * SiteDashboard — 已打开站点的管理仪表盘视图
 * 左右分栏: FileTree + DetailPanel
 */
import React from 'react';
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

export function SiteDashboard({
  currentProject,
  logs,
  activeCommand,
  serverRunning,
  onCommand,
}: Props): React.ReactElement {
  const { rows } = useWindowSize();
  return (
    <Layout
      siteName={getProjectName(currentProject)}
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
          <FileTree rootDir={currentProject} />
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
      <CommandInput onCommand={onCommand} />
    </Layout>
  );
}