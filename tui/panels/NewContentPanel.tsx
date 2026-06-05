/**
 * NewContentPanel — 右栏内嵌:新建内容(文章/视频/相册)
 *
 * 阶段:
 *  - 0:选择类型(↑/↓ 切换,Enter 确认,Esc 取消)
 *  - 1:输入标题(回车提交,Esc 返回步骤 0)
 *  - 2:创建中(只读)
 *  - 3:成功(Enter/Esc 返回,触发 onComplete)
 */
import React, { useState, useRef, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { C } from '../contexts/TUIContext';
import { BlinkingCursor, Spinner } from '../components';
import { createContent } from '../../lib/content';

const CONTENT_TYPES = [
  { key: 'blog',  label: '文章', color: C.green, emoji: '📝' },
  { key: 'vlog',  label: '视频', color: C.cyan,  emoji: '🎬' },
  { key: 'photo', label: '相册', color: C.pink,  emoji: '📷' },
] as const;

type ContentType = (typeof CONTENT_TYPES)[number]['key'];

interface Props {
  isActive: boolean;
  projectRoot: string;
  onComplete: (contentType: ContentType, filePath: string) => void;
  onCancel: () => void;
}

export function NewContentPanel({ isActive, projectRoot, onComplete, onCancel }: Props): React.ReactElement {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [type, setType] = useState<ContentType>('blog');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [resultPath, setResultPath] = useState<string | null>(null);

  const typeRef = useRef(type);
  const titleRef = useRef(title);
  const stepRef = useRef(step);
  useEffect(() => { typeRef.current = type; }, [type]);
  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { stepRef.current = step; }, [step]);

  useInput((input, key) => {
    if (!isActive) return;
    const cur = stepRef.current;

    if (cur === 0) {
      if (key.upArrow || key.downArrow) {
        const idx = CONTENT_TYPES.findIndex(t => t.key === typeRef.current);
        setType(CONTENT_TYPES[(idx + 1) % CONTENT_TYPES.length].key);
      } else if (key.return) {
        setStep(1);
      } else if (key.escape) {
        onCancel();
      }
    } else if (cur === 1) {
      if (key.return) {
        const t = titleRef.current.trim();
        if (!t) { setError('标题不能为空'); return; }
        doCreate(typeRef.current, t);
      } else if (key.backspace) {
        setTitle(s => s.slice(0, -1));
        setError('');
      } else if (key.escape) {
        setStep(0);
        setTitle('');
        setError('');
      } else if (input && !key.ctrl && !key.meta) {
        setTitle(s => s + input);
        setError('');
      }
    } else if (cur === 3) {
      if (key.return || key.escape) {
        if (resultPath) onComplete(typeRef.current, resultPath);
        else onCancel();
      }
    }
    // step 2 (creating) 不消费键盘
  });

  function doCreate(t: ContentType, t2: string): void {
    setStep(2);
    try {
      const r = createContent(projectRoot, t, t2);
      if (!r.success) throw new Error(r.error);
      setResultPath(r.path || null);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep(0);
    }
  }

  // ── step 0:选择类型 ──
  if (step === 0) {
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Box marginBottom={1}>
          <Text bold color={C.cyan}>新建内容</Text>
          <Text dimColor> · 选择类型</Text>
        </Box>
        <Box flexDirection="column" gap={1}>
          {CONTENT_TYPES.map(t => {
            const isSelected = t.key === type;
            return (
              <Box key={t.key} flexDirection="row" gap={1}>
                <Text color={isSelected ? t.color : C.muted} bold={isSelected}>
                  {isSelected ? '▶' : ' '}
                </Text>
                <Text color={isSelected ? t.color : C.muted} bold={isSelected} wrap="truncate">
                  {t.emoji} {t.label}
                </Text>
              </Box>
            );
          })}
        </Box>
        {error && <Text color={C.red}>✗ {error}</Text>}
        <Box marginTop={1}>
          <Text dimColor>↑/↓ 切换 · Enter 确认 · Esc 取消</Text>
        </Box>
      </Box>
    );
  }

  // ── step 1:输入标题 ──
  if (step === 1) {
    const t = CONTENT_TYPES.find(x => x.key === type)!;
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Box marginBottom={1}>
          <Text bold color={C.cyan}>新建内容</Text>
          <Text dimColor> · </Text>
          <Text color={t.color} bold>{t.emoji} {t.label}</Text>
        </Box>
        <Box flexDirection="column" gap={1}>
          <Text color={C.muted}>标题</Text>
          <Box flexDirection="row" gap={1}>
            <Text color={title ? C.cyan : C.muted} bold wrap="truncate">
              {title || '<输入中>'}
            </Text>
            {title && <BlinkingCursor />}
          </Box>
          {error && <Text color={C.red}>✗ {error}</Text>}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Enter 创建 · Esc 返回</Text>
        </Box>
      </Box>
    );
  }

  // ── step 2:创建中 ──
  if (step === 2) {
    return (
      <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
        <Spinner label="正在创建内容..." />
      </Box>
    );
  }

  // ── step 3:成功 ──
  const t = CONTENT_TYPES.find(x => x.key === type)!;
  return (
    <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
      <Text color={C.green} bold>✓ 内容创建完成</Text>
      <Text dimColor>{t.emoji} {t.label}</Text>
      {resultPath && <Text dimColor wrap="truncate">{resultPath}</Text>}
      <Box marginTop={1}>
        <Text dimColor>Enter 确认 · Esc 关闭</Text>
      </Box>
    </Box>
  );
}
