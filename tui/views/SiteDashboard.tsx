/**
 * SiteDashboard — 已打开站点的管理仪表盘视图
 *
 * 布局(由 Layout 决定,左栏 40% / 右栏 60%):
 *   - 顶栏(站点名 + 路径)
 *   - 左栏:全屏指令菜单(11 项,滚动)
 *   - 右栏:
 *     - 没按 Enter:该指令历史日志(executable) / "按 Enter 触发"提示(interactive)
 *     - 按 Enter:
 *       - interactive:进入 form(overview=FileTree, new=NewContentPanel, theme=ThemePanel 等)
 *       - executable:直接执行(openDir/generate/server/stop/bundle/deploy/syncTheme)
 *   - 底栏
 *
 * 互斥:启动/停止服务根据 serverRunning state dim
 *
 * 焦点(不用 Tab):
 *   - 'menu'(默认):InstructionMenu 接管 ↑/↓ + Enter
 *   - 'form':右栏 form 接管,Esc 退回 menu
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Box, Text, useInput, useWindowSize } from 'ink';
import { Layout } from '../components/Layout';
import { FileTree } from '../components/FileTree';
import { LogPanel } from '../panels/LogPanel';
import { InstructionMenu, type MenuItem } from '../panels/InstructionMenu';
import { NewContentPanel } from '../panels/NewContentPanel';
import { ThemePanel } from '../panels/ThemePanel';
import { C } from '../contexts/TUIContext';
import { getProjectName } from '../../lib/recent';
import { type LogEntry } from '../components/DetailPanel';

type InteractiveMode = 'overview' | 'newContent' | 'theme' | 'newTheme';
type Focus = 'menu' | 'form';

interface Props {
  currentProject: string;
  logs: LogEntry[];
  /** 每个 log entry 可选带 command 字段(SiteDashboard 右栏 default 按当前选中 cmd filter) */
  serverRunning: boolean;
  /** 父级命令执行(generate/bundle/server/stop/open/deploy),返回 Promise<void> */
  onCommand: (cmd: string) => void;
  onExit: () => void;
}

export function SiteDashboard({
  currentProject,
  logs,
  serverRunning,
  onCommand,
  onExit,
}: Props): React.ReactElement {
  const { rows } = useWindowSize();
  const siteName = useMemo(() => getProjectName(currentProject), [currentProject]);

  // ── State ──
  const [menuSelected, setMenuSelected] = useState(0);
  const [interactiveMode, setInteractiveMode] = useState<InteractiveMode | null>(null);
  const [focus, setFocus] = useState<Focus>('menu');

  const menuSelectedRef = useRef(menuSelected);
  const interactiveModeRef = useRef(interactiveMode);
  const focusRef = useRef(focus);
  const serverRunningRef = useRef(serverRunning);
  useEffect(() => { menuSelectedRef.current = menuSelected; }, [menuSelected]);
  useEffect(() => { interactiveModeRef.current = interactiveMode; }, [interactiveMode]);
  useEffect(() => { focusRef.current = focus; }, [focus]);
  useEffect(() => { serverRunningRef.current = serverRunning; }, [serverRunning]);

  // ── 菜单项定义(11 项,带互斥 dim) ──
  const menuItems: MenuItem[] = useMemo(() => [
    { cmd: 'overview',   label: '站点总览',          hint: '资源树',         color: C.cyan,    type: 'interactive' },
    { cmd: 'openDir',    label: '在文件夹管理器中打开', hint: '系统资源管理器', color: C.cyan,    type: 'executable' },
    { cmd: 'server',     label: '启动预览服务',      hint: '/server',        color: C.green,   type: 'executable', disabled: serverRunning },
    { cmd: 'stop',       label: '停止预览服务',      hint: '/stop',          color: C.red,     type: 'executable', disabled: !serverRunning },
    { cmd: 'generate',   label: '构建内容',          hint: '/generate',      color: C.orange,  type: 'executable' },
    { cmd: 'new',        label: '新建内容',          hint: '随笔/影像/相册',  color: C.green,   type: 'interactive' },
    { cmd: 'theme',      label: '主题切换',          hint: '/theme',         color: C.purple,  type: 'interactive' },
    { cmd: 'newTheme',   label: '新建主题',          hint: '开发中',         color: C.purple,  type: 'interactive' },
    { cmd: 'bundle',     label: '构建 + 打包',       hint: '/bundle',        color: C.yellow,  type: 'executable' },
    { cmd: 'deploy',     label: '部署',              hint: '/deploy',        color: C.green,   type: 'executable' },
    { cmd: 'syncTheme',  label: '同步系统主题',      hint: '开发中',         color: C.pink,    type: 'executable' },
  ], [serverRunning]);

  // ── Menu Enter 触发 ──
  const handleMenuConfirm = useCallback((i: number) => {
    const item = menuItems[i];
    if (!item || item.disabled) return;
    const cmd = item.cmd;

    if (item.type === 'executable') {
      // 直接执行(executeCmd 喺 app.tsx 入面,这里只触发)
      onCommand(cmd);
      // executable 执行后焦点保持 menu(用户可以再触发其他指令)
      return;
    }

    // interactive:进入 form
    if (cmd === 'overview') {
      setInteractiveMode('overview');
      setFocus('form');
    } else if (cmd === 'new') {
      setInteractiveMode('newContent');
      setFocus('form');
    } else if (cmd === 'theme') {
      setInteractiveMode('theme');
      setFocus('form');
    } else if (cmd === 'newTheme') {
      setInteractiveMode('newTheme');
      setFocus('form');
    }
  }, [menuItems, onCommand]);

  // ── 取消 form 退到 menu ──
  const handleFormCancel = useCallback(() => {
    setInteractiveMode(null);
    setFocus('menu');
  }, []);

  // ── 全局 useInput(Ctrl+C / Esc) ──
  const handleGlobalInput = useCallback((_inp: string, key: { ctrl?: boolean; escape?: boolean }) => {
    if (key.ctrl && _inp === 'c') {
      onExit();
      return;
    }
    if (key.escape && focusRef.current === 'form') {
      handleFormCancel();
      return;
    }
  }, [onExit, handleFormCancel]);

  useInput(handleGlobalInput);

  // ── 高度分配(左栏 menu) ──
  const bodyHeight = Math.max(10, (rows > 0 ? rows : 40) - 8);
  const menuVisibleRows = Math.max(5, bodyHeight - 2);

  // ── 左栏 = 全屏 menu(11 项) ──
  const leftPanel = (
    <Box flexDirection="column" flexGrow={1}>
      <Text dimColor>指令 (↑↓ 切换 · Enter 触发)</Text>
      <Box flexDirection="column" flexGrow={1} marginTop={0}>
        <InstructionMenu
          items={menuItems}
          selected={menuSelected}
          isActive={focus === 'menu'}
          visibleRows={menuVisibleRows - 1}
          onSelect={setMenuSelected}
          onConfirm={handleMenuConfirm}
        />
      </Box>
    </Box>
  );

  // ── 右栏 = 根据 menu + mode ──
  const currentItem = menuItems[menuSelected];
  const isForm = interactiveMode !== null;

  const rightPanel = (() => {
    // ── Interactive form mode ──
    if (interactiveMode === 'overview') {
      return (
        <Box flexDirection="column" flexGrow={1}>
          <Text bold color={C.cyan}>· 站点总览 (资源树)</Text>
          <Box flexDirection="column" flexGrow={1} marginTop={1}>
            <FileTree rootDir={currentProject} inputPaused={true} />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Esc 退到指令菜单</Text>
          </Box>
        </Box>
      );
    }
    if (interactiveMode === 'newContent') {
      return (
        <NewContentPanel
          isActive={focus === 'form'}
          projectRoot={currentProject}
          onComplete={() => { setInteractiveMode(null); setFocus('menu'); }}
          onCancel={handleFormCancel}
        />
      );
    }
    if (interactiveMode === 'theme' || interactiveMode === 'newTheme') {
      // 'newTheme' 占位 — 显示"开发中"
      if (interactiveMode === 'newTheme') {
        return (
          <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
            <Text color={C.muted}>新建主题功能开发中</Text>
            <Text dimColor>暂用主题切换指令(应用已有主题)</Text>
            <Box marginTop={1}>
              <Text dimColor>Esc 退到指令菜单</Text>
            </Box>
          </Box>
        );
      }
      return (
        <ThemePanel
          isActive={focus === 'form'}
          projectRoot={currentProject}
          onApply={() => { setInteractiveMode(null); setFocus('menu'); }}
          onCancel={handleFormCancel}
        />
      );
    }

    // ── Default mode:显示该指令的 preview/logs ──
    const isExecutable = currentItem?.type === 'executable';
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Box marginBottom={1}>
          <Text bold color={C.cyan}>· {currentItem?.label || '指令'}</Text>
          {currentItem && (
            <Text dimColor>  {currentItem.type === 'executable' ? '(可执行)' : '(需交互)'}</Text>
          )}
        </Box>
        {isExecutable ? (
          <>
            <LogPanel logs={logs} command={currentItem?.cmd} />
            <Box marginTop={1}>
              <Text dimColor>按 Enter 执行 · 提示:该指令嘅历史日志显示在右栏</Text>
            </Box>
          </>
        ) : (
          <Box flexDirection="column">
            <Text color={C.muted} dimColor>按 Enter 触发该指令的交互页面</Text>
          </Box>
        )}
      </Box>
    );
  })();

  return (
    <Layout
      siteName={siteName}
      sitePath={currentProject}
      serverRunning={serverRunning}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
    />
  );
}
