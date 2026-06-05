// Smoke test:验证 lib/recent.ts 在 Windows 下能正确读写 .memoria/recent.json
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

import {
  getRecentProjects,
  addRecentProject,
  clearRecentProjects,
  isMemoriaProject,
  getProjectName,
} from '../../lib/recent.ts';

// 用一个临时站点目录模拟"已打开的项目"
const tmpRoot = path.join(os.tmpdir(), `memoria-smoke-${process.pid}`);
fs.mkdirSync(path.join(tmpRoot, 'content'), { recursive: true });
fs.writeFileSync(path.join(tmpRoot, 'package.json'), JSON.stringify({ name: 'smoke-site' }), 'utf-8');

console.log('=== recent.ts smoke test ===');
console.log('tmp site root :', tmpRoot);
console.log('isMemoriaProject:', isMemoriaProject(tmpRoot));
console.log('getProjectName  :', getProjectName(tmpRoot));

// 先清空
clearRecentProjects();
const before = getRecentProjects();
console.log('initial recents:', before.length);

// 写入
addRecentProject(tmpRoot);
const after = getRecentProjects();
console.log('after add      :', after.length);
console.log('  - name       :', after[0]?.name);
console.log('  - root       :', after[0]?.root);

if (after.length !== 1) {
  console.error('FAIL: addRecentProject 之后应该有 1 条记录');
  process.exit(1);
}
if (after[0].name !== 'smoke-site') {
  console.error('FAIL: name 应该是 smoke-site, 实际是', after[0].name);
  process.exit(1);
}
if (!after[0].root.includes(tmpRoot)) {
  console.error('FAIL: root 路径错误, 实际是', after[0].root);
  process.exit(1);
}

console.log('PASS: lib/recent.ts 在 Windows 下能正确读写 .memoria/recent.json');

// 清理
clearRecentProjects();
fs.rmSync(tmpRoot, { recursive: true, force: true });
