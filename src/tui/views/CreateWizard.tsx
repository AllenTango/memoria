/**
 * CreateWizard — 4-step site creation wizard (modern FlexBox)
 */
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { C } from '../contexts/TUIContext';
import { Spinner } from '../components/Spinner';
import { BlinkingCursor } from '../components/BlinkingCursor';
import { initSiteNonInteractive } from '../../../lib/init';
import { addRecentProject } from '../../../lib/recent';
import { applyTheme } from '../../../lib/apply-theme';
import { isEmptyDir } from '../../../lib/content';

const THEMES = [
  { label: 'Dracula', name: 'dracula', color: C.pink, emoji: '🌙' },
  { label: 'Peach',    name: 'peach',   color: C.orange, emoji: '☀️' },
];

interface Props {
  onComplete: (path?: string) => void;
}

export function CreateWizard({ onComplete }: Props): React.ReactElement {
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [name, setName] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [themeIdx, setThemeIdx] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ name: string; path: string } | null>(null);

  useInput((input, key) => {
    if (step === 0) {
      if (key.return) {
        if (!name.trim()) { setError('名称不能为空'); return; }
        const pathModule = require('path') as typeof import('path');
        const computed = targetPath || pathModule.resolve(process.cwd(), name.trim());
        setTargetPath(computed);
        setStep(1);
      } else if (key.backspace) {
        setName((n: string) => n.slice(0, -1));
        setError('');
      } else if (key.escape) {
        onComplete();
      } else if (input) {
        setName((n: string) => n + input);
        setError('');
      }
    } else if (step === 1) {
      if (key.return) {
        const pathModule = require('path') as typeof import('path');
        const resolved = targetPath.trim() || pathModule.resolve(process.cwd(), name);
        if (!isEmptyDir(resolved)) {
          setError('目录非空，请使用空目录或更换路径');
          return;
        }
        setTargetPath(resolved);
        setStep(2);
      } else if (key.backspace) {
        setTargetPath((p: string) => p.slice(0, -1));
        setError('');
      } else if (key.escape) {
        setStep(0);
      } else if (input) {
        setTargetPath((p: string) => p + input);
        setError('');
      }
    } else if (step === 2) {
      if (key.upArrow || key.downArrow) {
        setThemeIdx(1 - themeIdx);
      } else if (key.return) {
        setStep(3);
        doCreate();
      } else if (key.escape) {
        setStep(1);
      }
    } else if (step === 4) {
      if (key.return || key.escape) {
        if (result) onComplete(result.path);
        else onComplete();
      }
    }
  });

  async function doCreate(): Promise<void> {
    const theme = THEMES[themeIdx].name;
    try {
      await initSiteNonInteractive(targetPath, name, 'Your Name', '', '', true, true, theme);
      applyTheme(targetPath, theme);
      addRecentProject(targetPath);
      setResult({ name, path: targetPath });
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep(0);
    }
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box borderStyle="round" borderColor={C.green} paddingX={1} flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold color={C.green}>🆕 新建站点</Text>
          {step > 0 && (
            <Text dimColor>
              {targetPath || (() => {
                const pathModule = require('path') as typeof import('path');
                return pathModule.resolve(process.cwd(), name);
              })()}
            </Text>
          )}
        </Box>

        <Box flexDirection="column" marginTop={1} gap={1}>
          {step === 0 && (
            <>
              <Text color={C.muted}>站点名称</Text>
              <Box flexDirection="row" gap={1}>
                <Text color={name ? C.cyan : C.muted} bold wrap="truncate">
                  {name || '<输入中>'}
                </Text>
                {name && <BlinkingCursor />}
              </Box>
              {error && <Text color={C.red}>✗ {error}</Text>}
            </>
          )}

          {step === 1 && (
            <>
              <Text color={C.muted}>保存路径（直接回车使用默认）</Text>
              <Box flexDirection="row" gap={1}>
                <Text color={C.cyan} wrap="truncate">{targetPath || '<输入中>'}</Text>
                <BlinkingCursor />
              </Box>
              <Text dimColor>默认: {(() => {
                const pathModule = require('path') as typeof import('path');
                return pathModule.resolve(process.cwd(), name);
              })()}</Text>
              {error && <Text color={C.red}>✗ {error}</Text>}
            </>
          )}

          {step === 2 && (
            <>
              <Text color={C.muted}>选择主题</Text>
              {THEMES.map((t, i) => (
                <Box key={t.name} flexDirection="row" gap={1}>
                  <Text color={themeIdx === i ? C.green : C.muted} wrap="truncate">
                    {themeIdx === i ? '▶' : ' '}
                  </Text>
                  <Text color={themeIdx === i ? t.color : C.muted} bold={themeIdx === i} wrap="truncate">
                    {t.emoji} {t.label}
                  </Text>
                </Box>
              ))}
            </>
          )}

          {step === 3 && (
            <Box flexDirection="row" gap={1}>
              <Spinner label="正在创建站点..." />
              <Text dimColor>这可能需要几分钟...</Text>
            </Box>
          )}

          {step === 4 && result && (
            <>
              <Text color={C.green} bold>✓ 站点创建成功</Text>
              <Text bold>{result.name}</Text>
              <Text dimColor>{result.path}</Text>
              <Text color={THEMES[themeIdx].color}>{THEMES[themeIdx].emoji} 主题: {THEMES[themeIdx].label}</Text>
            </>
          )}
        </Box>
      </Box>

      <Text dimColor marginTop={1}>
        {step === 4 ? '按 Enter 进入项目 / Esc 返回主菜单' :
         step === 2 ? '↑↓ 选择主题 · Enter 确认 · Esc 返回' :
         'Enter 确认 · Esc 返回'}
      </Text>
    </Box>
  );
}