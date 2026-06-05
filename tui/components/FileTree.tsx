/**
 * FileTree — 文件树组件，模拟 Linux tree 命令的只读展示
 * 支持上下键/鼠标滚轮滚动
 *
 * 性能说明:
 * - 用 path 做 key 而非数组 index,避免父级 re-mount
 * - scanDir 仍在 useEffect 中执行(脱离 render 同步路径)
 * - flattenTree 用 useMemo 缓存
 * - 组件外用 React.memo 包裹,父级 logs 变化时不会重渲染
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import * as path from 'path';
import * as fs from 'fs';
import { C } from '../contexts/TUIContext';

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: FileTreeNode[];
}

interface FlatNode {
  node: FileTreeNode;
  depth: number;
  isLast: boolean[];
}

// ── 数据加载 ──────────────────────────────────────────────

function scanDir(dir: string, maxDepth: number = 2): FileTreeNode[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const result: FileTreeNode[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === 'node_modules' || entry.name === 'package-lock.json' || entry.name === 'dist') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const children = maxDepth > 0 ? scanDir(fullPath, maxDepth - 1) : [];
      result.push({ name: entry.name, path: fullPath, type: 'directory', children });
    } else {
      result.push({ name: entry.name, path: fullPath, type: 'file' });
    }
  }
  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function flattenTree(nodes: FileTreeNode[], depth = 0, isLast: boolean[] = []): FlatNode[] {
  const result: FlatNode[] = [];
  nodes.forEach((node, i) => {
    const nodeIsLast = i === nodes.length - 1;
    result.push({ node, depth, isLast: [...isLast, nodeIsLast] });
    if (node.type === 'directory' && node.children) {
      result.push(...flattenTree(node.children, depth + 1, [...isLast, nodeIsLast]));
    }
  });
  return result;
}

function getFileIcon(filename: string): string {
  if (filename.endsWith('.md')) return '📄';
  if (filename.endsWith('.css')) return '🎨';
  if (filename.endsWith('.html')) return '🌐';
  if (filename.endsWith('.json')) return '📋';
  return '📄';
}

// ── 主组件 ──────────────────────────────────────────────

const TREE_ROWS = 20;

interface FileTreeProps {
  rootDir: string;
  /**
   * 当命令面板处于激活态(showHints=true)时,FileTree 不应消费 j/k
   * 否则用户按 j 滚动命令候选时,会同时滚动文件树 — 也会把 'j' 漏到命令 input 里
   */
  inputPaused?: boolean;
}

function FileTreeImpl({ rootDir, inputPaused = false }: FileTreeProps): React.ReactElement {
  const [treeData, setTreeData] = useState<FileTreeNode[]>([]);
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    if (!rootDir) {
      setTreeData([]);
      setScrollOffset(0);
      return;
    }
    // 切项目时重新扫描;放到 effect 里避免阻塞 render
    setTreeData(scanDir(rootDir, 2));
    setScrollOffset(0);
  }, [rootDir]);

  const flatNodes = useMemo(() => flattenTree(treeData), [treeData]);
  const visibleCount = TREE_ROWS - 4; // 留2行指示器

  useInput((input, key) => {
    // 命令面板开启时让出键盘焦点,避免和 j/k 滚动冲突
    if (inputPaused) return;

    // 支持 j/k (vim 风格) + ↑/↓ (方向键) 上下浏览(其他键一律不响应)
    if (input === 'j' || key.downArrow) {
      setScrollOffset(prev => Math.min(Math.max(0, flatNodes.length - visibleCount), prev + 1));
    } else if (input === 'k' || key.upArrow) {
      setScrollOffset(prev => Math.max(0, prev - 1));
    }
  });

  if (!rootDir) return <Text color={C.muted}>未选择站点</Text>;
  if (treeData.length === 0) return <Text color={C.muted}>暂无资源</Text>;

  const visibleNodes = flatNodes.slice(scrollOffset, scrollOffset + visibleCount);
  const hasMoreAbove = scrollOffset > 0;
  const hasMoreBelow = scrollOffset + visibleCount < flatNodes.length;

  return (
    <Box flexDirection="column" flexShrink={0} height={TREE_ROWS}>
      {hasMoreAbove && (
        <Text dimColor>▲ k上方还有 {scrollOffset} 项</Text>
      )}
      <Box flexDirection="column" flexGrow={1}>
        {visibleNodes.map((flat) => {
          const { node, depth, isLast } = flat;
          const isDir = node.type === 'directory';
          const indent = '  '.repeat(depth);
          const prefix = depth > 0 ? (isLast[isLast.length - 1] ? '└── ' : '├── ') : '';
          const icon = isDir ? '📂' : getFileIcon(node.name);
          const childCount = isDir && node.children && node.children.length > 0 ? ` (${node.children.length})` : '';
          const name = `${indent}${prefix}${icon} ${node.name}${childCount}`;
          const maxW = 38;
          const truncated = name.length > maxW ? name.substring(0, maxW - 3) + '...' : name;
          return <Text key={node.path} color={C.muted} wrap="truncate">{truncated}</Text>;
        })}
      </Box>
      {hasMoreBelow && (
        <Text dimColor>▼ j 下方还有 {flatNodes.length - scrollOffset - visibleCount} 项</Text>
      )}
    </Box>
  );
}

// 父级 logs 变化时不要触发 FileTree 重渲染(只在自己内部状态变化时才渲染)
export const FileTree = React.memo(FileTreeImpl, (prev, next) => {
  return prev.rootDir === next.rootDir && prev.inputPaused === next.inputPaused;
});
