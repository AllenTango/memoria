// 简单的 smoke test:验证 lib/paths.ts 在 Windows 下能正确解析
import { getHomeDir, getMemoriaDir, IS_WINDOWS, getDefaultEditor, getConfigFilePath, getRecentFilePath } from '../../lib/paths.ts';

console.log('=== 跨平台路径解析 ===');
console.log('platform       :', process.platform);
console.log('IS_WINDOWS     :', IS_WINDOWS);
console.log('getHomeDir()   :', getHomeDir());
console.log('getMemoriaDir():', getMemoriaDir());
console.log('getRecentFile  :', getRecentFilePath());
console.log('getConfigFile  :', getConfigFilePath());
console.log('getDefaultEditor:', getDefaultEditor());

if (IS_WINDOWS) {
  if (getHomeDir().includes('/home/dev')) {
    console.error('FAIL: Windows 上不应该退化成 /home/dev');
    process.exit(1);
  }
  if (getDefaultEditor() !== 'notepad') {
    console.error('FAIL: Windows 上默认编辑器应该是 notepad, 实际是', getDefaultEditor());
    process.exit(1);
  }
  console.log('PASS: Windows 路径解析正确');
} else {
  console.log('SKIP: 非 Windows 平台,跳过平台特定断言');
}
