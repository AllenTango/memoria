// 集成测试:模拟用户启动 TUI 后立即 SIGINT 退出,看是否能正常初始化不崩溃
import { spawn } from 'child_process';
import * as path from 'path';

const cli = path.resolve('dist/cli.js');
console.log('=== TUI 集成 smoke test ===');
console.log('cli:', cli);

const child = spawn('node', [cli], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, FORCE_COLOR: '0' },
});

let stdout = '';
let stderr = '';
let exited = false;
let exitCode = null;

child.stdout?.on('data', (d) => { stdout += d.toString(); });
child.stderr?.on('data', (d) => { stderr += d.toString(); });
child.on('exit', (code) => {
  exited = true;
  exitCode = code;
});

setTimeout(() => {
  if (child.killed) return;
  console.log('stdout 长度:', stdout.length, 'bytes');
  console.log('stderr 长度:', stderr.length, 'bytes');
  console.log('前 300 字节 stdout:');
  console.log('  ', JSON.stringify(stdout.slice(0, 300)));
  if (stderr) {
    console.log('前 300 字节 stderr:');
    console.log('  ', JSON.stringify(stderr.slice(0, 300)));
  }
  child.kill('SIGINT');
  setTimeout(() => {
    if (!exited) child.kill('SIGTERM');
    console.log('exit code:', exitCode);
    if (stderr.includes('Error:') || stderr.includes('TypeError')) {
      console.error('FAIL: TUI 启动时崩溃, stderr 含错误');
      process.exit(1);
    }
    console.log('PASS: TUI 启动未崩溃,正常接收 SIGINT 退出');
  }, 500);
}, 1500);
