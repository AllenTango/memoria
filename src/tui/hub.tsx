/**
 * Memoria TUI - ink + React
 * Dracula theme + ASCII box UI with enhanced UX
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { render, Box, Text, useInput, BorderProps } from 'ink';
import { getRecentProjects, addRecentProject, isMemoriaProject, getProjectName } from './recent';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { initSite, initSiteNonInteractive } from '../../lib/init.js';

// ── Types ─────────────────────────────────────────────────────────────────

/** Screen types */
type Screen = 'main' | 'open' | 'create' | 'newContent' | 'browse' | 'confirm' | 'theme';

/** Recent project entry */
interface RecentProject {
  root: string;
  name: string;
  lastOpened: number;
}

/** Menu item for SelectableList */
interface MenuItem {
  label: string;
  sub?: string;
  color: string;
  icon?: string;
  shortcut?: string;
}

/** Command for command palette */
interface CommandItem {
  cmd: string;
  desc: string;
  color: string;
  category: 'project' | 'site' | 'content' | 'meta';
}

/** Theme colors */
interface ThemeColors {
  bg: string;
  surface: string;
  fg: string;
  muted: string;
  cyan: string;
  green: string;
  orange: string;
  pink: string;
  purple: string;
  red: string;
  yellow: string;
}

/** Create wizard state */
interface CreateState {
  step: 0 | 1 | 2 | 3 | 4;
  name: string;
  targetPath: string;
  themeIdx: number;
  error: string;
  result: { name: string; path: string } | null;
}

/** New content wizard state */
interface NewContentState {
  type: 'blog' | 'vlog' | 'photo';
  title: string;
  step: 0 | 1 | 2 | 3;
  error: string;
}

/** Spinner props */
interface SpinnerProps {
  label: string;
}

/** Header props */
interface HeaderProps {
  title: string;
  subtitle?: string;
}

/** StatusBar props */
interface StatusBarProps {
  shortcuts: [string, string][];
}

/** SelectableList props */
interface SelectableListProps {
  items: MenuItem[];
  selected: number;
  onSelect: (i: number) => void;
  onConfirm?: (i: number) => void;
  highlightOnFocus?: boolean;
}

/** ConfirmBox props */
interface ConfirmBoxProps {
  question: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Footer props */
interface FooterProps {
  text: string;
}

/** CreateWizard props */
interface CreateWizardProps {
  onComplete: (p?: string) => void;
}

/** NewContentWizard props */
interface NewContentWizardProps {
  projectRoot: string;
  onComplete: () => void;
}

/** PathInput props */
interface PathInputProps {
  onSubmit: (p: string) => void;
  onCancel: () => void;
}

/** RecentList props */
interface RecentListProps {
  recents: RecentProject[];
  onSelect: (root: string) => void;
  onBack: () => void;
  onBrowse: () => void;
}

/** CommandPalette props */
interface CommandPaletteProps {
  onCommand: (cmd: string) => void;
  onClose: () => void;
}

// ── Dracula Theme Colors ─────────────────────────────────────────────────

const C: ThemeColors = {
  bg: '#282a36',
  surface: '#44475a',
  fg: '#f8f8f2',
  muted: '#6272a4',
  cyan: '#8be9fd',
  green: '#50fa7b',
  orange: '#ffb86c',
  pink: '#ff79c6',
  purple: '#bd93f9',
  red: '#ff5559',
  yellow: '#f1fa8c',
};

// ── Layout Constants ───────────────────────────────────────────────────────

const W = 52;

// ── Divider Helper ─────────────────────────────────────────────────────────

function divider(char = '─', color = C.muted): React.ReactNode {
  return <Text color={color}>{char.repeat(W)}</Text>;
}

// ── Spinner Component ──────────────────────────────────────────────────────

function Spinner({ label }: SpinnerProps): React.ReactElement {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const [frame, setFrame] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame(f => (f + 1) % frames.length);
    }, 80);
    return () => clearInterval(id);
  }, []);

  // Blink effect for cursor
  useEffect(() => {
    const blink = setInterval(() => {
      setVisible(v => !v);
    }, 530);
    return () => clearInterval(blink);
  }, []);

  return (
    <Box>
      <Text color={C.purple}>{frames[frame]}</Text>
      <Text color={C.muted}> {label}</Text>
    </Box>
  );
}

// ── Blinking Cursor ────────────────────────────────────────────────────────

function Cursor(): React.ReactElement {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setVisible(v => !v), 530);
    return () => clearInterval(id);
  }, []);
  return <Text color={C.cyan} bold={visible}>▎</Text>;
}

// ── Header ─────────────────────────────────────────────────────────────────

function Header({ title, subtitle }: HeaderProps): React.ReactElement {
  const paddingNeeded = Math.max(0, W - 2 - title.length);
  const topBorder = '┌─ ' + title + ' ' + '─'.repeat(paddingNeeded) + '┐';

  return (
    <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <Text bold color={C.purple}>{topBorder}</Text>
      {subtitle && (
        <Box>
          <Text color={C.muted}>│ </Text>
          <Text color={C.cyan}>{subtitle}</Text>
          <Text color={C.muted}>{' '.repeat(Math.max(0, W - 2 - subtitle.length))}│</Text>
        </Box>
      )}
    </Box>
  );
}

function HeaderEnd(): React.ReactElement {
  return <Text color={C.purple}>{'└' + '─'.repeat(W) + '┘'}</Text>;
}

// ── StatusBar ───────────────────────────────────────────────────────────────

function StatusBar({ shortcuts }: StatusBarProps): React.ReactElement {
  const line = shortcuts.map(([key, desc]) => `${key} ${desc}`).join('  ');
  const padding = Math.max(0, W - line.length);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color={C.purple}>{'├' + '─'.repeat(W) + '┤'}</Text>
      </Box>
      <Box paddingLeft={1} paddingRight={1}>
        <Text color={C.muted}>│</Text>
        <Text color={C.muted}>{' '.repeat(leftPad)}</Text>
        <Text color={C.cyan}>{line}</Text>
        <Text color={C.muted}>{' '.repeat(rightPad)}│</Text>
      </Box>
      <Box>
        <Text color={C.purple}>{'└' + '─'.repeat(W) + '┘'}</Text>
      </Box>
    </Box>
  );
}

// ── SelectableList ─────────────────────────────────────────────────────────

function SelectableList({ items, selected, onSelect, onConfirm, highlightOnFocus = true }: SelectableListProps): React.ReactElement {
  useInput((input, key) => {
    if (key.upArrow) {
      onSelect(Math.max(0, selected - 1));
    } else if (key.downArrow) {
      onSelect(Math.min(items.length - 1, selected + 1));
    } else if (key.return) {
      if (onConfirm) {
        onConfirm(selected);
      } else {
        onSelect(selected);
      }
    }
  });

  return (
    <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
      {items.map((item, i) => {
        const isSelected = i === selected;
        const itemColor = isSelected ? (item.color || C.cyan) : C.muted;
        const icon = isSelected ? '▶' : ' ';
        const labelLen = item.label.length + (item.sub ? item.sub.length + 2 : 0);

        return (
          <Box key={i}>
            <Text color={C.muted}>│ </Text>
            <Text color={itemColor} bold={isSelected}>{icon} </Text>
            <Text color={itemColor} bold={isSelected}>{item.label}</Text>
            {item.sub && (
              <Text color={C.muted}>  </Text>
            )}
            {item.sub && (
              <Text color={isSelected ? C.muted : C.muted} dimColor={!isSelected}>{item.sub}</Text>
            )}
            <Text color={C.muted}>{' '.repeat(Math.max(0, W - 4 - labelLen))}│</Text>
          </Box>
        );
      })}
    </Box>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────

function Footer({ text }: FooterProps): React.ReactElement {
  return (
    <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <Box>
        <Text color={C.muted}>│{' '.repeat(W)}│</Text>
      </Box>
      <Box>
        <Text color={C.muted}>│ </Text>
        <Text color={C.muted}>{text}</Text>
        <Text color={C.muted}>{' '.repeat(Math.max(0, W - 2 - text.length))}│</Text>
      </Box>
    </Box>
  );
}

// ── ConfirmBox ─────────────────────────────────────────────────────────────

function ConfirmBox({ question, onConfirm, onCancel }: ConfirmBoxProps): React.ReactElement {
  const [selected, setSelected] = useState(0);

  useInput((input, key) => {
    if (key.leftArrow || key.rightArrow) {
      setSelected(s => 1 - s);
    } else if (key.return) {
      selected === 0 ? onConfirm() : onCancel();
    } else if (key.escape) {
      onCancel();
    }
  });

  const opts: Array<{ label: string; color: string }> = [
    { label: '确认', color: C.green },
    { label: '取消', color: C.red },
  ];

  return (
    <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <Box>
        <Text color={C.muted}>│ </Text>
        <Text color={C.yellow}>⸺ {question}</Text>
        <Text color={C.muted}>{' '.repeat(Math.max(0, W - 4 - question.length))}│</Text>
      </Box>
      <Box>
        <Text color={C.muted}>│ </Text>
        <Text color={C.muted}>{' '.repeat(Math.floor((W - 10) / 2))}</Text>
        {opts.map((o, i) => (
          <React.Fragment key={i}>
            <Text
              color={i === selected ? o.color : C.muted}
              bold={i === selected}
            >
              {i === selected ? `[ ${o.label} ]` : `  ${o.label}  `}
            </Text>
            <Text color={C.muted}>{' '.repeat(2)}</Text>
          </React.Fragment>
        ))}
        <Text color={C.muted}>{' '.repeat(Math.max(0, W - 2 - Math.floor((W - 10) / 2) - 20))}│</Text>
      </Box>
    </Box>
  );
}

// ── Theme definitions ──────────────────────────────────────────────────────

interface ThemeOption {
  label: string;
  name: string;
  color: string;
  emoji: string;
}

const THEMES: ThemeOption[] = [
  { label: 'Dracula', name: 'dracula', color: C.pink, emoji: '🌙' },
  { label: 'Peach',    name: 'peach',   color: C.orange, emoji: '☀️' },
];

// ── CreateWizard ────────────────────────────────────────────────────────────

function CreateWizard({ onComplete }: CreateWizardProps): React.ReactElement {
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
        setTargetPath(path.resolve(process.cwd(), name.trim()));
        setStep(1);
      } else if (key.backspace) {
        setName(n => n.slice(0, -1));
        setError('');
      } else if (key.escape) {
        onComplete();
      } else if (input) {
        setName(n => n + input);
        setError('');
      }
    } else if (step === 1) {
      if (key.return) {
        const resolved = targetPath.trim() || path.resolve(process.cwd(), name);
        if (fs.existsSync(resolved) && fs.readdirSync(resolved).length > 0) {
          setError('目录非空，请使用空目录或更换路径');
          return;
        }
        setTargetPath(resolved);
        setStep(2);
      } else if (key.backspace) {
        setTargetPath(p => p.slice(0, -1));
        setError('');
      } else if (key.escape) {
        setStep(0);
      } else if (input) {
        setTargetPath(p => p + input);
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
      fs.mkdirSync(targetPath, { recursive: true });
      // 直接调用非交互式初始化，不依赖 readline（ink stdin 下 readline 会挂起）
      await initSiteNonInteractive(targetPath, name, 'Your Name', '', '', true, true, theme);
      fs.writeFileSync(path.join(targetPath, '.themerc'), theme);
      addRecentProject(targetPath);
      setResult({ name, path: targetPath });
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep(0);
    }
  }

  const shortcuts: [string, string][] = step === 2
    ? [['↑↓', '选择'], ['↵', '确认'], ['Esc', '返回']]
    : step < 3
    ? [['↵', '确认'], ['Esc', '返回']]
    : [['↵', '继续']];

  const displayPath = step > 0 ? targetPath || path.resolve(process.cwd(), name) : '';

  return (
    <Box flexDirection="column">
      <Header
        title="🆕 新建站点"
        subtitle={step > 0 ? `📂 ${displayPath}` : undefined}
      />
      <Box><Text color={C.purple}>{'├' + '─'.repeat(W) + '┤'}</Text></Box>

      <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
        {step === 0 && (
          <>
            <Box><Text color={C.muted}>│</Text></Box>
            <Box>
              <Text color={C.muted}>│ </Text>
              <Text color={C.yellow} dimColor>站点名称</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 10))}│</Text>
            </Box>
            <Box>
              <Text color={C.muted}>│   </Text>
              <Text color={name ? C.cyan : C.muted} bold>{name || '<输入中>'}</Text>
              {name && <Cursor />}
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 8 - (name.length || 8)))}│</Text>
            </Box>
            {error && (
              <Box>
                <Text color={C.muted}>│   </Text>
                <Text color={C.red}>✗ {error}</Text>
                <Text color={C.muted}>{' '.repeat(Math.max(0, W - 6 - error.length))}│</Text>
              </Box>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <Box><Text color={C.muted}>│</Text></Box>
            <Box>
              <Text color={C.muted}>│ </Text>
              <Text color={C.yellow} dimColor>保存路径（直接回车使用默认）</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 32))}│</Text>
            </Box>
            <Box>
              <Text color={C.muted}>│   </Text>
              <Text color={C.cyan}>{targetPath || '<输入中>'}</Text>
              <Cursor />
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 6 - (targetPath.length || 8)))}│</Text>
            </Box>
            <Box>
              <Text color={C.muted}>│   </Text>
              <Text color={C.muted} dimColor>默认: {path.resolve(process.cwd(), name)}</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 16 - name.length))}│</Text>
            </Box>
            {error && (
              <Box>
                <Text color={C.muted}>│   </Text>
                <Text color={C.red}>✗ {error}</Text>
                <Text color={C.muted}>{' '.repeat(Math.max(0, W - 6 - error.length))}│</Text>
              </Box>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <Box><Text color={C.muted}>│</Text></Box>
            <Box>
              <Text color={C.muted}>│ </Text>
              <Text color={C.yellow} dimColor>选择主题</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 10))}│</Text>
            </Box>
            {THEMES.map((t, i) => (
              <Box key={i}>
                <Text color={C.muted}>│   </Text>
                <Text color={themeIdx === i ? t.color : C.muted} bold={themeIdx === i}>
                  {themeIdx === i ? '▶ ' : '  '}{t.emoji} {t.label}
                </Text>
                <Text color={C.muted}>{' '.repeat(Math.max(0, W - 8 - t.label.length - 3))}│</Text>
              </Box>
            ))}
          </>
        )}

        {step === 3 && (
          <>
            <Box><Text color={C.muted}>│</Text></Box>
            <Box>
              <Text color={C.muted}>│ </Text>
              <Spinner label="正在创建站点..." />
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 20))}│</Text>
            </Box>
            <Box>
              <Text color={C.muted}>│ </Text>
              <Text color={C.muted} dimColor>这可能需要几分钟...</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 20))}│</Text>
            </Box>
          </>
        )}

        {step === 4 && result && (
          <>
            <Box><Text color={C.muted}>│</Text></Box>
            <Box>
              <Text color={C.muted}>│ </Text>
              <Text color={C.green} bold>✓ 站点创建成功</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 16))}│</Text>
            </Box>
            <Box>
              <Text color={C.muted}>│ </Text>
              <Text color={C.fg} bold>{result.name}</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 4 - result.name.length))}│</Text>
            </Box>
            <Box>
              <Text color={C.muted}>│ </Text>
              <Text color={C.muted}>{result.path}</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 2 - result.path.length))}│</Text>
            </Box>
            <Box>
              <Text color={C.muted}>│ </Text>
              <Text color={THEMES[themeIdx].color}>{THEMES[themeIdx].emoji} 主题: {THEMES[themeIdx].label}</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 12 - THEMES[themeIdx].label.length))}│</Text>
            </Box>
          </>
        )}
      </Box>

      <Footer
        text={
          step === 4 ? '按 Enter 进入项目 / Esc 返回主菜单' :
          step === 2 ? '↑↓ 选择主题 · Enter 确认 · Esc 返回' :
          'Enter 确认 · Esc 返回'
        }
      />
      <StatusBar shortcuts={shortcuts} />
    </Box>
  );
}

// ── Content type definitions ───────────────────────────────────────────────

interface ContentType {
  key: 'blog' | 'vlog' | 'photo';
  label: string;
  color: string;
  emoji: string;
}

const CONTENT_TYPES: ContentType[] = [
  { key: 'blog', label: '文章', color: C.green, emoji: '📝' },
  { key: 'vlog', label: '视频', color: C.cyan, emoji: '🎬' },
  { key: 'photo', label: '相册', color: C.pink, emoji: '📷' },
];

// ── NewContentWizard ─────────────────────────────────────────────────────

function NewContentWizard({ projectRoot, onComplete }: NewContentWizardProps): React.ReactElement {
  const [type, setType] = useState<'blog' | 'vlog' | 'photo'>('blog');
  const [title, setTitle] = useState('');
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [error, setError] = useState('');

  useInput((input, key) => {
    if (step === 0) {
      if (key.upArrow || key.downArrow) {
        const idx = CONTENT_TYPES.findIndex(t => t.key === type);
        const next = idx === 0 ? 2 : idx - 1;
        setType(CONTENT_TYPES[next].key);
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
        setTitle(t => t.slice(0, -1));
        setError('');
      } else if (key.escape) {
        setStep(0);
        setTitle('');
      } else if (input) {
        setTitle(t => t + input);
        setError('');
      }
    } else if (step === 3) {
      if (key.return || key.escape) onComplete();
    }
  });

  function doCreate(): void {
    try {
      const date = new Date().toISOString().split('T')[0];
      const content = buildFrontmatter(type, title.trim(), date);
      const typeMap: Record<string, string> = { blog: 'blogs', vlog: 'vlogs', photo: 'photos' };
      const dir = path.join(projectRoot, 'content', typeMap[type]);
      const slug = slugify(title.trim());
      const filename = `${date.replace(/-/g, '')}-${slug}.md`;
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, filename), content, 'utf-8');
      console.log(`\n${C.green}✓ 内容已创建: ${path.join(dir, filename)}${C.fg}\n`);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep(0);
    }
  }

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function buildFrontmatter(contentType: string, titleText: string, dateStr: string): string {
    if (contentType === 'blog') {
      return [
        '---',
        `title: "${titleText}"`,
        `date: "${dateStr}"`,
        'tags: []',
        'type: "blog"',
        'description: ""',
        '---',
        '',
        '',
      ].join('\n');
    } else if (contentType === 'vlog') {
      return [
        '---',
        `title: "${titleText}"`,
        `date: "${dateStr}"`,
        'tags: []',
        'type: "vlog"',
        'video: ""',
        'thumbnail: ""',
        'description: ""',
        '---',
        '',
        '',
      ].join('\n');
    } else {
      return [
        '---',
        `title: "${titleText}"`,
        `date: "${dateStr}"`,
        'tags: []',
        'type: "photo"',
        'photos: []',
        'description: ""',
        '---',
        '',
        '',
      ].join('\n');
    }
  }

  const typeObj = CONTENT_TYPES.find(t => t.key === type)!;

  return (
    <Box flexDirection="column">
      <Header title="📝 新建内容" subtitle={path.basename(projectRoot)} />
      <Box><Text color={C.purple}>{'├' + '─'.repeat(W) + '┤'}</Text></Box>

      <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
        {step === 0 && (
          <>
            <Box><Text color={C.muted}>│</Text></Box>
            <Box>
              <Text color={C.muted}>│ </Text>
              <Text color={C.yellow} dimColor>选择内容类型</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 14))}│</Text>
            </Box>
            {CONTENT_TYPES.map(t => (
              <Box key={t.key}>
                <Text color={C.muted}>│   </Text>
                <Text color={type === t.key ? t.color : C.muted} bold={type === t.key}>
                  {type === t.key ? '▶ ' : '  '}{t.emoji} {t.label}
                </Text>
                <Text color={C.muted}>{' '.repeat(Math.max(0, W - 8 - t.label.length - 3))}│</Text>
              </Box>
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <Box><Text color={C.muted}>│</Text></Box>
            <Box>
              <Text color={C.muted}>│ </Text>
              <Text color={C.muted}>类型: </Text>
              <Text color={typeObj.color}>{typeObj.emoji} {typeObj.label}</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 10 - typeObj.label.length - 3))}│</Text>
            </Box>
            <Box>
              <Text color={C.muted}>│ </Text>
              <Text color={C.yellow} dimColor>标题</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 8))}│</Text>
            </Box>
            <Box>
              <Text color={C.muted}>│   </Text>
              <Text color={title ? C.cyan : C.muted} bold>{title || '<输入中>'}</Text>
              {title && <Cursor />}
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 8 - (title.length || 8)))}│</Text>
            </Box>
            {error && (
              <Box>
                <Text color={C.muted}>│   </Text>
                <Text color={C.red}>✗ {error}</Text>
                <Text color={C.muted}>{' '.repeat(Math.max(0, W - 6 - error.length))}│</Text>
              </Box>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <Box><Text color={C.muted}>│</Text></Box>
            <Box>
              <Text color={C.muted}>│ </Text>
              <Spinner label="正在创建内容..." />
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 20))}│</Text>
            </Box>
          </>
        )}

        {step === 3 && (
          <>
            <Box><Text color={C.muted}>│</Text></Box>
            <Box>
              <Text color={C.muted}>│ </Text>
              <Text color={C.green} bold>✓ 内容创建完成！</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 16))}│</Text>
            </Box>
            <Box>
              <Text color={C.muted}>│ </Text>
              <Text color={C.muted} dimColor>文件已保存到 content/{type === 'blog' ? 'blogs' : type === 'vlog' ? 'vlogs' : 'photos'} 目录</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 50))}│</Text>
            </Box>
          </>
        )}
      </Box>

      <Footer text={step === 3 ? '按 Enter 返回' : 'Enter 确认 · Esc 返回'} />
      <StatusBar
        shortcuts={
          step === 0
            ? [['↑↓', '选择类型'], ['↵', '确认'], ['Esc', '取消']]
            : [['↵', '确认'], ['Esc', '返回']]
        }
      />
    </Box>
  );
}

// ── PathInput ─────────────────────────────────────────────────────────────

function PathInput({ onSubmit, onCancel }: PathInputProps): React.ReactElement {
  const [value, setValue] = useState('');

  useInput((input, key) => {
    if (key.return) {
      if (value.trim()) onSubmit(value.trim());
    } else if (key.backspace) {
      setValue(v => v.slice(0, -1));
    } else if (key.escape) {
      onCancel();
    } else if (input) {
      setValue(v => v + input);
    }
  });

  return (
    <Box flexDirection="column">
      <Header title="📂 打开目录" />
      <Box><Text color={C.purple}>{'├' + '─'.repeat(W) + '┤'}</Text></Box>
      <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
        <Box><Text color={C.muted}>│</Text></Box>
        <Box>
          <Text color={C.muted}>│ 输入目录路径后回车打开</Text>
          <Text color={C.muted}>{' '.repeat(Math.max(0, W - 22))}│</Text>
        </Box>
        <Box>
          <Text color={C.muted}>│   </Text>
          <Text color={value ? C.cyan : C.muted}>{value || '<输入路径>'}</Text>
          <Cursor />
          <Text color={C.muted}>{' '.repeat(Math.max(0, W - 8 - (value.length || 10)))}│</Text>
        </Box>
      </Box>
      <Footer text="输入路径后按 Enter · Esc 返回" />
      <StatusBar shortcuts={[['↵', '打开'], ['Esc', '返回']]} />
    </Box>
  );
}

// ── RecentList ──────────────────────────────────────────────────────────────

function RecentList({ recents, onSelect, onBack, onBrowse }: RecentListProps): React.ReactElement {
  const [selected, setSelected] = useState(0);
  const totalItems = recents.length + 2; // +1 browse +1 back

  useInput((input, key) => {
    if (key.upArrow) setSelected(s => Math.max(0, s - 1));
    else if (key.downArrow) setSelected(s => Math.min(totalItems - 1, s + 1));
    else if (key.return) handleSelect();
    else if (key.escape) onBack();
  });

  function handleSelect(): void {
    if (selected < recents.length) {
      onSelect(recents[selected].root);
    } else if (selected === recents.length) {
      onBrowse();
    } else {
      onBack();
    }
  }

  const items: MenuItem[] = [
    ...recents.map(r => {
      const daysAgo = Math.round((Date.now() - r.lastOpened) / 86400000);
      const timeAgo = daysAgo === 0 ? '今天' : `${daysAgo}天前`;
      return { label: r.name, sub: timeAgo, color: C.cyan };
    }),
    { label: '📂 浏览目录...', color: C.orange },
    { label: '↩ 返回主菜单', color: C.muted },
  ];

  return (
    <Box flexDirection="column">
      <Header title="📂 最近项目" />
      <Box><Text color={C.purple}>{'├' + '─'.repeat(W) + '┤'}</Text></Box>
      <SelectableList items={items} selected={selected} onSelect={setSelected} />
      <Footer text="↑↓ 选择 · Enter 确认 · Esc 返回" />
    </Box>
  );
}

// ── CommandPalette ─────────────────────────────────────────────────────────

function CommandPalette({ onCommand, onClose }: CommandPaletteProps): React.ReactElement {
  const [input, setInput] = useState('/');
  const [selectedIdx, setSelectedIdx] = useState(0);

  const commands: CommandItem[] = [
    // Site operations
    { cmd: '/create', desc: '新建站点', color: C.green, category: 'site' },
    { cmd: '/open', desc: '打开项目', color: C.cyan, category: 'site' },
    { cmd: '/generate', desc: '构建站点', color: C.orange, category: 'project' },
    { cmd: '/bundle', desc: '打包发布', color: C.yellow, category: 'project' },
    { cmd: '/server', desc: '本地预览', color: C.purple, category: 'project' },
    // Content operations
    { cmd: '/new:blog', desc: '新建文章', color: C.green, category: 'content' },
    { cmd: '/new:vlog', desc: '新建视频', color: C.cyan, category: 'content' },
    { cmd: '/new:photo', desc: '新建相册', color: C.pink, category: 'content' },
    // Meta operations
    { cmd: '/theme', desc: '切换主题', color: C.orange, category: 'meta' },
    { cmd: '/deploy', desc: '部署站点', color: C.green, category: 'meta' },
    { cmd: '/exit', desc: '退出', color: C.red, category: 'meta' },
  ];

  const filtered = useMemo(() => {
    if (!input || input === '/') return commands;
    return commands.filter(c =>
      c.cmd.toLowerCase().startsWith(input.toLowerCase())
    );
  }, [input]);

  // Reset selection when filtered changes
  useEffect(() => {
    setSelectedIdx(0);
  }, [filtered]);

  useInput((inp, key) => {
    if (key.return) {
      if (filtered.length > 0) {
        onCommand(filtered[selectedIdx].cmd);
      } else if (input.trim()) {
        onCommand(input.trim());
      }
    } else if (key.backspace) {
      setInput(v => v.slice(0, -1) || '/');
    } else if (key.upArrow) {
      setSelectedIdx(s => Math.max(0, s - 1));
    } else if (key.downArrow) {
      setSelectedIdx(s => Math.min(filtered.length - 1, s + 1));
    } else if (key.escape) {
      onClose();
    } else if (inp && input.length < 30) {
      setInput(v => v + inp);
    }
  });

  // Highlight the command prefix (e.g., "/new" in "/new:blog")
  function renderCommandWithHighlight(cmd: string, inputValue: string): React.ReactNode {
    if (cmd.startsWith(inputValue)) {
      const matched = inputValue;
      const rest = cmd.slice(matched.length);
      return (
        <>
          <Text bold color={C.yellow}>{matched}</Text>
          <Text color={C.muted}>{rest}</Text>
        </>
      );
    }
    return <Text color={C.cyan} bold>{cmd}</Text>;
  }

  return (
    <Box flexDirection="column">
      <Header title="⌘ 命令面板" />
      <Box><Text color={C.purple}>{'├' + '─'.repeat(W) + '┤'}</Text></Box>
      <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
        <Box><Text color={C.muted}>│</Text></Box>
        <Box>
          <Text color={C.muted}>│ </Text>
          <Text color={C.yellow} bold>{input}</Text>
          <Cursor />
          <Text color={C.muted}>{' '.repeat(Math.max(0, W - 4 - input.length))}│</Text>
        </Box>
        <Box><Text color={C.muted}>│</Text></Box>
        {filtered.length === 0 ? (
          <Box>
            <Text color={C.muted}>│   </Text>
            <Text color={C.red}>未找到匹配命令</Text>
            <Text color={C.muted}>{' '.repeat(Math.max(0, W - 16))}│</Text>
          </Box>
        ) : (
          filtered.slice(0, 8).map((c, i) => {
            const isSelected = i === selectedIdx;
            return (
              <Box key={c.cmd}>
                <Text color={C.muted}>│   </Text>
                <Text color={isSelected ? c.color : C.muted} bold={isSelected}>
                  {isSelected ? '▶ ' : '  '}
                </Text>
                {renderCommandWithHighlight(c.cmd, input)}
                <Text color={C.muted}>  </Text>
                <Text color={isSelected ? C.fg : C.muted} dimColor={!isSelected}>{c.desc}</Text>
                <Text color={C.muted}>{' '.repeat(Math.max(0, W - 8 - c.cmd.length - c.desc.length))}│</Text>
              </Box>
            );
          })
        )}
      </Box>
      <Footer text="↑↓ 选择 · Enter 执行 · Esc 关闭" />
      <StatusBar shortcuts={[['↑↓', '选择'], ['↵', '执行'], ['Esc', '关闭']]} />
    </Box>
  );
}

// ── Main Hub ───────────────────────────────────────────────────────────────

function Hub(): React.ReactElement {
  const [screen, setScreen] = useState<Screen>('main');
  const [selected, setSelected] = useState(0);
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ cmd: string; label: string } | null>(null);
  const [themeSelected, setThemeSelected] = useState(0);
  const recents = getRecentProjects().slice(0, 5);

  useInput((input, key) => {
    if (showPalette) return;
    if (confirmTarget) return;

    if (screen === 'main') {
      if (input === '/') { setShowPalette(true); return; }
      if (key.upArrow) setSelected(s => Math.max(0, s - 1));
      else if (key.downArrow) setSelected(s => Math.min(maxMenuItems() - 1, s + 1));
      else if (key.return) handleMainSelect();
      else if (input === 'x' || input === 'X') { sayBye(); }
    } else if (screen === 'theme') {
      const builtInThemes = ['dracula', 'peach', 'nord', 'mint'];
      const total = builtInThemes.length;
      if (key.upArrow) setThemeSelected(s => (s - 1 + total) % total);
      else if (key.downArrow) setThemeSelected(s => (s + 1) % total);
      else if (key.return) {
        const chosen = builtInThemes[themeSelected];
        if (currentProject) {
          fs.writeFileSync(path.join(currentProject, '.themerc'), chosen);
          const cfgPath = path.join(currentProject, '_config.yml');
          if (fs.existsSync(cfgPath)) {
            let cfg = fs.readFileSync(cfgPath, 'utf-8');
            cfg = cfg.replace(/^theme:.*$/m, `theme: ${chosen}`);
            fs.writeFileSync(cfgPath, cfg);
          }
        }
        setScreen('main');
      } else if (key.escape) {
        setScreen('main');
      }
    }
  });

  function maxMenuItems(): number {
    if (!currentProject) return 2;
    return 7;
  }

  function handleMainSelect(): void {
    if (!currentProject) {
      if (selected === 0) setScreen('create');
      else if (selected === 1) setScreen('open');
      else sayBye();
    } else {
      const cmds = ['generate', 'bundle', 'server', 'new', 'theme', 'deploy', 'exit'];
      const cmd = cmds[selected];
      if (cmd === 'exit') sayBye();
      else if (cmd === 'new') { setScreen('newContent'); }
      else if (cmd === 'theme') { setScreen('theme'); }
      else setConfirmTarget({ cmd, label: cmd });
    }
  }

  function executeProjectCmd(cmd: string): void {
    if (!currentProject) return;
    setConfirmTarget(null);
    // Use import.meta.url to find the memoria workspace root (works from any cwd)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    let PKG_ROOT = __dirname;
    for (let i = 0; i < 6; i++) {
      if (fs.existsSync(path.join(PKG_ROOT, 'package.json'))) break;
      PKG_ROOT = path.dirname(PKG_ROOT);
    }

    try {
      console.log(`\n${C.cyan}▶ 执行: memoria ${cmd}${C.fg}\n`);

      if (cmd === 'generate') {
        execSync(`node "${path.join(PKG_ROOT, 'dist', 'bin', 'memoria.js')}" build`, { cwd: currentProject, stdio: 'inherit' });
        console.log(`\n${C.green}✓ 构建完成${C.fg}\n`);
      } else if (cmd === 'bundle') {
        execSync(`node "${path.join(PKG_ROOT, 'dist', 'bin', 'memoria.js')}" build`, { cwd: currentProject, stdio: 'inherit' });
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const zipName = `memoria-${date}.zip`;
        const zipPath = path.join(currentProject, zipName);
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        execSync(`cd "${path.join(currentProject, 'dist')}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
        console.log(`\n${C.green}✓ 打包完成: ${zipName}（${(fs.statSync(zipPath).size / 1024).toFixed(1)} KB）${C.fg}\n`);
      } else if (cmd === 'server') {
        execSync(`node "${path.join(PKG_ROOT, 'dist', 'bin', 'memoria.js')}" preview --watch`, { cwd: currentProject, stdio: 'inherit' });
      } else if (cmd === 'new') {
        // new 是 dist/src/index.js 唯一接受的命令
        execSync(`node "${path.join(PKG_ROOT, 'dist', 'src', 'index.js')}" new`, { cwd: currentProject, stdio: 'inherit' });
      } else if (cmd === 'theme') {
        // 主题切换在 TUI 内部 screen 处理
        console.log(`\n${C.yellow}请在 TUI 内使用 🎨 theme${C.fg}\n`);
      }
    } catch (err) {
      console.log(`\n${C.red}✗ 执行失败: ${err instanceof Error ? err.message : String(err)}${C.fg}\n`);
    }
  }

  function openProject(root: string): void {
    addRecentProject(root);
    setCurrentProject(root);
    setScreen('main');
    console.log(`\n${C.green}📂 已打开: ${getProjectName(root)}${C.fg}`);
    console.log(`   ${C.muted}${root}${C.fg}\n`);
  }

  function sayBye(): void {
    console.log(`\n${C.muted}再见！👋${C.fg}\n`);
    process.exit(0);
  }

  // ── Screens ─────────────────────────────────────────────────────────────

  if (screen === 'create') {
    return (
      <Box flexDirection="column">
        <CreateWizard onComplete={(p) => { if (p) openProject(p); else setScreen('main'); }} />
      </Box>
    );
  }

  if (screen === 'open') {
    return (
      <Box flexDirection="column">
        <Header title="📂 打开项目" />
        <Box><Text color={C.purple}>{'├' + '─'.repeat(W) + '┤'}</Text></Box>
        <RecentList
          recents={recents}
          onSelect={root => openProject(root)}
          onBack={() => setScreen('main')}
          onBrowse={() => setScreen('browse')}
        />
      </Box>
    );
  }

  if (screen === 'browse') {
    return (
      <Box flexDirection="column">
        <PathInput
          onSubmit={(dir) => {
            if (fs.existsSync(dir) && isMemoriaProject(dir)) openProject(dir);
            else if (fs.existsSync(dir)) {
              console.log(`\n${C.yellow}⚠ 该目录不是 Memoria 项目${C.fg}\n`);
              setScreen('open');
            } else {
              console.log(`\n${C.red}✗ 目录不存在${C.fg}\n`);
              setScreen('open');
            }
          }}
          onCancel={() => setScreen('open')}
        />
      </Box>
    );
  }

  if (screen === 'theme') {
    const builtInThemes = [
      { name: 'dracula', emoji: '🌙', desc: 'Dracula 暗黑系' },
      { name: 'peach',   emoji: '☀️', desc: 'Peach 暖橙系' },
      { name: 'nord',    emoji: '❄️',  desc: 'Nord 冷淡蓝' },
      { name: 'mint',    emoji: '🌿',  desc: 'Mint 清新绿' },
    ];
    return (
      <Box flexDirection="column">
        <Header title="🎨 切换主题" />
        <Box><Text color={C.purple}>{'├' + '─'.repeat(W) + '┤'}</Text></Box>
        <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
          {builtInThemes.map((t, i) => (
            <Box key={i}>
              <Text color={C.muted}>│   </Text>
              <Text color={themeSelected === i ? C.green : C.muted} bold={themeSelected === i}>
                {themeSelected === i ? '▶ ' : '  '}{t.emoji} {t.name}  {t.desc}
              </Text>
            </Box>
          ))}
          <Box><Text color={C.muted}>│</Text></Box>
          <Box>
            <Text color={C.muted}>│   </Text>
            <Text color={C.cyan}>↵ 确认    Esc 返回</Text>
          </Box>
        </Box>
        <Box><Text color={C.purple}>{'├' + '─'.repeat(W) + '┤'}</Text></Box>
        <StatusBar shortcuts={[['↵', '确认'], ['Esc', '返回']]} />
      </Box>
    );
  }

  if (screen === 'newContent') {
    return (
      <Box flexDirection="column">
        <NewContentWizard projectRoot={currentProject!} onComplete={() => setScreen('main')} />
      </Box>
    );
  }

  // Main screen
  const menuItems: MenuItem[] = currentProject
    ? [
        { label: '🔨 generate   构建站点',    color: C.green, shortcut: 'g' },
        { label: '📦 bundle     构建 + 打包',  color: C.orange, shortcut: 'b' },
        { label: '🌐 server     本地预览',      color: C.purple, shortcut: 's' },
        { label: '📝 new        新建内容',      color: C.cyan, shortcut: 'n' },
        { label: '🎨 theme      切换主题',      color: C.pink, shortcut: 't' },
        { label: '🚀 deploy     部署站点',      color: C.green, shortcut: 'd' },
        { label: 'x  exit       退出项目',      color: C.muted, shortcut: 'x' },
      ]
    : [
        { label: '➕ create     新建站点',     color: C.green, shortcut: 'c' },
        { label: '📂 open       打开项目',     color: C.cyan, shortcut: 'o' },
        { label: 'x  exit       退出',         color: C.muted, shortcut: 'x' },
      ];

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Header
        title="📚 Memoria"
        subtitle={currentProject ? `📂 ${getProjectName(currentProject)}` : 'TUI 入口'}
      />
      <Box><Text color={C.purple}>{'├' + '─'.repeat(W) + '┤'}</Text></Box>

      {/* Recent projects */}
      {!currentProject && recents.length > 0 && (
        <>
          <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
            <Box>
              <Text color={C.muted}>│ </Text>
              <Text color={C.muted} dimColor>最近项目</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 10))}│</Text>
            </Box>
            {recents.slice(0, 3).map(r => (
              <Box key={r.root}>
                <Text color={C.muted}>│   </Text>
                <Text color={C.cyan}>{r.name}</Text>
                <Text color={C.muted}>{' '.repeat(Math.max(0, W - 8 - r.name.length))}│</Text>
              </Box>
            ))}
          </Box>
          <Box><Text color={C.purple}>{'├' + '─'.repeat(W) + '┤'}</Text></Box>
        </>
      )}

      {/* Menu */}
      <SelectableList items={menuItems} selected={selected} onSelect={setSelected} />

      {/* Command hint */}
      <Box><Text color={C.purple}>{'├' + '─'.repeat(W) + '┤'}</Text></Box>
      <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
        <Box>
          <Text color={C.muted}>│ </Text>
          <Text color={C.muted}>按 </Text>
          <Text color={C.yellow} bold>/</Text>
          <Text color={C.muted}> 打开命令面板 · ↑↓ 导航 · Enter 确认</Text>
          <Text color={C.muted}>{' '.repeat(Math.max(0, W - 44))}│</Text>
        </Box>
      </Box>
      <StatusBar shortcuts={[['/', '命令'], ['↑↓', '选择'], ['↵', '确认'], ['x', '退出']]} />

      {/* Command palette overlay */}
      {showPalette && (
        <Box position="absolute" top={0} left={0} right={0} bottom={0}>
          <CommandPalette
            onCommand={(cmd) => {
              setShowPalette(false);
              handleCommand(cmd);
            }}
            onClose={() => setShowPalette(false)}
          />
        </Box>
      )}

      {/* Confirm dialog */}
      {confirmTarget && (
        <Box position="absolute" top={0} left={0} right={0} bottom={0}>
          <Box flexDirection="column">
            <Header title={`⚠ 确认执行`} />
            <Box><Text color={C.purple}>{'├' + '─'.repeat(W) + '┤'}</Text></Box>
            <ConfirmBox
              question={`执行 /${confirmTarget.label}？`}
              onConfirm={() => executeProjectCmd(confirmTarget.cmd)}
              onCancel={() => setConfirmTarget(null)}
            />
          </Box>
        </Box>
      )}
    </Box>
  );

  function handleCommand(cmd: string): void {
    const c = cmd.trim();
    if (!c) return;

    if (c === '/create' || c === 'create') { setScreen('create'); return; }
    if (c === '/open' || c === 'open') { setScreen('open'); return; }
    if (c === '/exit' || c === 'exit' || c === '/quit' || c === 'quit') { sayBye(); }
    if (c === '/help' || c === 'help' || c === '/?' || c === '?') { showHelp(); return; }

    if (currentProject) {
      const bare = c.replace(/^\/+/, '');
      if (['generate', 'bundle', 'server', 'new', 'theme', 'deploy'].includes(bare)) {
        executeProjectCmd(bare);
        return;
      }
      if (c.startsWith('/new:') || c.startsWith('new:')) {
        const type = c.split(':')[1];
        if (['blog', 'vlog', 'photo'].includes(type)) { setScreen('newContent'); return; }
      }
    } else {
      const bare = c.replace(/^\/+/, '');
      if (['generate', 'bundle', 'server', 'theme', 'deploy'].includes(bare)) {
        console.log(`\n${C.yellow}⚠ 请先打开一个项目${C.fg}\n`);
        return;
      }
    }

    console.log(`\n${C.red}✗ 未知命令: ${c}${C.fg}\n`);
  }

  function showHelp(): void {
    console.log(`
${C.purple}┌${'─'.repeat(W)}┐${C.fg}
${C.purple}│${C.fg}  ${C.cyan}Memoria TUI 命令帮助${C.fg}
${C.purple}├${'─'.repeat(W)}┤${C.fg}
${C.purple}│${C.fg}  ${C.green}/create${C.fg}      新建站点
${C.purple}│${C.fg}  ${C.cyan}/open${C.fg}       打开项目
${C.purple}│${C.fg}  ${C.yellow}/generate${C.fg}   构建站点（需打开项目）
${C.purple}│${C.fg}  ${C.orange}/bundle${C.fg}    构建+打包（需打开项目）
${C.purple}│${C.fg}  ${C.purple}/server${C.fg}    本地预览（需打开项目）
${C.purple}│${C.fg}  ${C.green}/new:blog${C.fg}   新建文章
${C.purple}│${C.fg}  ${C.cyan}/new:vlog${C.fg}   新建视频
${C.purple}│${C.fg}  ${C.pink}/new:photo${C.fg}  新建相册
${C.purple}│${C.fg}  ${C.orange}/theme${C.fg}     切换主题（需打开项目）
${C.purple}│${C.fg}  ${C.green}/deploy${C.fg}    部署站点（需打开项目）
${C.purple}│${C.fg}  ${C.muted}/exit${C.fg}      退出
${C.purple}└${'─'.repeat(W)}┘${C.fg}
`);
  }
}

// ── Export ─────────────────────────────────────────────────────────────────

export async function showHub(cwd?: string): Promise<void> {
  return new Promise((resolve) => {
    // TUI 启动时自动检测当前目录是否为 memoria 项目
    if (cwd && fs.existsSync(path.join(cwd, 'content')) && fs.existsSync(path.join(cwd, '_config.yml'))) {
      openProject(cwd);
    }
    const { waitUntilExit } = render(<Hub />);
    waitUntilExit().then(() => resolve());
  });
}