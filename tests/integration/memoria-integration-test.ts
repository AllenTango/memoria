/**
 * Memoria 集成测试
 * 测试 Core 层和 Lib 层核心功能
 *
 * 注意：
 * - 使用 tsx 直接运行 TypeScript 源文件
 * - 所有 import 路径必须用 path.join(PROJECT_ROOT, 'lib/xxx.ts') 形式，
 *   不能用相对路径（tsx 的 import() 静态解析不走 node 模块逻辑）
 * - buildSite 需要 { rootDir: string } 对象参数
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const FIXTURES_DIR = path.join(PROJECT_ROOT, 'tests', 'fixtures');

// 辅助：将相对路径转换为绝对路径（避免 tsx import() 解析问题）
const lib = (f: string) => path.join(PROJECT_ROOT, 'lib', f);
const core = (f: string) => path.join(PROJECT_ROOT, 'core', f);

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

const LOG_FILE = path.join('/tmp', `memoria-test-${timestamp()}.log`);

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

function mkTempDir(name: string): string {
  const dir = path.join(FIXTURES_DIR, name);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  return dir;
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

  logSection('Memoria 集成测试开始');
  log(`PROJECT_ROOT: ${PROJECT_ROOT}`);

  // 前置检查
  logSection('1. 前置检查');
  const cliPath = path.join(PROJECT_ROOT, 'dist', 'cli.js');
  if (!fs.existsSync(cliPath)) {
    log(`❌ ${cliPath} 不存在，请先运行 npm run build`);
    process.exit(1);
  }
  log(`✅ dist/cli.js 存在`);

  // 2. CLI 帮助
  logSection('2. memoria --help');
  {
    const t0 = Date.now();
    try {
      const out = execSync(`node "${cliPath}" --help`, { cwd: PROJECT_ROOT, encoding: 'utf-8' });
      record('memoria --help', out.includes('Memoria'), Date.now() - t0, out.slice(0, 100));
    } catch (e: any) {
      record('memoria --help', false, Date.now() - t0, e.message);
    }
  }

  // 3. 站点手动初始化（复制模板）
  logSection('3. 站点模板复制');
  {
    const t0 = Date.now();
    try {
      const dir = mkTempDir('test-site');
      const templateDir = path.join(PROJECT_ROOT, 'template');
      execSync(`cp -r "${templateDir}/." "${dir}"`, { stdio: 'pipe' });
      const hasConfig = fs.existsSync(path.join(dir, '_config.yml'));
      const hasContent = fs.existsSync(path.join(dir, 'content'));
      record('站点模板复制', hasConfig && hasContent, Date.now() - t0,
        `config=${hasConfig} content=${hasContent}`);
    } catch (e: any) {
      record('站点模板复制', false, Date.now() - t0, e.message);
    }
  }

  // 4. buildSite 站点构建
  logSection('4. buildSite 站点构建');
  {
    const { buildSite } = await import(lib('build.ts')) as any;
    const dir = mkTempDir('test-build');
    const templateDir = path.join(PROJECT_ROOT, 'template');
    execSync(`cp -r "${templateDir}/." "${dir}"`, { stdio: 'pipe' });

    fs.mkdirSync(path.join(dir, 'content', 'blogs'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'content', 'blogs', '20260603-test.md'), [
      '---', 'title: "Test Blog Post"', 'date: "2026-06-03"',
      'tags: ["test"]', 'type: "blog"', 'description: "A test blog post"', '---',
      'This is test content.',
    ].join('\n'), 'utf-8');

    const t0 = Date.now();
    try {
      const result = buildSite({ rootDir: dir });
      const hasDist = fs.existsSync(path.join(dir, 'dist'));
      const hasIndex = fs.existsSync(path.join(dir, 'dist', 'index.html'));
      record('buildSite 生成 dist', result.success && hasDist && hasIndex, Date.now() - t0,
        `success=${result.success} dist=${hasDist} index=${hasIndex}`);
    } catch (e: any) {
      record('buildSite', false, Date.now() - t0, e.message);
    }
  }

  // 5. build 三种内容类型渲染
  logSection('5. buildSite 三种内容类型渲染');
  {
    const { buildSite } = await import(lib('build.ts')) as any;
    const dir = mkTempDir('test-gen-all');
    const templateDir = path.join(PROJECT_ROOT, 'template');
    execSync(`cp -r "${templateDir}/." "${dir}"`, { stdio: 'pipe' });

    fs.mkdirSync(path.join(dir, 'content', 'blogs'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'content', 'blogs', '20260603-blog.md'), [
      '---', 'title: "测试博客"', 'date: "2026-06-03"',
      'tags: ["test"]', 'type: "blog"', '---', '博客正文',
    ].join('\n'), 'utf-8');

    fs.mkdirSync(path.join(dir, 'content', 'vlogs'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'content', 'vlogs', '20260603-vlog.md'), [
      '---', 'title: "测试影像"', 'date: "2026-06-03"',
      'tags: ["test"]', 'type: "vlog"',
      'video: "https://youtube.com/embed/abc"', '---', '影像正文',
    ].join('\n'), 'utf-8');

    fs.mkdirSync(path.join(dir, 'content', 'photos'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'content', 'photos', '20260603-photo.md'), [
      '---', 'title: "测试相册"', 'date: "2026-06-03"',
      'tags: ["test"]', 'type: "photo"',
      'photos:', '  - url: "https://example.com/p.jpg"', '    caption: "测试图片"', '---',
    ].join('\n'), 'utf-8');

    const t0 = Date.now();
    try {
      const result = buildSite({ rootDir: dir });
      const index = readFileContent(path.join(dir, 'dist', 'index.html'));
      const pass = result.success &&
        index.includes('测试博客') &&
        index.includes('测试影像') &&
        index.includes('测试相册');
      record('三种内容类型渲染', pass, Date.now() - t0);
    } catch (e: any) {
      record('三种内容类型渲染', false, Date.now() - t0, e.message);
    }
  }

  // 6. server-manager
  logSection('6. server-manager 基础功能');
  {
    const { startServer, stopServer, isServerRunning } = await import(lib('server-manager.ts')) as any;
    const { buildSite } = await import(lib('build.ts')) as any;
    const dir = mkTempDir('test-server');
    const templateDir = path.join(PROJECT_ROOT, 'template');
    execSync(`cp -r "${templateDir}/." "${dir}"`, { stdio: 'pipe' });
    buildSite({ rootDir: dir });

    const t0 = Date.now();
    try {
      const port = 3999;
      await startServer(dir, port);
      const running = isServerRunning(port);
      record('startServer 启动', running, Date.now() - t0, `running=${running}`);
      await stopServer(port);
      const afterStop = isServerRunning(port);
      record('stopServer 停止', !afterStop, 0, `running=${afterStop}`);
    } catch (e: any) {
      record('server-manager', false, Date.now() - t0, e.message);
    }
  }

  // 7. core/compiler
  logSection('7. core/compiler 编译功能');
  {
    const { compileFile } = await import(core('compiler.ts')) as any;
    const dir = mkTempDir('test-compiler');
    const templateDir = path.join(PROJECT_ROOT, 'template');
    execSync(`cp -r "${templateDir}/." "${dir}"`, { stdio: 'pipe' });

    const blogPath = path.join(dir, 'content', 'blogs', '20260603-test.md');
    fs.writeFileSync(blogPath, [
      '---', 'title: "Compiler Test"', 'date: "2026-06-03"',
      'tags: ["test"]', 'type: "blog"', '---', 'Test content for compiler',
    ].join('\n'), 'utf-8');

    const t0 = Date.now();
    try {
      const result = compileFile(blogPath, 'blog');
      record('compileFile 解析 frontmatter', result.title === 'Compiler Test', Date.now() - t0,
        `title=${result.title}`);
      record('compileFile 解析 body', result.content?.includes('Test content'), 0);
    } catch (e: any) {
      record('compiler', false, Date.now() - t0, e.message);
    }
  }

  // 8. core/renderer
  logSection('8. core/renderer HTML 渲染');
  {
    const { renderIndex } = await import(core('renderer.ts')) as any;
    const minimalTemplate = [
      '<html><head><title>{{PAGE_TITLE}}</title></head><body>',
      '<h1>{{SITE_NAME}}</h1>',
      '<nav class="{{HOME_ACTIVE}}">Home</nav>',
      '<div class="{{BLOGS_ACTIVE}}">Blogs</div>',
      '<div class="{{VLOGS_ACTIVE}}">Vlogs</div>',
      '<div class="{{PHOTO_ACTIVE}}">Photos</div>',
      '<div class="{{ABOUT_ACTIVE}}">About</div>',
      '{{PAGE_CONTENT}}',
      '</body></html>',
    ].join('');
    try {
      const html = renderIndex(
        { blogs: [], vlogs: [], photos: [], all: [], siteConfig: { name: 'Test Site', icon: '' } },
        minimalTemplate
      );
      record('renderIndex 生成 HTML', typeof html === 'string' && html.includes('Test Site'), 0);
    } catch (e: any) {
      record('renderer', false, 0, e.message);
    }
  }

  // 9. lib/upgrade 主题同步
  logSection('9. upgrade 主题同步');
  {
    const { syncSite } = await import(lib('upgrade.ts')) as any;
    const dir = mkTempDir('test-upgrade');
    const templateDir = path.join(PROJECT_ROOT, 'template');
    execSync(`cp -r "${templateDir}/." "${dir}"`, { stdio: 'pipe' });
    const t0 = Date.now();
    try {
      await syncSite(dir);
      record('syncSite 主题同步', true, Date.now() - t0);
    } catch (e: any) {
      record('syncSite', false, Date.now() - t0, e.message);
    }
  }

  // 最终报告
  logSection('测试结果汇总');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  log(`\n通过: ${passed}/${total}\n`);
  for (const r of results) log(`${r.passed ? '✅' : '❌'} ${r.name} (${r.duration}ms)${r.error ? ' — ' + r.error : ''}`);
  log(`\n总耗时: ${Date.now() - startTime}ms`);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`测试完成: ${passed}/${total} 通过`);
  console.log(`耗时: ${Date.now() - startTime}ms`);
  console.log(`${'='.repeat(50)}`);
  if (passed < total) process.exit(1);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
