/**
 * CreateSitePanel — 右栏内嵌:新建站点表单
 *
 * 阶段:
 *  - 'input':输入站点名(回车提交,Esc 取消)
 *  - 'creating':初始化进行中(显示日志,不能输入)
 *  - 'success':成功(显示结果,Enter 进入,Esc 取消)
 *  - 'failed':失败(显示错误,Enter 取消,Esc 重试)
 *
 * 注意: 父组件传 isActive=false 时,useInput 立即 return(避免抢键)
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import * as path from 'path';
import * as fs from 'fs';
import { C } from '../contexts/TUIContext';
import { BlinkingCursor } from '../components';
import { LogView, type LogEntry } from '../components/DetailPanel';
import { initSiteNonInteractive } from '../../lib/init';
import { addRecentProject } from '../../lib/recent';
import { applyTheme } from '../../lib/apply-theme';

type Phase = 'input' | 'creating' | 'success' | 'failed';

interface Props {
  /** 父级焦点控制 — false 时 useInput 立即 return,避免抢键 */
  isActive: boolean;
  /** 成功完成时调用(带站点路径) */
  onComplete: (sitePath: string, siteName: string) => void;
  /** 取消时调用 */
  onCancel: () => void;
}

export function CreateSitePanel({ isActive, onComplete, onCancel }: Props): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('input');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<{ name: string; path: string } | null>(null);
  const nameRef = useRef(name);
  const phaseRef = useRef(phase);
  useEffect(() => { nameRef.current = name; }, [name]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── 键盘 ──
  useInput((input, key) => {
    if (!isActive) return;
    const cur = phaseRef.current;

    if (cur === 'input') {
      if (key.return) {
        const n = nameRef.current.trim();
        if (!n) { setError('名称不能为空'); return; }
        doCreate(n);
      } else if (key.backspace) {
        setName(s => s.slice(0, -1));
        setError('');
      } else if (key.escape) {
        onCancel();
      } else if (input && !key.ctrl && !key.meta) {
        setName(s => s + input);
        setError('');
      }
    } else if (cur === 'success') {
      if (key.return) {
        if (result) onComplete(result.path, result.name);
      } else if (key.escape) {
        onCancel();
      }
    } else if (cur === 'failed') {
      if (key.return) {
        onCancel();
      } else if (key.escape) {
        // 重试
        setPhase('input');
        setLogs([]);
        setError('');
        setResult(null);
      }
    }
    // 'creating' 阶段不消费键盘
  });

  const doCreate = useCallback(async (siteName: string) => {
    const targetPath = path.resolve(process.cwd(), siteName);

    if (fs.existsSync(targetPath)) {
      setPhase('failed');
      setError(`目录 ${siteName} 已存在,请使用其他名称`);
      setLogs(prev => [...prev, { timestamp: Date.now(), level: 'error', message: `目录 ${siteName} 已存在` }]);
      return;
    }

    setPhase('creating');
    setError('');

    const addLog = (level: LogEntry['level'], message: string) => {
      setLogs(prev => [...prev, { timestamp: Date.now(), level, message }]);
    };

    try {
      const res = await initSiteNonInteractive(
        targetPath, siteName, 'Your Name', '', '', true, true, 'dracula',
        (level, message) => addLog(level, message)
      );

      if (!res.success) {
        addLog('error', res.error || '创建失败');
        setError(res.error || '创建失败');
        setPhase('failed');
        return;
      }

      applyTheme(targetPath, 'dracula');
      addRecentProject(targetPath);
      setResult({ name: siteName, path: targetPath });
      setPhase('success');
    } catch (err) {
      addLog('error', err instanceof Error ? err.message : String(err));
      setError(err instanceof Error ? err.message : String(err));
      setPhase('failed');
    }
  }, []);

  // ── input 阶段 ──
  if (phase === 'input') {
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={C.green}>新建站点</Text>
          <Text dimColor>在下方输入站点目录名(将在当前目录下创建)</Text>
        </Box>
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="row" gap={1}>
            <Text color={C.muted}>名称:</Text>
            <Text color={name ? C.cyan : C.muted} bold wrap="truncate">
              {name || '<输入中>'}
            </Text>
            {name && <BlinkingCursor />}
          </Box>
          <Text dimColor>路径预览: {name ? path.resolve(process.cwd(), name) : '...'}</Text>
          {error && <Text color={C.red}>✗ {error}</Text>}
        </Box>
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Enter 提交 · Esc 取消</Text>
        </Box>
      </Box>
    );
  }

  // ── creating / success / failed:显示日志 ──
  const header = phase === 'success'
    ? <Text bold color={C.green}>✓ 站点创建完成</Text>
    : phase === 'failed'
      ? <Text bold color={C.red}>✗ 创建失败</Text>
      : <Text bold color={C.cyan}>⏳ 正在创建...</Text>;

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1}>{header}</Box>
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {logs.length > 0 ? (
          <LogView logs={logs} />
        ) : (
          <Text dimColor>准备初始化...</Text>
        )}
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {phase === 'success' && result && (
          <Text bold color={C.cyan}>→ 按 Enter 进入 {result.name}</Text>
        )}
        {phase === 'failed' && (
          <Text dimColor>Esc 重试 · Enter 取消</Text>
        )}
        {phase === 'creating' && (
          <Text dimColor>请稍候...</Text>
        )}
      </Box>
    </Box>
  );
}
