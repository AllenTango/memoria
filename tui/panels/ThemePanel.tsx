/**
 * ThemePanel — 主题页面(右栏内嵌)
 *
 * 内含 3 个 sub-mode:
 *   - 'apply'  :应用已有主题(从 BUILT_IN_THEMES 选)
 *   - 'create' :新建主题(输入新主题名,作为 .themerc 内容)
 *   - 'sync'   :同步系统主题(占位,开发中)
 *
 * 焦点模型(两层):
 *   - 'tabs'   :sub-mode 标签焦点,↑/↓ 切 3 个 sub-mode,Enter 进入内容
 *   - 'content':sub-mode 内容焦点,各 sub-mode 自己嘅输入逻辑
 *   - Esc 退到上一层(content → tabs,tabs → onCancel)
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { C } from '../contexts/TUIContext';
import { BlinkingCursor } from '../components';
import { applyTheme } from '../../lib/apply-theme';

const BUILT_IN_THEMES = [
  { name: 'dracula', emoji: '🌙', desc: 'Dracula 暗黑系' },
  { name: 'peach',   emoji: '☀️', desc: 'Peach 暖橙系' },
  { name: 'nord',    emoji: '❄️',  desc: 'Nord 冷淡蓝' },
  { name: 'mint',    emoji: '🌿', desc: 'Mint 清新绿' },
];

type SubMode = 'apply' | 'create' | 'sync';
type Focus = 'tabs' | 'content';

const SUB_MODE_LABELS: Record<SubMode, string> = {
  apply: '应用主题',
  create: '新建主题',
  sync: '同步系统',
};

const SUB_MODE_ORDER: SubMode[] = ['apply', 'create', 'sync'];

interface Props {
  isActive: boolean;
  projectRoot: string;
  /** 应用/创建/同步成功时调用(可用于触发 rebuild / 刷新) */
  onApply: (themeName: string) => void;
  /** 取消时调用 */
  onCancel: () => void;
}

export function ThemePanel({ isActive, projectRoot, onApply, onCancel }: Props): React.ReactElement {
  const [subMode, setSubMode] = useState<SubMode>('apply');
  const [focus, setFocus] = useState<Focus>('tabs');
  const [selected, setSelected] = useState(0);
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState('');

  const subModeRef = useRef(subMode);
  const focusRef = useRef(focus);
  const selectedRef = useRef(selected);
  const nameInputRef = useRef(nameInput);
  useEffect(() => { subModeRef.current = subMode; }, [subMode]);
  useEffect(() => { focusRef.current = focus; }, [focus]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { nameInputRef.current = nameInput; }, [nameInput]);

  useInput((input, key) => {
    if (!isActive) return;
    const cur = focusRef.current;
    const mode = subModeRef.current;

    if (cur === 'tabs') {
      if (key.upArrow) {
        const idx = SUB_MODE_ORDER.indexOf(mode);
        setSubMode(SUB_MODE_ORDER[(idx - 1 + SUB_MODE_ORDER.length) % SUB_MODE_ORDER.length]);
      } else if (key.downArrow) {
        const idx = SUB_MODE_ORDER.indexOf(mode);
        setSubMode(SUB_MODE_ORDER[(idx + 1) % SUB_MODE_ORDER.length]);
      } else if (key.return) {
        setFocus('content');
        setError('');
      } else if (key.escape) {
        onCancel();
      }
      return;
    }

    // cur === 'content'
    if (key.escape) {
      setFocus('tabs');
      setError('');
      return;
    }

    if (mode === 'apply') {
      if (key.upArrow) {
        setSelected(s => (s - 1 + BUILT_IN_THEMES.length) % BUILT_IN_THEMES.length);
      } else if (key.downArrow) {
        setSelected(s => (s + 1) % BUILT_IN_THEMES.length);
      } else if (key.return) {
        const theme = BUILT_IN_THEMES[selectedRef.current];
        const r = applyTheme(projectRoot, theme.name);
        if (r.success) onApply(theme.name);
        else setError(r.error || '应用失败');
      }
    } else if (mode === 'create') {
      if (key.return) {
        const n = nameInputRef.current.trim();
        if (!n) { setError('主题名不能为空'); return; }
        const r = applyTheme(projectRoot, n);
        if (r.success) onApply(n);
        else setError(r.error || '创建失败');
      } else if (key.backspace) {
        setNameInput(s => s.slice(0, -1));
        setError('');
      } else if (input && !key.ctrl && !key.meta) {
        setNameInput(s => s + input);
        setError('');
      }
    } else if (mode === 'sync') {
      // 占位 — Enter 触发 sync
      if (key.return) {
        // 同步系统主题(开发中,触发 onApply 占位)
        onApply('system-sync');
      }
    }
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* ── Tabs ── */}
      <Box flexDirection="row" gap={1} marginBottom={1}>
        {SUB_MODE_ORDER.map(m => {
          const isSelected = subMode === m;
          return (
            <Box key={m} flexDirection="row" gap={1}>
              <Text
                color={focus === 'tabs' && isSelected ? C.cyan : C.muted}
                bold={focus === 'tabs' && isSelected}
              >
                {focus === 'tabs' && isSelected ? '▶' : ' '}
              </Text>
              <Text
                color={isSelected ? C.cyan : C.muted}
                bold={isSelected}
                underline={focus === 'tabs' && isSelected}
              >
                {SUB_MODE_LABELS[m]}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* ── Content ── */}
      {focus === 'tabs' ? (
        <Box flexDirection="column">
          <Text color={C.muted} dimColor>↑↓ 切换 sub-mode · Enter 进入 · Esc 退 menu</Text>
        </Box>
      ) : subMode === 'apply' ? (
        <Box flexDirection="column" gap={1}>
          {BUILT_IN_THEMES.map((t, i) => {
            const isSelected = i === selected;
            return (
              <Box key={t.name} flexDirection="row" gap={1}>
                <Text color={isSelected ? C.green : C.muted} bold={isSelected}>
                  {isSelected ? '▶' : ' '}
                </Text>
                <Text color={isSelected ? C.green : C.muted} bold={isSelected} wrap="truncate">
                  {t.emoji} {t.name} — {t.desc}
                </Text>
              </Box>
            );
          })}
          {error && <Text color={C.red} marginTop={1}>✗ {error}</Text>}
        </Box>
      ) : subMode === 'create' ? (
        <Box flexDirection="column" gap={1}>
          <Text color={C.muted}>输入新主题名(将作为 .themerc 内容):</Text>
          <Box flexDirection="row" gap={1}>
            <Text color={nameInput ? C.cyan : C.muted} bold wrap="truncate">
              {nameInput || '<输入中>'}
            </Text>
            {nameInput && <BlinkingCursor />}
          </Box>
          {error && <Text color={C.red}>✗ {error}</Text>}
          <Box marginTop={1}>
            <Text dimColor>Enter 创建 · Esc 退到 tabs</Text>
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column" gap={1}>
          <Text color={C.cyan} bold>· 同步系统主题</Text>
          <Text dimColor>读取系统当前主题色并应用到站点</Text>
          <Text color={C.yellow}>⚠ 功能开发中</Text>
          <Box marginTop={1}>
            <Text dimColor>Enter 占位触发 · Esc 退到 tabs</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
