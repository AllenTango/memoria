/**
 * FileTree — 文件树组件，左栏资源管理
 * 支持展开/折叠、键盘导航、Enter 唤起编辑器
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import * as path from 'path';
import * as fs from 'fs';
import { C } from '../contexts/TUIContext';

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: FileTreeNode[];
}

// ── 数据加载 ──────────────────────────────────────────────

function scanDir(dir: string): FileTreeNode[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const result: FileTreeNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push({
        name: entry.name,
        path: fullPath,
        type: 'directory',
        children: scanDir(fullPath),
      });
    } else if (entry.name.endsWith('.md')) {
      result.push({
        name: entry.name,
        path: fullPath,
        type: 'file',
      });
    }
  }

  // 排序：目录在前，然后按名称
  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// ── 文件树节点行 ──────────────────────────────────────────

interface TreeNodeRowProps {
  node: FileTreeNode;
  depth: number;
  expanded: boolean;
  selected: boolean;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}

function TreeNodeRow({ node, depth, expanded, selected, onToggle, onSelect }: TreeNodeRowProps): React.ReactElement {
  const indent = '  '.repeat(depth);
  const isDir = node.type === 'directory';
  const icon = isDir ? (expanded ? '📂' : '📁') : getFileIcon(node.name);
  const nameColor = selected ? C.green : C.fg;
  const baseColor = selected ? C.green : C.muted;

  return (
    <Box flexDirection="row">
      <Text
        color={baseColor}
        onClick={() => {
          if (isDir) onToggle(node.path);
          else onSelect(node.path);
        }}
      >
        {indent}
        {selected ? '▶ ' : '  '}
        {icon}
      </Text>
      <Text
        color={nameColor}
        bold={selected}
        wrap="truncate"
        onClick={() => {
          if (isDir) onToggle(node.path);
          else onSelect(node.path);
        }}
      >
        {node.name}
      </Text>
      {isDir && node.children && (
        <Text color={C.muted}> ({node.children.length})</Text>
      )}
    </Box>
  );
}

function getFileIcon(filename: string): string {
  if (filename.endsWith('.md')) return '📄';
  return '📄';
}

// ── 主组件 ──────────────────────────────────────────────

interface FileTreeProps {
  rootDir: string;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

export function FileTree({ rootDir, selectedPath, onSelectFile }: FileTreeProps): React.ReactElement {
  // 资源目录：blogs、vlogs、photos、public
  const resourceDirs = ['blogs', 'vlogs', 'photos', 'public'];

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [treeData, setTreeData] = useState<FileTreeNode[]>([]);
  const [selectedNodePath, setSelectedNodePath] = useState<string | null>(null);
  const [focusedDepth, setFocusedDepth] = useState(0); // 0=root level

  // 初始化加载
  useEffect(() => {
    if (!rootDir) return;

    const children: FileTreeNode[] = resourceDirs
      .map(name => {
        const fullPath = path.join(rootDir, 'content', name);
        if (!fs.existsSync(fullPath)) {
          return { name, path: fullPath, type: 'directory' as const, children: [] };
        }
        return {
          name,
          path: fullPath,
          type: 'directory' as const,
          children: scanDir(fullPath),
        };
      });

    // 添加 public 目录
    const publicPath = path.join(rootDir, 'public');
    if (fs.existsSync(publicPath)) {
      const publicFiles = fs.readdirSync(publicPath, { withFileTypes: true })
        .filter(e => !e.name.startsWith('.'))
        .map(e => ({
          name: e.name,
          path: path.join(publicPath, e.name),
          type: 'file' as const,
        }));
      children.push({ name: 'public', path: publicPath, type: 'directory', children: publicFiles });
    }

    setTreeData(children);

    // 默认展开前三个
    const initialExpanded = new Set(
      children.slice(0, 3).map(n => n.path)
    );
    setExpandedPaths(initialExpanded);
  }, [rootDir]);

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleSelect = useCallback((path: string, node: FileTreeNode) => {
    setSelectedNodePath(path);
    if (node.type === 'file') {
      onSelectFile(path);
    }
  }, [onSelectFile]);

  // 渲染树
  function renderTree(nodes: FileTreeNode[], depth: number): React.ReactNode {
    return nodes.map(node => {
      const isExpanded = expandedPaths.has(node.path);
      const isSelected = selectedNodePath === node.path;

      return (
        <React.Fragment key={node.path}>
          <TreeNodeRow
            node={node}
            depth={depth}
            expanded={isExpanded}
            selected={isSelected}
            onToggle={toggleExpand}
            onSelect={(p) => handleSelect(p, node)}
          />
          {node.type === 'directory' && isExpanded && node.children && (
            renderTree(node.children, depth + 1)
          )}
        </React.Fragment>
      );
    });
  }

  if (!rootDir) {
    return <Text color={C.muted}>未选择站点</Text>;
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Text dimColor marginBottom={1}>按 Enter 编辑文件</Text>
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {treeData.length === 0 ? (
          <Text color={C.muted}>暂无资源</Text>
        ) : (
          renderTree(treeData, 0)
        )}
      </Box>
    </Box>
  );
}