/**
 * lib/paths.ts
 * 跨平台路径与用户目录解析
 *
 * 背景:
 * - `process.env.HOME` 在 Linux/macOS 存在,在 Windows 上不存在
 * - Windows 上 home 目录是 `process.env.USERPROFILE`,或 `HOMEDRIVE+HOMEPATH`
 * - 旧代码用 `process.env.HOME || '/home/dev'` → Windows 上退化成不存在的 Linux 路径
 *   导致 .memoria 目录创建失败,最近项目/编辑器配置无法读写
 */
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

/** 跨平台 home 目录,任何平台都不会返回 Linux 风格的回退 */
export function getHomeDir(): string {
  // 优先:Windows 用 USERPROFILE,POSIX 用 HOME
  const home = process.env.USERPROFILE || process.env.HOME;
  if (home && home.length > 0) return home;

  // 次选:Node 自带 os.homedir()(会处理各种边界情况,Win/Linux/macOS 都正确)
  try {
    const h = os.homedir();
    if (h && h.length > 0) return h;
  } catch {
    // 继续往下走
  }

  // 最后兜底:当前工作目录
  return process.cwd();
}

/** .memoria 配置目录 */
export function getMemoriaDir(): string {
  return path.join(getHomeDir(), '.memoria');
}

/** .memoria/recent.json 路径 */
export function getRecentFilePath(): string {
  return path.join(getMemoriaDir(), 'recent.json');
}

/** .memoria/config.json 路径(编辑器配置) */
export function getConfigFilePath(): string {
  return path.join(getMemoriaDir(), 'config.json');
}

/** 平台判断 */
export const IS_WINDOWS = process.platform === 'win32';
export const IS_MACOS = process.platform === 'darwin';
export const IS_LINUX = process.platform === 'linux';

/**
 * 定位 memoria 包根目录(包含 package.json 且 name==='memoria' 的目录)
 *
 * 兼容三种安装方式:
 * 1. 全局安装: <prefix>/node_modules/memoria/dist/cli.js
 * 2. dev link:  <project>/node_modules/memoria → dist/cli.js
 * 3. 开发态:    dist/cli.js 在仓库根的 dist/ 下
 *
 * 旧实现用 `dirname(dirname(SELF))/lib/node_modules/memoria` 只能匹配场景 2,
 * 全局安装下 SELF 上溯两级是 <prefix>,再拼 lib/node_modules/memoria 就错位了
 * (Windows: C:\Users\X\AppData\Roaming\npm\lib\node_modules\memoria — 找不到)。
 */
export function findPkgRoot(start: string = process.cwd()): string {
  let cur = start;
  for (let i = 0; i < 10; i++) {
    const pkgPath = path.join(cur, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.name === 'memoria') return cur;
      } catch { /* ignore */ }
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  // fallback: 用 start 上溯两级(老逻辑兜底)
  return path.resolve(start, '..', '..');
}

/** 当前平台的默认文本编辑器 */
export function getDefaultEditor(): string {
  if (IS_WINDOWS) return 'notepad';
  if (IS_MACOS) return 'open -t';
  return 'vim';
}
