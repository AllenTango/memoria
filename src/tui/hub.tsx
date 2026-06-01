// @ts-nocheck
/**
 * Memoria TUI - ink + React
 * Dracula theme + ASCII box UI
 */
import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, BorderProps } from 'ink';
import { getRecentProjects, addRecentProject, isMemoriaProject, getProjectName } from './recent.js';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

// ── Types ─────────────────────────────────────────────────────────────────

interface RecentProject {
  root: string;
  name: string;
  lastOpened: number;
}

type Screen = 'main' | 'open' | 'create' | 'newContent' | 'browse' | 'confirm';

// ── Dracula Theme Colors ─────────────────────────────────────────────────

const C = {
  bg:        '#282a36',
  surface:   '#44475a',
  fg:        '#f8f8f2',
  muted:     '#6272a4',
  cyan:      '#8be9fd',
  green:     '#50fa7b',
  orange:    '#ffb86c',
  pink:      '#ff79c6',
  purple:    '#bd93f9',
  red:       '#ff5555',
  yellow:    '#f1fa8c',
};

// ── Layout Constants ───────────────────────────────────────────────────────

const W = 50;

function divider(char = '─', color = C.muted) {
  return <Text color={color}>{char.repeat(W)}</Text>;
}

// ── Spinner ────────────────────────────────────────────────────────────────

function Spinner({ label }: { label: string }) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % frames.length), 80);
    return () => clearInterval(id);
  }, []);
  return <Text color={C.muted}>{frames[frame]} {label}</Text>;
}

// ── Header ─────────────────────────────────────────────────────────────────

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <Text bold color={C.purple}>{'┌─ ' + title + ' ' + '─'.repeat(Math.max(0, W - 4 - title.length)) + '┐'}</Text>
      {subtitle && <Text color={C.muted}>{'│ ' + ' '.repeat(W - 2) + '│'}</Text>}
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

function HeaderEnd() {
  return <Text color={C.purple}>{'└' + '─'.repeat(W) + '┘'}</Text>;
}

// ── StatusBar ───────────────────────────────────────────────────────────────

function StatusBar({ shortcuts }: { shortcuts: [string, string][] }) {
  const line = shortcuts.map(([key, desc]) => `${key} ${desc}`).join('  ');
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color={C.muted}>{'├' + '─'.repeat(W) + '┤'}</Text>
      </Box>
      <Box paddingLeft={1} paddingRight={1}>
        <Text color={C.muted}>│</Text>
        <Text color={C.muted}>{' '.repeat(Math.floor((W - line.length) / 2))}</Text>
        <Text color={C.cyan}>{line}</Text>
        <Text color={C.muted}>{' '.repeat(Math.max(0, W - 1 - Math.floor((W - line.length) / 2) - line.length))}│</Text>
      </Box>
      <Box>
        <Text color={C.muted}>{'└' + '─'.repeat(W) + '┘'}</Text>
      </Box>
    </Box>
  );
}

// ── SelectableList ─────────────────────────────────────────────────────────

function SelectableList({ items, selected, onSelect }: {
  items: { label: string; sub?: string; color?: string }[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  useInput((input, key) => {
    if (key.upArrow) onSelect(Math.max(0, selected - 1));
    else if (key.downArrow) onSelect(Math.min(items.length - 1, selected + 1));
    else if (key.return) confirmSelect(items[selected]);
  });

  function confirmSelect(item: (typeof items)[0]) {
    onSelect(selected);
  }

  return (
    <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
      {items.map((item, i) => (
        <Box key={i}>
          <Text color={C.muted}>│ </Text>
          <Text color={i === selected ? (item.color || C.cyan) : C.muted}>
            {i === selected ? '▶ ' : '  '}
          </Text>
          <Text color={i === selected ? (item.color || C.cyan) : C.muted} bold={i === selected}>
            {item.label}
          </Text>
          {item.sub && (
            <Text color={C.muted}>  {item.sub}</Text>
          )}
          <Text color={C.muted}>{' '.repeat(Math.max(0, W - 4 - item.label.length - (item.sub?.length || 0)))}│</Text>
        </Box>
      ))}
    </Box>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────

function Footer({ text }: { text: string }) {
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

function ConfirmBox({ question, onConfirm, onCancel }: {
  question: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState(0);
  useInput((input, key) => {
    if (key.leftArrow || key.rightArrow) setSelected(s => 1 - s);
    else if (key.return) selected === 0 ? onConfirm() : onCancel();
    else if (key.escape) onCancel();
  });

  const opts = [
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
            <Text color={i === selected ? o.color : C.muted} bold={i === selected}>
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

// ── CreateWizard ────────────────────────────────────────────────────────────

function CreateWizard({ onComplete }: { onComplete: (p?: string) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [themeIdx, setThemeIdx] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ name: string; path: string } | null>(null);

  const themes = [
    { label: '🌙 Dracula', name: 'dracula', color: C.pink },
    { label: '☀️ Peach',   name: 'peach',   color: C.orange },
  ];

  useInput((input, key) => {
    if (step === 0) {
      if (key.return) {
        if (!name.trim()) { setError('名称不能为空'); return; }
        setTargetPath(path.resolve(process.cwd(), name.trim()));
        setStep(1);
      } else if (key.backspace) setName(n => n.slice(0, -1));
      else if (key.escape) onComplete();
      else if (input) { setName(n => n + input); setError(''); }
    } else if (step === 1) {
      if (key.return) {
        const resolved = targetPath.trim() || path.resolve(process.cwd(), name);
        if (fs.existsSync(resolved) && fs.readdirSync(resolved).length > 0) {
          setError('目录非空，请使用空目录或更换路径'); return;
        }
        setTargetPath(resolved);
        setStep(2);
      } else if (key.backspace) setTargetPath(p => p.slice(0, -1));
      else if (key.escape) setStep(0);
      else if (input) { setTargetPath(p => p + input); setError(''); }
    } else if (step === 2) {
      if (key.upArrow || key.downArrow) setThemeIdx(1 - themeIdx);
      else if (key.return) { setStep(3); doCreate(); }
      else if (key.escape) setStep(1);
    } else if (step === 4) {
      if (key.return || key.escape) {
        if (result) onComplete(result.path);
        else onComplete();
      }
    }
  });

  async function doCreate() {
    const theme = themes[themeIdx].name;
    try {
      fs.mkdirSync(targetPath, { recursive: true });
      fs.mkdirSync(path.join(targetPath, 'content', 'blogs'), { recursive: true });
      fs.mkdirSync(path.join(targetPath, 'content', 'vlogs'), { recursive: true });
      fs.mkdirSync(path.join(targetPath, 'content', 'photos'), { recursive: true });
      fs.mkdirSync(path.join(targetPath, 'public'), { recursive: true });
      fs.writeFileSync(path.join(targetPath, '.themerc'), theme);
      const date = new Date().toISOString().split('T')[0];
      fs.writeFileSync(path.join(targetPath, 'content', 'about.md'),
        `---\ntitle: 欢迎使用 Memoria\ndate: ${date}\n---\n\n# 欢迎使用 Memoria! 🫘\n\n这是一个基于 **Memoria** 的静态博客。\n`);
      fs.writeFileSync(path.join(targetPath, 'content', 'blogs', 'hello.md'),
        `---\ntitle: 我的第一篇文章\ndate: ${date}\ncategory: 默认分类\n---\n\n# 你好世界！\n\n这是你在 Memoria 的第一篇文章。\n`);
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

  return (
    <Box flexDirection="column">
      {/* Title */}
      <Header
        title="🆕 新建站点"
        subtitle={step > 0 ? `📂 ${targetPath || path.resolve(process.cwd(), name)}` : undefined}
      />
      <Box><Text color={C.purple}>{'├' + '─'.repeat(W) + '┤'}</Text></Box>

      {/* Body */}
      <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
        {step === 0 && (
          <>
            <Box><Text color={C.muted}>│</Text></Box>
            <Box>
              <Text color={C.muted}>│ 站点名称</Text>
              <Text color={C.muted}>{' '.repeat(W - 12)}│</Text>
            </Box>
            <Box>
              <Text color={C.muted}>│   </Text>
              <Text color={C.cyan} bold>{name || '<输入中>'}</Text>
              <Text color={C.cyan}>▎</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 8 - (name.length || 8)))}│</Text>
            </Box>
            {error && (
              <Box>
                <Text color={C.muted}>│   </Text>
                <Text color={C.red}>{error}</Text>
                <Text color={C.muted}>{' '.repeat(Math.max(0, W - 4 - error.length))}│</Text>
              </Box>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <Box><Text color={C.muted}>│</Text></Box>
            <Box>
              <Text color={C.muted}>│ 保存路径（直接回车使用默认路径）</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 36))}│</Text>
            </Box>
            <Box>
              <Text color={C.muted}>│   </Text>
              <Text color={C.cyan}>{targetPath}</Text>
              <Text color={C.cyan}>▎</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 6 - targetPath.length))}│</Text>
            </Box>
            <Box>
              <Text color={C.muted}>│   </Text>
              <Text color={C.muted} dimColor>默认: {path.resolve(process.cwd(), name)}</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 6 - 24 - name.length))}│</Text>
            </Box>
            {error && (
              <Box>
                <Text color={C.muted}>│   </Text>
                <Text color={C.red}>{error}</Text>
                <Text color={C.muted}>{' '.repeat(Math.max(0, W - 4 - error.length))}│</Text>
              </Box>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <Box><Text color={C.muted}>│</Text></Box>
            <Box>
              <Text color={C.muted}>│ 选择主题</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 10))}│</Text>
            </Box>
            {themes.map((t, i) => (
              <Box key={i}>
                <Text color={C.muted}>│   </Text>
                <Text color={themeIdx === i ? t.color : C.muted} bold={themeIdx === i}>
                  {themeIdx === i ? '▶ ' : '  '}{t.label}
                </Text>
                <Text color={C.muted}>{' '.repeat(Math.max(0, W - 8 - t.label.length))}│</Text>
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
          </>
        )}

        {step === 4 && result && (
          <>
            <Box><Text color={C.muted}>│</Text></Box>
            <Box>
              <Text color={C.muted}>│ </Text>
              <Text color={C.green}>✓ 站点创建成功</Text>
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
              <Text color={C.orange}>主题: {themes[themeIdx].label}</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 12 - themes[themeIdx].label.length))}│</Text>
            </Box>
          </>
        )}
      </Box>

      {/* Footer */}
      <Footer text={step === 4 ? '按 Enter 进入项目 / Esc 返回主菜单' : step === 2 ? '↑↓ 选择主题 · Enter 确认 · Esc 返回' : 'Enter 确认 · Esc 返回'} />
      <StatusBar shortcuts={shortcuts} />
    </Box>
  );
}

// ── NewContentWizard ─────────────────────────────────────────────────────

function NewContentWizard({ projectRoot, onComplete }: { projectRoot: string; onComplete: () => void }) {
  const [type, setType] = useState<'blog' | 'vlog' | 'photo'>('blog');
  const [title, setTitle] = useState('');
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');

  const types = [
    { key: 'blog', label: '📝 文章', color: C.green },
    { key: 'vlog', label: '🎬 视频', color: C.cyan },
    { key: 'photo', label: '📷 相册', color: C.pink },
  ];

  useInput((input, key) => {
    if (step === 0) {
      if (key.upArrow || key.downArrow) {
        const idx = types.findIndex(t => t.key === type);
        const next = idx === 0 ? 2 : idx - 1;
        setType(types[next].key as 'blog' | 'vlog' | 'photo');
      } else if (key.return) setStep(1);
      else if (key.escape) onComplete();
    } else if (step === 1) {
      if (key.return) {
        if (!title.trim()) { setError('标题不能为空'); return; }
        setStep(2);
        doCreate();
      } else if (key.backspace) { setTitle(t => t.slice(0, -1)); setError(''); }
      else if (key.escape) { setStep(0); setTitle(''); }
      else if (input) { setTitle(t => t + input); setError(''); }
    } else if (step === 3) {
      if (key.return || key.escape) onComplete();
    }
  });

  function doCreate() {
    try {
      const typeMap: Record<string, string> = { blog: 'blogs', vlog: 'vlogs', photo: 'photos' };
      const dir = path.join(projectRoot, 'content', typeMap[type]);
      const slug = title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      const date = new Date().toISOString().split('T')[0];
      const filename = `${date}-${slug}.md`;
      fs.writeFileSync(path.join(dir, filename),
        `---\ntitle: ${title.trim()}\ndate: ${date}\n---\n\n# ${title.trim()}\n\n`);
      console.log(`\n${C.green}✓ 内容已创建: ${path.join(dir, filename)}${C.fg}\n`);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep(0);
    }
  }

  const typeObj = types.find(t => t.key === type)!;

  return (
    <Box flexDirection="column">
      <Header title="📝 新建内容" subtitle={path.basename(projectRoot)} />
      <Box><Text color={C.purple}>{'├' + '─'.repeat(W) + '┤'}</Text></Box>

      <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
        {step === 0 && (
          <>
            <Box><Text color={C.muted}>│</Text></Box>
            <Box>
              <Text color={C.muted}>│ 选择内容类型</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 14))}│</Text>
            </Box>
            {types.map(t => (
              <Box key={t.key}>
                <Text color={C.muted}>│   </Text>
                <Text color={type === t.key ? t.color : C.muted} bold={type === t.key}>
                  {type === t.key ? '▶ ' : '  '}{t.label}
                </Text>
                <Text color={C.muted}>{' '.repeat(Math.max(0, W - 8 - t.label.length))}│</Text>
              </Box>
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <Box><Text color={C.muted}>│</Text></Box>
            <Box>
              <Text color={C.muted}>│ 类型: </Text>
              <Text color={typeObj.color}>{typeObj.label}</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 10 - typeObj.label.length))}│</Text>
            </Box>
            <Box>
              <Text color={C.muted}>│ 标题</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 8))}│</Text>
            </Box>
            <Box>
              <Text color={C.muted}>│   </Text>
              <Text color={C.cyan} bold>{title || '<输入中>'}</Text>
              <Text color={C.cyan}>▎</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 8 - (title.length || 8)))}│</Text>
            </Box>
            {error && (
              <Box>
                <Text color={C.muted}>│   </Text>
                <Text color={C.red}>{error}</Text>
                <Text color={C.muted}>{' '.repeat(Math.max(0, W - 4 - error.length))}│</Text>
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
              <Text color={C.green}>✓ 内容创建完成！</Text>
              <Text color={C.muted}>{' '.repeat(Math.max(0, W - 18))}│</Text>
            </Box>
          </>
        )}
      </Box>

      <Footer text={step === 3 ? '按 Enter 返回' : 'Enter 确认 · Esc 返回'} />
      <StatusBar shortcuts={step === 0 ? [['↑↓', '选择类型'], ['↵', '确认'], ['Esc', '取消']] : [['↵', '确认'], ['Esc', '返回']]} />
    </Box>
  );
}

// ── PathInput ─────────────────────────────────────────────────────────────

function PathInput({ onSubmit, onCancel }: { onSubmit: (p: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState('');
  useInput((input, key) => {
    if (key.return) { if (value.trim()) onSubmit(value.trim()); }
    else if (key.backspace) setValue(v => v.slice(0, -1));
    else if (key.escape) onCancel();
    else if (input) setValue(v => v + input);
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
          <Text color={C.cyan}>{value || '<输入路径>'}</Text>
          <Text color={C.cyan}>▎</Text>
          <Text color={C.muted}>{' '.repeat(Math.max(0, W - 8 - (value.length || 10)))}│</Text>
        </Box>
      </Box>
      <Footer text="输入路径后按 Enter · Esc 返回" />
      <StatusBar shortcuts={[['↵', '打开'], ['Esc', '返回']]} />
    </Box>
  );
}

// ── RecentList ──────────────────────────────────────────────────────────────

function RecentList({ recents, onSelect, onBack, onBrowse }: {
  recents: RecentProject[];
  onSelect: (root: string) => void;
  onBack: () => void;
  onBrowse: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const totalItems = recents.length + 2; // +1 browse +1 back

  useInput((input, key) => {
    if (key.upArrow) setSelected(s => Math.max(0, s - 1));
    else if (key.downArrow) setSelected(s => Math.min(totalItems - 1, s + 1));
    else if (key.return) handleSelect();
    else if (key.escape) onBack();
  });

  function handleSelect() {
    if (selected < recents.length) onSelect(recents[selected].root);
    else if (selected === recents.length) onBrowse();
    else onBack();
  }

  const items = [
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

// ── Command Palette ───────────────────────────────────────────────────────

function CommandPalette({ onCommand, onClose }: {
  onCommand: (cmd: string) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState('/');
  const commands = [
    { cmd: '/create', desc: '新建站点', color: C.green },
    { cmd: '/open',    desc: '打开项目', color: C.cyan },
    { cmd: '/generate', desc: '构建站点', color: C.orange },
    { cmd: '/bundle',  desc: '打包发布', color: C.yellow },
    { cmd: '/server',  desc: '本地预览', color: C.purple },
    { cmd: '/new:blog', desc: '新建文章', color: C.green },
    { cmd: '/new:vlog', desc: '新建视频', color: C.cyan },
    { cmd: '/new:photo', desc: '新建相册', color: C.pink },
    { cmd: '/theme',   desc: '切换主题', color: C.orange },
    { cmd: '/deploy',  desc: '部署站点', color: C.green },
    { cmd: '/exit',    desc: '退出', color: C.red },
  ];

  useInput((inp, key) => {
    if (key.return) { onCommand(input.trim()); }
    else if (key.backspace) setInput(v => v.slice(0, -1) || '/');
    else if (key.escape) onClose();
    else if (input.length < 30) setInput(v => v + inp);
  });

  const filtered = commands.filter(c =>
    c.cmd.toLowerCase().startsWith(input.toLowerCase())
  );

  return (
    <Box flexDirection="column">
      <Header title="⌘ 命令面板" />
      <Box><Text color={C.purple}>{'├' + '─'.repeat(W) + '┤'}</Text></Box>
      <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
        <Box><Text color={C.muted}>│</Text></Box>
        <Box>
          <Text color={C.muted}>│ </Text>
          <Text color={C.yellow} bold>{input}</Text>
          <Text color={C.yellow}>▎</Text>
          <Text color={C.muted}>{' '.repeat(Math.max(0, W - 4 - input.length))}│</Text>
        </Box>
        <Box><Text color={C.muted}>│</Text></Box>
        {filtered.slice(0, 8).map(c => (
          <Box key={c.cmd}>
            <Text color={C.muted}>│   </Text>
            <Text color={c.color} bold>{c.cmd}</Text>
            <Text color={C.muted}>  {c.desc}</Text>
            <Text color={C.muted}>{' '.repeat(Math.max(0, W - 8 - c.cmd.length - c.desc.length))}│</Text>
          </Box>
        ))}
        {filtered.length === 0 && (
          <Box>
            <Text color={C.muted}>│   </Text>
            <Text color={C.red}>未找到匹配命令</Text>
            <Text color={C.muted}>{' '.repeat(Math.max(0, W - 16))}│</Text>
          </Box>
        )}
      </Box>
      <Footer text="输入命令 · Enter 执行 · Esc 关闭" />
      <StatusBar shortcuts={[['↵', '执行'], ['Esc', '关闭']]} />
    </Box>
  );
}

// ── Main Hub ───────────────────────────────────────────────────────────────

function Hub() {
  const [screen, setScreen] = useState<Screen>('main');
  const [selected, setSelected] = useState(0);
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ cmd: string; label: string } | null>(null);
  const recents = getRecentProjects().slice(0, 5);

  useInput((input, key) => {
    if (showPalette) return; // handled by CommandPalette
    if (confirmTarget) return;

    if (screen === 'main') {
      if (input === '/') { setShowPalette(true); return; }
      if (key.upArrow) setSelected(s => Math.max(0, s - 1));
      else if (key.downArrow) setSelected(s => Math.min(maxMenuItems() - 1, s + 1));
      else if (key.return) handleMainSelect();
      else if (input === 'x' || input === 'X') { sayBye(); }
    }
  });

  function maxMenuItems() {
    if (!currentProject) return 2; // create + open + exit
    return 7; // generate + bundle + server + new + theme + deploy + exit
  }

  function handleMainSelect() {
    if (!currentProject) {
      if (selected === 0) setScreen('create');
      else if (selected === 1) setScreen('open');
      else sayBye();
    } else {
      const cmds = ['generate', 'bundle', 'server', 'new', 'theme', 'deploy', 'exit'];
      const cmd = cmds[selected];
      if (cmd === 'exit') sayBye();
      else if (cmd === 'new') { setScreen('newContent'); }
      else setConfirmTarget({ cmd, label: cmd });
    }
  }

  function executeProjectCmd(cmd: string) {
    if (!currentProject) return;
    setConfirmTarget(null);
    const PKG_ROOT = path.resolve(currentProject, '../..');

    try {
      console.log(`\n${C.cyan}▶ 执行: memoria ${cmd}${C.fg}\n`);

      if (cmd === 'generate') {
        execSync(`node "${path.join(PKG_ROOT, 'dist', 'src', 'index')}" --root "${currentProject}"`, { cwd: currentProject, stdio: 'inherit' });
        console.log(`\n${C.green}✓ 构建完成${C.fg}\n`);
      } else if (cmd === 'bundle') {
        execSync(`node "${path.join(PKG_ROOT, 'dist', 'src', 'index')}" --root "${currentProject}"`, { cwd: currentProject, stdio: 'inherit' });
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const zipName = `memoria-${date}.zip`;
        const zipPath = path.join(currentProject, zipName);
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        execSync(`cd "${path.join(currentProject, 'dist')}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
        console.log(`\n${C.green}✓ 打包完成: ${zipName}（${(fs.statSync(zipPath).size / 1024).toFixed(1)} KB）${C.fg}\n`);
      } else if (cmd === 'server') {
        execSync(`node "${path.join(PKG_ROOT, 'dist', 'src', 'index')}" --root "${currentProject}" --watch`, { cwd: currentProject, stdio: 'inherit' });
      } else if (cmd === 'theme') {
        execSync(`node "${path.join(PKG_ROOT, 'dist', 'bin', 'memoria.js')}" theme`, { cwd: currentProject, stdio: 'inherit' });
      } else if (cmd === 'deploy') {
        execSync(`node "${path.join(PKG_ROOT, 'dist', 'bin', 'memoria.js')}" deploy`, { cwd: currentProject, stdio: 'inherit' });
      }
    } catch (err: unknown) {
      console.log(`\n${C.red}✗ 执行失败: ${err instanceof Error ? err.message : String(err)}${C.fg}\n`);
    }
  }

  function openProject(root: string) {
    addRecentProject(root);
    setCurrentProject(root);
    setScreen('main');
    console.log(`\n${C.green}📂 已打开: ${getProjectName(root)}${C.fg}`);
    console.log(`   ${C.muted}${root}${C.fg}\n`);
  }

  function sayBye() {
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

  if (screen === 'newContent') {
    return (
      <Box flexDirection="column">
        <NewContentWizard projectRoot={currentProject!} onComplete={() => setScreen('main')} />
      </Box>
    );
  }

  // Main screen
  const menuItems = currentProject
    ? [
        { label: '🔨 generate   构建站点',    color: C.green },
        { label: '📦 bundle     构建 + 打包',  color: C.orange },
        { label: '🌐 server     本地预览',      color: C.purple },
        { label: '📝 new        新建内容',      color: C.cyan },
        { label: '🎨 theme      切换主题',      color: C.pink },
        { label: '🚀 deploy     部署站点',      color: C.green },
        { label: 'x  exit       退出项目',      color: C.muted },
      ]
    : [
        { label: '➕ create     新建站点',     color: C.green },
        { label: '📂 open       打开项目',     color: C.cyan },
        { label: 'x  exit       退出',         color: C.muted },
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
            <Box><Text color={C.muted}>│ 最近项目</Text><Text color={C.muted}>{' '.repeat(Math.max(0, W - 10))}│</Text></Box>
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
          <Text color={C.yellow}>/</Text>
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

  function handleCommand(cmd: string) {
    const c = cmd.trim();
    if (!c) return;

    if (c === 'create') { setScreen('create'); return; }
    if (c === 'open') { setScreen('open'); return; }
    if (c === 'exit' || c === 'quit') { sayBye(); }
    if (c === 'help' || c === '?') { showHelp(); return; }

    if (currentProject) {
      if (['generate', 'bundle', 'server', 'new', 'theme', 'deploy'].includes(c.replace(/^\/+/, ''))) {
        executeProjectCmd(c.replace(/^\/+/, ''));
        return;
      }
      if (c.startsWith('new:')) {
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

  function showHelp() {
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

export async function showHub(): Promise<void> {
  return new Promise((resolve) => {
    const { waitUntilExit } = render(<Hub />);
    waitUntilExit().then(() => resolve());
  });
}
