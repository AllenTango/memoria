/**
 * lib/server-manager.ts
 * 预览服务器进程管理 — start/stop/isRunning
 * 状态通过回调实时通知上层
 */
import { createServer, Server } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';

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

      // 自动打开浏览器
      const openCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      exec(`${openCmd} http://localhost:${port}`, (err) => {
        // 自动打开浏览器失败，静默忽略，不污染 stdout
      });

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