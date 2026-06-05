/**
 * lib/server-manager.ts
 * 预览服务器进程管理 — start/stop/isRunning
 * 状态通过回调实时通知上层
 */
import { createServer, Server } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { IS_WINDOWS } from './paths.js';

let httpServer: Server | null = null;
let serverPid: number | null = null;
let onStatusChange: ((running: boolean) => void) | null = null;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export function setStatusCallback(cb: (running: boolean) => void): void {
  onStatusChange = cb;
}

function notifyStatus(running: boolean): void {
  if (onStatusChange) onStatusChange(running);
}

export function isServerRunning(): boolean {
  return httpServer !== null;
}

export function startServer(
  rootDir: string,
  port = 3000,
  onLog?: (level: LogEntry['level'], message: string) => void
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    if (httpServer) {
      resolve();
      return;
    }

    // 先构建，确保 dist/ 最新
    onLog?.('info', '正在构建站点...');
    const { buildSite } = await import('./build.js');
    const result = buildSite({ rootDir });
    if (!result.success) {
      onLog?.('error', '构建失败: ' + result.errors.join(', '));
      reject(new Error('构建失败: ' + result.errors.join(', ')));
      return;
    }
    onLog?.('info', '构建完成，正在启动服务器...');

    const outputDir = result.outputDir;

    const server = createServer((req, res) => {
      let url = decodeURIComponent(req.url === '/' ? '/index.html' : req.url!);
      if (url.endsWith('/')) url = url.slice(0, -1);
      let filePath = path.join(outputDir, url);

      // 防止目录遍历
      if (!filePath.startsWith(outputDir)) {
        filePath = path.join(outputDir, 'index.html');
      }

      // 目录 → 找 index.html
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      } else if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        filePath = path.join(outputDir, 'index.html');
      }

      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'text/plain';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`端口 ${port} 已被占用，请先停止其他服务`));
      } else {
        reject(err);
      }
    });

    server.listen(port, () => {
      httpServer = server;
      serverPid = port;
      notifyStatus(true);

      // 自动打开浏览器(平台分支,失败静默)
      void openBrowser(`http://localhost:${port}`);

      resolve();
    });
  });
}

export function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!httpServer) {
      resolve();
      return;
    }

    httpServer.close(() => {
      httpServer = null;
      serverPid = null;
      notifyStatus(false);
      resolve();
    });
  });
}

/**
 * 执行指令并实时收集日志输出
 */
export function executeWithLogs(
  cmd: string,
  args: string[],
  cwd: string,
  onLog: (level: LogEntry['level'], message: string) => void
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    const decode = (buf: Buffer): string => {
      return buf.toString('utf-8').replace(/\r?\n/g, '\n');
    };

    child.stdout?.on('data', (data: Buffer) => {
      const lines = decode(data).split('\n').filter(l => l.trim());
      lines.forEach(line => onLog('info', line));
    });

    child.stderr?.on('data', (data: Buffer) => {
      const lines = decode(data).split('\n').filter(l => l.trim());
      lines.forEach(line => onLog('warn', line));
    });

    child.on('close', (code) => {
      resolve(code ?? 0);
    });

    child.on('error', (err) => {
      onLog('error', err.message);
      reject(err);
    });
  });
}

interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

/**
 * 跨平台打开 URL:
 * - Windows: `cmd /c start "" "<url>"`  — start 第一个参数是窗口标题,必须给空串
 * - macOS:   `open <url>`
 * - Linux:   `xdg-open <url>`
 * 失败一律静默,不要把 stderr 抛回 TUI(避免污染 ink 渲染层)
 */
function openBrowser(url: string): void {
  try {
    let cmd: string;
    let args: string[];
    if (IS_WINDOWS) {
      cmd = 'cmd';
      args = ['/c', 'start', '""', url];
    } else if (process.platform === 'darwin') {
      cmd = 'open';
      args = [url];
    } else {
      cmd = 'xdg-open';
      args = [url];
    }
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true, shell: false });
    child.on('error', () => { /* 静默 */ });
    child.unref();
  } catch {
    /* 静默 */
  }
}