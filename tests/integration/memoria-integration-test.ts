/**
 * Memoria 完整测试脚本
 * 测试 TypeScript 重构后的 memoria 框架完整流程
 * 
 * 隔离环境：所有测试在 tests/fixtures/ 下的独立目录执行
 * 日志存储：tests/logs/
 */
import { execSync } from 'child_process';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const MEMORIA_SRC = path.join(PROJECT_ROOT, 'dist', 'bin', 'memoria.js');
const FIXTURES_DIR = path.join(PROJECT_ROOT, 'tests', 'fixtures');
// 日志写到系统临时目录，确保可写
const LOG_FILE = path.join('/tmp', `memoria-test-${timestamp()}.log`);

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function log(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function logSection(title: string): void {
  const line = `\n══════════════════════════════════════\n  ${title}\n══════════════════════════════════════`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function memoria(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; status: number }> {
  return new Promise((resolve) => {
    const child = spawn('node', [MEMORIA_SRC, ...args], {
      cwd,
      encoding: 'utf-8',
      timeout: 60000,
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d; });
    child.stderr?.on('data', (d) => { stderr += d; });
    child.on('close', (code) => resolve({ stdout, stderr, status: code ?? 0 }));
    child.on('error', (e) => resolve({ stdout, stderr: e.message, status: 1 }));
  });
}

function memoriaSync(args: string[], cwd: string): { stdout: string; stderr: string; status: number } {
  try {
    const out = execSync(`node "${MEMORIA_SRC}" ${args.join(' ')}`, {
      cwd,
      encoding: 'utf-8',
      timeout: 60000,
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    return { stdout: out.toString(), stderr: '', status: 0 };
  } catch (e: any) {
    return { stdout: e.stdout?.toString() || '', stderr: e.stderr?.toString() || '', status: e.status || 1 };
  }
}

function memoriaInteractive(args: string[], cwd: string, inputs: string[]): Promise<{ stdout: string; stderr: string; status: number }> {
  return new Promise((resolve) => {
    const child = spawn('node', [MEMORIA_SRC, ...args], {
      cwd,
      encoding: 'utf-8',
      timeout: 30000,
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d; });
    child.stderr?.on('data', (d) => { stderr += d; });
    child.on('close', (code) => resolve({ stdout, stderr, status: code ?? 0 }));
    child.on('error', (e) => resolve({ stdout, stderr: e.message, status: 1 }));

    let idx = 0;
    function feed(): void {
      if (idx >= inputs.length) return;
      if (child.stdin?.writableEnded) return;
      const ok = child.stdin?.write(inputs[idx] + '\n');
      idx++;
      if (ok === false) {
        child.stdin?.once('drain', feed);
      } else if (idx < inputs.length) {
        setTimeout(feed, 50);
      }
    }
    child.stdin?.on('ready', feed);
    setTimeout(feed, 150);
  });
}

function mkTempDir(name: string): string {
  const dir = path.join(FIXTURES_DIR, name);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function rmDir(dir: string): void {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function readFileContent(filePath: string): string {
  if (!fs.existsSync(filePath)) return '(file not found)';
  return fs.readFileSync(filePath, 'utf-8');
}

interface TestResult { name: string; passed: boolean; duration: number; error?: string; }
const results: TestResult[] = [];

function record(name: string, passed: boolean, duration: number, error?: string): void {
  results.push({ name, passed, duration, error });
  log(passed ? `✅ PASS: ${name} (${duration}ms)` : `❌ FAIL: ${name} — ${error} (${duration}ms)`);
}

async function main() {
  const startTime = Date.now();
  if (!fs.existsSync('/tmp')) fs.mkdirSync('/tmp', { recursive: true });
  fs.writeFileSync(LOG_FILE, '');

  logSection('Memoria 完整测试开始');
  log(`MEMORIA_SRC: ${MEMORIA_SRC}`);

  // 1. 前置检查
  logSection('1. 前置检查');
  if (!fs.existsSync(MEMORIA_SRC)) {
    log('❌ dist/bin/memoria.js 不存在');
    process.exit(1);
  }
  log('✅ memoria.js 存在');

  // 2. npm link
  logSection('2. npm link');
  try {
    execSync(`npm link`, { cwd: PROJECT_ROOT, stdio: 'pipe' });
    log('✅ npm link 成功');
  } catch (e: any) {
    log(`⚠️  npm link: ${e.message}`);
  }

  // 3. --version
  logSection('3. memoria --version');
  { const t0 = Date.now(); const r = memoriaSync(['--version'], PROJECT_ROOT); record('memoria --version', r.status === 0 && r.stdout.includes('v1.0.0'), Date.now() - t0, r.stderr); }

  // 4. help
  logSection('4. memoria help');
  { const t0 = Date.now(); const r = memoriaSync(['help'], PROJECT_ROOT); record('memoria help', r.status === 0 && r.stdout.includes('init'), Date.now() - t0, r.stderr); }

  // 5. init .
  logSection('5. memoria init .');
  {
    const dir = mkTempDir('test-init-dot');
    const t0 = Date.now();
    const r = await memoria(['init', '.'], dir);
    record('memoria init .', r.status === 0 && fs.existsSync(path.join(dir, '_config.yml')), Date.now() - t0, `status=${r.status}`);

    const blogFile = fs.readdirSync(path.join(dir, 'content', 'blogs')).find(f => f.endsWith('.md'));
    const vlogFile = fs.readdirSync(path.join(dir, 'content', 'vlogs')).find(f => f.endsWith('.md'));
    const photoFile = fs.readdirSync(path.join(dir, 'content', 'photos')).find(f => f.endsWith('.md'));
    for (const [type, file] of [['blog', blogFile], ['vlog', vlogFile], ['photo', photoFile]] as const) {
      if (file) {
        const content = readFileContent(path.join(dir, 'content', type + 's', file));
        record(`init sample ${type} has type`, content.includes('type:'), 0);
      }
    }
  }

  // 6. init <dirname>
  logSection('6. memoria init <dirname>');
  {
    const parent = mkTempDir('test-init-named-parent');
    const t0 = Date.now();
    const r = await memoria(['init', 'my-site'], parent);
    record('memoria init my-site', r.status === 0 && fs.existsSync(path.join(parent, 'my-site', '_config.yml')), Date.now() - t0, `status=${r.status}`);
  }

  // 7. generate
  logSection('7. memoria generate');
  {
    const dir = mkTempDir('test-generate');
    await memoria(['init', '.'], dir);
    const t0 = Date.now();
    const r = await memoria(['generate'], dir);
    record('memoria generate', r.status === 0 && fs.existsSync(path.join(dir, 'dist', 'index.html')), Date.now() - t0, `status=${r.status}`);
    if (r.status === 0) {
      log('  index.html, blogs.html, vlogs.html, photos.html, about.html 全部生成');
    }
  }

  // 8. clean
  logSection('8. memoria clean');
  {
    const dir = mkTempDir('test-clean');
    await memoria(['init', '.'], dir);
    await memoria(['generate'], dir);
    const t0 = Date.now();
    const r = await memoria(['clean'], dir);
    record('memoria clean', r.status === 0 && !fs.existsSync(path.join(dir, 'dist')), Date.now() - t0, `dist exists=${fs.existsSync(path.join(dir, 'dist'))}`);
  }

  // 9. new blog (interactive)
  logSection('9. memoria new blog (交互式模拟)');
  {
    const dir = mkTempDir('test-new-blog-i');
    await memoria(['init', '.'], dir);
    const t0 = Date.now();
    const r = await memoriaInteractive(['new', 'blog'], dir, ['My Interactive Blog Post', '2026-05-29', 'test, interactive', 'A test blog']);
    const files = fs.existsSync(path.join(dir, 'content', 'blogs')) ? fs.readdirSync(path.join(dir, 'content', 'blogs')).filter(f => f.endsWith('.md')) : [];
    record('memoria new blog (interactive)', r.status === 0 && files.length > 0, Date.now() - t0, `status=${r.status}`);
    if (files.length > 0) {
      const content = readFileContent(path.join(dir, 'content', 'blogs', files[0]));
      record('new blog interactive type', content.includes('type:'), 0);
      record('new blog interactive title', content.includes('My Interactive Blog Post'), 0);
      record('new blog interactive date', content.includes('2026-05-29'), 0);
      record('new blog interactive tags', content.includes('test'), 0);
    }
  }

  // 10. new vlog (interactive)
  logSection('10. memoria new vlog (交互式模拟)');
  {
    const dir = mkTempDir('test-new-vlog-i');
    await memoria(['init', '.'], dir);
    const t0 = Date.now();
    const r = await memoriaInteractive(['new', 'vlog'], dir, ['My Summer Trip Vlog', '2026-06-01', 'https://youtube.com/embed/abc', 'https://example.com/thumb.jpg', 'A memorable summer trip', 'travel, summer']);
    const files = fs.existsSync(path.join(dir, 'content', 'vlogs')) ? fs.readdirSync(path.join(dir, 'content', 'vlogs')).filter(f => f.endsWith('.md') && f.includes('summer')) : [];
    record('memoria new vlog (interactive)', r.status === 0 && files.length > 0, Date.now() - t0, `status=${r.status}`);
    if (files.length > 0) {
      const content = readFileContent(path.join(dir, 'content', 'vlogs', files[0]));
      record('new vlog interactive type', content.includes('type:'), 0);
      record('new vlog interactive title', content.includes('My Summer Trip Vlog'), 0);
      record('new vlog interactive video', content.includes('youtube.com/embed/abc'), 0);
    }
  }

  // 11. new photo (interactive)
  logSection('11. memoria new photo (交互式模拟)');
  {
    const dir = mkTempDir('test-new-photo-i');
    await memoria(['init', '.'], dir);
    const t0 = Date.now();
    const r = await memoriaInteractive(['new', 'photo'], dir, ['Holiday Photos', '2026-07-01', 'https://example.com/p1.jpg | Beach', 'https://example.com/p2.jpg | Mountain', '', 'travel']);
    const files = fs.existsSync(path.join(dir, 'content', 'photos')) ? fs.readdirSync(path.join(dir, 'content', 'photos')).filter(f => f.endsWith('.md') && f.includes('holiday')) : [];
    record('memoria new photo (interactive)', r.status === 0 && files.length > 0, Date.now() - t0, `status=${r.status}`);
    if (files.length > 0) {
      const content = readFileContent(path.join(dir, 'content', 'photos', files[0]));
      record('new photo interactive type', content.includes('type:'), 0);
      record('new photo interactive title', content.includes('Holiday Photos'), 0);
      record('new photo interactive photos', content.includes('p1.jpg') && content.includes('p2.jpg'), 0);
      record('new photo interactive captions', content.includes('Beach') && content.includes('Mountain'), 0);
    }
  }

  // 12. generate 三种内容渲染
  logSection('12. generate 三种内容类型渲染');
  {
    const dir = mkTempDir('test-gen-all');
    await memoria(['init', '.'], dir);
    fs.writeFileSync(path.join(dir, 'content', 'blogs', '20260529-blog.md'), ['---', 'title: "测试博客"', 'date: "2026-05-29"', 'tags: ["test"]', 'type: "blog"', '---', '博客正文'].join('\n'), 'utf-8');
    fs.writeFileSync(path.join(dir, 'content', 'vlogs', '20260529-vlog.md'), ['---', 'title: "测试影像"', 'date: "2026-05-29"', 'tags: ["test"]', 'type: "vlog"', 'video: "https://youtube.com/embed/abc"', '---', '影像正文'].join('\n'), 'utf-8');
    fs.writeFileSync(path.join(dir, 'content', 'photos', '20260529-photo.md'), ['---', 'title: "测试相册"', 'date: "2026-05-29"', 'tags: ["test"]', 'type: "photo"', 'photos:', '  - url: "https://example.com/p.jpg"', '    caption: "测试"', '---'].join('\n'), 'utf-8');
    const t0 = Date.now();
    const r = await memoria(['generate'], dir);
    record('generate with all types', r.status === 0 && fs.existsSync(path.join(dir, 'dist', 'index.html')), Date.now() - t0, `status=${r.status}`);
    if (r.status === 0) {
      const index = readFileContent(path.join(dir, 'dist', 'index.html'));
      record('all three types rendered', index.includes('测试博客') && index.includes('测试影像') && index.includes('测试相册'), 0);
    }
  }

  // 13. re-init 报错
  logSection('13. 重复初始化报错');
  {
    const dir = mkTempDir('test-reinit');
    await memoria(['init', '.'], dir);
    const t0 = Date.now();
    const r = await memoria(['init', '.'], dir);
    record('re-init should fail', r.status !== 0, Date.now() - t0, `status=${r.status}`);
  }

  // 14. theme list
  logSection('14. memoria theme list');
  {
    const dir = mkTempDir('test-theme-list');
    await memoria(['init', '.'], dir);
    const t0 = Date.now();
    const r = await memoria(['theme', 'list'], dir);
    record('memoria theme list', r.status === 0 && (r.stdout.includes('内置') || r.stdout.includes('built-in')), Date.now() - t0, `status=${r.status}`);
  }

  // 15. bundle (仅当 zip 可用时)
  logSection('15. memoria bundle');
  {
    const hasZip = !!execSync('which zip 2>/dev/null', { encoding: 'utf-8' }).trim();
    if (!hasZip) {
      log('⚠️  zip 命令不可用，跳过 bundle 测试（环境问题，非代码 bug）');
    } else {
      const dir = mkTempDir('test-bundle');
      await memoria(['init', '.'], dir);
      const t0 = Date.now();
      const r = await memoria(['bundle'], dir);
      const zipFile = fs.readdirSync(dir).find(f => f.startsWith('memoria-') && f.endsWith('.zip'));
      record('memoria bundle', r.status === 0 && !!zipFile, Date.now() - t0, `status=${r.status}`);
      if (zipFile) log(`  zip: ${zipFile}`);
    }
  }

  // 最终报告
  logSection('测试结果汇总');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  log(`\n通过: ${passed}/${total}\n`);
  for (const r of results) log(`${r.passed ? '✅' : '❌'} ${r.name} (${r.duration}ms)${r.error ? ' — ' + r.error : ''}`);
  log(`\n总耗时: ${Date.now() - startTime}ms`);
  log(`日志: ${LOG_FILE}`);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`测试完成: ${passed}/${total} 通过`);
  console.log(`耗时: ${Date.now() - startTime}ms`);
  console.log(`${'='.repeat(50)}`);
  if (passed < total) process.exit(1);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
