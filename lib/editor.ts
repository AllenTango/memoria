/**
 * lib/editor.ts
 * 系统编辑器调用封装
 * 优先级：MEMORIA_EDITOR → ~/.memoria/config.json defaultEditor → vim
 */
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const MEMORIA_DIR = path.join(process.env.HOME || '/home/dev', '.memoria');
const CONFIG_PATH = path.join(MEMORIA_DIR, 'config.json');

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
  return process.env.MEMORIA_EDITOR || getConfiguredEditor() || 'vim';
}

/**
 * 用系统编辑器打开文件，等待用户退出
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

    const child = spawn(bin, args, {
      stdio: 'inherit',
      env: process.env,
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
  const name = path.basename(editor.split(/\s+/)[0]);
  return name;
}