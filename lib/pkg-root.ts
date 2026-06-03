/**
 * lib/pkg-root.ts
 * 查找 memoria 包根目录
 */
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * 从任意路径向上遍历，查找包含 memoria package.json 的目录
 */
export function findPkgRoot(fromFile?: string): string {
  const __filename = fromFile ?? fileURLToPath(import.meta.url);
  let dir = path.dirname(__filename);
  for (let i = 0; i < 10; i++) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.name === 'memoria') return dir;
      } catch { /* ignore */ }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return dir;
}
