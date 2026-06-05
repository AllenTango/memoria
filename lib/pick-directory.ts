/**
 * lib/pick-directory.ts
 * 跨平台"选择目录"对话框 — 用系统文件管理器让用户选择 folder
 *
 * 设计:
 * - 调一次弹出系统原生 dialog(user 视觉熟悉,操作直觉)
 * - 默认打开 initialPath(传 process.cwd() 通常系 memoria 调用嘅当前路径)
 * - 返回 string (user 选嘅 path) 或 null (cancel / 工具不可用)
 *
 * 平台分支 + fallback:
 *   - Windows: PowerShell + System.Windows.Forms.FolderBrowserDialog(内置 .NET,无外部依赖)
 *   - macOS:   osascript + Finder choose folder(系统自带,无外部依赖)
 *   - Linux:   zenity → kdialog → python3 tkinter(GUI 工具通常装在桌面环境)
 *     (任一成功即可,全部 fail 返回 null,UI 层提示用 CLI fallback)
 *
 * 错误处理:
 * - spawn 失败(工具未装):resolve(null) — 调用方处理 fallback
 * - user cancel(dialog 关咗):resolve(null) — 调用方处理
 * - 其他错误:reject — 调用方处理
 */
import { spawn } from 'child_process';
import { IS_WINDOWS, IS_MACOS, IS_LINUX } from './paths.js';

/**
 * 用系统文件管理器选个目录
 * @param initialPath 默认打开的路径(memoria 调用嘅当前路径 process.cwd() 系常见 default)
 * @returns 选中的 path,或 null 表示 user cancel / 工具不可用
 */
export function pickDirectory(initialPath: string): Promise<string | null> {
  if (IS_WINDOWS) return pickDirectoryWindows(initialPath);
  if (IS_MACOS) return pickDirectoryMac(initialPath);
  if (IS_LINUX) return pickDirectoryLinux(initialPath);
  return Promise.resolve(null);
}

// ── Windows: PowerShell + FolderBrowserDialog ────────────────────────

/**
 * Windows FolderBrowserDialog(原生 .NET,无需额外依赖)
 * 注意:
 * - Add-Type 喺每个进程首次调用时 compile .NET assembly(冷启动 ~200ms,后续缓存)
 * - 用 stdin 'ignore' 避免父进程 wait;用 stdout 'pipe' 拿 selected path
 * - shell:true(Windows 上 powershell 系 .exe,直接 spawn 可,但 cmd path 可能有 quirks)
 *   实际上 powershell.exe 系 .exe,直接 spawn OK,不用 shell:true
 * - User cancel: ShowDialog 返回 Cancel,无 Write-Output → stdout 为空 → 返回 null
 */
function pickDirectoryWindows(initialPath: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    // 转义 PowerShell 字符串中的单引号(用两个单引号)
    const escapedPath = initialPath.replace(/'/g, "''");
    const psScript = [
      'Add-Type -AssemblyName System.Windows.Forms | Out-Null',
      '$f = New-Object System.Windows.Forms.FolderBrowserDialog',
      '$f.Description = "选择 Memoria 项目目录"',
      `$f.SelectedPath = '${escapedPath}'`,
      '$f.ShowNewFolderButton = $false',
      'if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {',
      '  Write-Output $f.SelectedPath',
      '}',
    ].join('; ');

    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      psScript,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      // Windows 上 powershell.exe 路径可能有空格,直接 spawn OK(.exe 不需要 shell:true)
    });

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', d => { stdout += d.toString(); });
    child.stderr?.on('data', d => { stderr += d.toString(); });

    child.on('error', (err) => {
      // spawn 失败(Linux / macOS 误调等)— 唔 reject,resolve(null) 让 caller fallback
      resolve(null);
    });

    child.on('close', (code) => {
      // code 0: ShowDialog OK + Write-Output 路径
      // code 0: ShowDialog Cancel 无 Write-Output → stdout 空
      // code 1: 异常(罕见)
      const path = stdout.trim();
      if (path) {
        resolve(path);
      } else {
        // cancel 或异常
        resolve(null);
      }
    });
  });
}

// ── macOS: osascript + Finder choose folder ──────────────────────────

/**
 * macOS Finder choose folder dialog
 * - osascript 系系统自带 AppleScript runner
 * - tell application "Finder" to return POSIX path of (choose folder ...)
 *   → 返回 POSIX 风格 path
 * - choose folder 默认位置用 default location POSIX file "<path>"
 * - User cancel: osascript exit code 1 (User canceled.) — error output 含 "User canceled"
 *   → resolve(null) 唔 reject
 */
function pickDirectoryMac(initialPath: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    // AppleScript 字符串转义:双引号 + 反斜杠
    const escapedPath = initialPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const script = `tell application "Finder" to return POSIX path of (choose folder with prompt "选择 Memoria 项目目录" default location POSIX file "${escapedPath}")`;

    const child = spawn('osascript', ['-e', script], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', d => { stdout += d.toString(); });
    child.stderr?.on('data', d => { stderr += d.toString(); });

    child.on('error', () => {
      // osascript 唔存在(罕见)— resolve(null) fallback
      resolve(null);
    });

    child.on('close', (code) => {
      if (code === 0) {
        const path = stdout.trim();
        resolve(path || null);
      } else {
        // user cancel (code 1) 或其他 — 视作 cancel
        resolve(null);
      }
    });
  });
}

// ── Linux: zenity / kdialog / python3 fallback chain ──────────────────

/**
 * Linux pick directory 工具 fallback chain:
 * 1. zenity(GNOME 默认,大多数桌面环境)
 * 2. kdialog(KDE 默认)
 * 3. python3 + tkinter(几乎所有 Linux 发行版都有,虽然是 fallback 风格)
 *
 * 任一成功返回 string / null,caller 唔需要知道用咗边个
 * 全部 fail → resolve(null) — caller fallback 到 CLI 路径输入
 */
async function pickDirectoryLinux(initialPath: string): Promise<string | null> {
  // zenity
  const zenityResult = await tryZenity(initialPath);
  if (zenityResult !== undefined) return zenityResult; // null = cancel, string = selected

  // kdialog
  const kdialogResult = await tryKdialog(initialPath);
  if (kdialogResult !== undefined) return kdialogResult;

  // python3 + tkinter
  const tkResult = await tryPythonTkinter(initialPath);
  if (tkResult !== undefined) return tkResult;

  // 全部不可用
  return null;
}

/** 返回 string (selected) / null (cancel) / undefined (tool not available / error) */
function tryZenity(initialPath: string): Promise<string | null | undefined> {
  return new Promise((resolve) => {
    // zenity --file-selection --directory --filename=<path> --title=<title>
    const child = spawn('zenity', [
      '--file-selection',
      '--directory',
      `--filename=${initialPath}`,
      '--title=选择 Memoria 项目目录',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    child.stdout?.on('data', d => { stdout += d.toString(); });

    child.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        // zenity 未装
        resolve(undefined);
      } else {
        // 其他 spawn 错误 — 视作 tool 不可用,继续 fallback
        resolve(undefined);
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim() || null);
      } else if (code === 1) {
        // user cancel
        resolve(null);
      } else {
        // 其他退出码(罕见)— 视作 cancel
        resolve(null);
      }
    });
  });
}

/** kdialog 同样逻辑 */
function tryKdialog(initialPath: string): Promise<string | null | undefined> {
  return new Promise((resolve) => {
    const child = spawn('kdialog', [
      '--getexistingdirectory',
      initialPath,
      '--title', '选择 Memoria 项目目录',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    child.stdout?.on('data', d => { stdout += d.toString(); });

    child.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        resolve(undefined);
      } else {
        resolve(undefined);
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim() || null);
      } else {
        // kdialog 1 = user cancel, 其他 = error, 一律视作 cancel
        resolve(null);
      }
    });
  });
}

/** python3 + tkinter fallback(几乎所有 Linux 都有) */
function tryPythonTkinter(initialPath: string): Promise<string | null | undefined> {
  return new Promise((resolve) => {
    // 用 python3 内嵌 tkinter 弹 dialog,output 路径到 stdout
    // 注意:initialPath 喺 Python string 入面要 escape backslash + quote
    const escapedPath = initialPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
    const pyCode = `
import tkinter as tk
from tkinter import filedialog
try:
    root = tk.Tk()
    root.withdraw()
    path = filedialog.askdirectory(initialdir=r'${escapedPath}', title='选择 Memoria 项目目录', mustexist=True)
    if path:
        print(path)
    root.destroy()
except Exception as e:
    import sys
    print('ERROR:', e, file=sys.stderr)
    sys.exit(2)
`.trim();

    const child = spawn('python3', ['-c', pyCode], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', d => { stdout += d.toString(); });
    child.stderr?.on('data', d => { stderr += d.toString(); });

    child.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        // python3 未装
        resolve(undefined);
      } else {
        resolve(undefined);
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        const path = stdout.trim();
        resolve(path || null);
      } else {
        // user cancel (tkinter 弹 dialog 关咗返 0 if path selected,返非 0 if 其他)
        // 实际 tkinter askdirectory 返空 string if cancel,exit 0
        // 但系如果 tkinter 未 import / display 问题,exit 非 0
        resolve(null);
      }
    });
  });
}
