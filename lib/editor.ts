/**
 * lib/editor.ts
 * 系统编辑器调用封装
 * 优先级：MEMORIA_EDITOR → ~/.memoria/config.json defaultEditor → 平台默认
 */
import { spawn } from 'child_process';
import * as fs from 'fs';
import { getConfigFilePath, getDefaultEditor, IS_WINDOWS } from './paths.js';

const CONFIG_PATH = getConfigFilePath();

export interface EditorConfig {
  editor: string;
}

function getConfiguredEditor(): string | null {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      if (config.defaultEditor && typeof config.defaultEditor === 'string') {
        return config.defaultEditor;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function getEditor(): string {
  return process.env.MEMORIA_EDITOR || getConfiguredEditor() || getDefaultEditor();
}

/**
 * 用系统编辑器打开文件,等待用户退出
 * @param filePath 绝对路径
 * @returns Promise 退出码
 */
export function openInEditor(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      reject(new Error(`文件不存在: ${filePath}`));
      return;
    }

    const editor = getEditor();
    const parts = editor.split(/\s+/);
    const bin = parts[0];
    const args = [...parts.slice(1), filePath];

    // Windows: spawn .cmd / .bat 之类的内置命令时必须 shell:true,否则 ENOENT
    // 同时 stdio:'inherit' 配合 'ignore' 会让 Ink 渲染层被编辑器事件冲掉,
    // 所以这里:Windows 用 detached+ignore,Unix 维持 inherit。
    const useShell = IS_WINDOWS && /\.(cmd|bat)$/i.test(bin);

    const child = spawn(bin, args, {
      stdio: 'inherit',
      env: process.env,
      shell: useShell,
      // detached: true 让子进程不阻塞父进程,Notepad/Code 之类 GUI 也能正常退
      // (Unix 下 detached 不会留下 zombie;Windows 同样安全)
      ...(IS_WINDOWS ? { windowsHide: false } : {}),
    });

    child.on('error', (err) => {
      reject(new Error(`无法启动编辑器 "${bin}": ${err.message}`));
    });

    child.on('close', (code) => {
      resolve(code ?? 0);
    });
  });
}

export function getEditorDisplayName(): string {
  const editor = getEditor();
  const name = editor.split(/\s+/)[0];
  // Windows: 去掉 .exe / .cmd 后缀,显示更友好
  return name.replace(/\.(exe|cmd|bat)$/i, '').split(/[\\/]/).pop() || name;
}

/**
 * 用系统默认应用打开目录
 * @param dirPath 绝对路径
 */
export function openDir(dirPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dirPath)) {
      reject(new Error(`目录不存在: ${dirPath}`));
      return;
    }

    // 平台分支:
    // - Windows: explorer (内置)
    // - macOS:   open
    // - Linux:   xdg-open
    let opener: string;
    let args: string[] = [dirPath];
    let useShell = false;
    if (IS_WINDOWS) {
      opener = 'explorer';
      // explorer 接受逗号分隔多个参数,不会与逗号冲突
    } else if (process.platform === 'darwin') {
      opener = 'open';
    } else {
      opener = 'xdg-open';
    }

    // explorer.exe 是个特殊进程:启动后立即返回,我们不关心它的退出码
    // detached + unref 避免 Node 等待 explorer
    const child = spawn(opener, args, {
      stdio: 'ignore',
      detached: true,
      shell: useShell,
    });

    child.on('error', (err) => {
      reject(new Error(`无法打开目录: ${err.message}`));
    });

    child.on('spawn', () => {
      // explorer / xdg-open 启动成功即可
      child.unref();
      resolve();
    });

    // 部分平台 spawn 事件不一定触发,设置一个 200ms 兜底
    setTimeout(() => resolve(), 200);
  });
}
