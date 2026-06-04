/**
 * NewContentWizard — blog/vlog/photo content creation wizard (Layout版)
 */
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import * as path from 'path';
import { Layout } from '../components/Layout';
import { Spinner } from '../components';
import { BlinkingCursor } from '../components';
import { C } from '../contexts/TUIContext';
import { createContent } from '../../lib/content';

const CONTENT_TYPES = [
  { key: 'blog', label: '文章', color: C.green, emoji: '📝' },
  { key: 'vlog', label: '视频', color: C.cyan, emoji: '🎬' },
  { key: 'photo', label: '相册', color: C.pink, emoji: '📷' },
] as const;

interface Props {
  projectRoot: string;
  onComplete: () => void;
  serverRunning: boolean;
}

export function NewContentWizard({ projectRoot, onComplete, serverRunning }: Props): React.ReactElement {
  const [type, setType] = useState<'blog' | 'vlog' | 'photo'>('blog');
  const [title, setTitle] = useState('');
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [error, setError] = useState('');

  useInput((input, key) => {
    if (step === 0) {
      if (key.upArrow || key.downArrow) {
        const idx = CONTENT_TYPES.findIndex((t: typeof CONTENT_TYPES[number]) => t.key === type);
        setType(CONTENT_TYPES[(idx + 1) % 3].key);
      } else if (key.return) {
        setStep(1);
      } else if (key.escape) {
        onComplete();
      }
    } else if (step === 1) {
      if (key.return) {
        if (!title.trim()) { setError('标题不能为空'); return; }
        setStep(2);
        doCreate();
      } else if (key.backspace) {
        setTitle((t: string) => t.slice(0, -1));
        setError('');
      } else if (key.escape) {
        setStep(0);
        setTitle('');
      } else if (input) {
        setTitle((t: string) => t + input);
        setError('');
      }
    } else if (step === 3) {
      if (key.return || key.escape) onComplete();
    }
  });

  function doCreate(): void {
    try {
      const result = createContent(projectRoot, type, title.trim());
      if (!result.success) throw new Error(result.error);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep(0);
    }
  }

  const typeObj = CONTENT_TYPES.find((t: typeof CONTENT_TYPES[number]) => t.key === type)!;

  return (
    <Layout
      siteName="新建内容"
      sitePath={projectRoot}
      serverRunning={serverRunning}
    >
      <Box flexDirection="column" justifyContent="center" alignItems="center"  gap={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold color={C.cyan}>📝 新建内容</Text>
          <Text dimColor>{path.basename(projectRoot)}</Text>
        </Box>

        {step === 0 && (
          <>
            <Text color={C.muted}>选择内容类型</Text>
            {CONTENT_TYPES.map((t: typeof CONTENT_TYPES[number]) => (
              <Box key={t.key} flexDirection="row" gap={1}>
                <Text color={type === t.key ? C.green : C.muted} wrap="truncate">
                  {type === t.key ? '▶' : ' '}
                </Text>
                <Text color={type === t.key ? t.color : C.muted} bold={type === t.key} wrap="truncate">
                  {t.emoji} {t.label}
                </Text>
              </Box>
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <Box flexDirection="row" gap={1}>
              <Text color={C.muted}>类型: </Text>
              <Text color={typeObj.color}>{typeObj.emoji} {typeObj.label}</Text>
            </Box>
            <Text color={C.muted}>标题</Text>
            <Box flexDirection="row" gap={1}>
              <Text color={title ? C.cyan : C.muted} bold wrap="truncate">
                {title || '<输入中>'}
              </Text>
              {title && <BlinkingCursor />}
            </Box>
            {error && <Text color={C.red}>✗ {error}</Text>}
          </>
        )}

        {step === 2 && (
          <Box flexDirection="row" gap={1}>
            <Spinner label="正在创建内容..." />
          </Box>
        )}

        {step === 3 && (
          <Text color={C.green} bold>✓ 内容创建完成！</Text>
        )}
      </Box>
    </Layout>
  );
}