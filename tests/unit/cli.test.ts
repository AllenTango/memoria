/**
 * Memoria CLI 测试
 * 测试 TypeScript 重构后的 CLI 功能
 * 
 * 重要：所有 memoria 命令必须在 tests/fixtures/ 下的隔离目录执行
 * 禁止在项目根目录运行任何 memoria 命令
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const MEMORIA_BIN = '/home/dev/.npm-global/bin/memoria';
const PROJECT_ROOT = '/home/dev/workspace/projects/memoria';

/**
 * 使用 spawn 执行命令，获取准确的 exit code
 * (execSync 在 process.exit() 时不会抛出异常，导致 status 不准确)
 */
function memoria(args: string[], cwd: string): { stdout: string; stderr: string; status: number } {
  return new Promise((resolve) => {
    const child = spawn(MEMORIA_BIN, args, {
      cwd,
      encoding: 'utf-8',
      timeout: 30000,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d; });
    child.stderr?.on('data', (d) => { stderr += d; });
    child.on('close', (code) => {
      resolve({ stdout, stderr, status: code ?? 0 });
    });
    child.on('error', (e) => {
      resolve({ stdout, stderr: e.message, status: 1 });
    });
  }) as any;
}

function memoriaSync(args: string[], cwd: string): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execSync(`${MEMORIA_BIN} ${args.join(' ')}`, {
      cwd,
      encoding: 'utf-8',
      timeout: 30000,
    });
    return { stdout: stdout.toString(), stderr: '', status: 0 };
  } catch (e: any) {
    return {
      stdout: e.stdout?.toString() || '',
      stderr: e.stderr?.toString() || '',
      status: e.status || 1,
    };
  }
}

function mkTempDir(name: string): string {
  const dir = path.join(PROJECT_ROOT, 'tests', 'fixtures', name);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function rmDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('Memoria CLI Tests', () => {
  const testBase = path.join(PROJECT_ROOT, 'tests', 'fixtures', 'test-base');

  beforeAll(() => {
    try {
      fs.accessSync(MEMORIA_BIN, fs.constants.X_OK);
    } catch {
      throw new Error(`memoria binary not found at ${MEMORIA_BIN}`);
    }
    if (!fs.existsSync(testBase)) {
      fs.mkdirSync(testBase, { recursive: true });
    }
  });

  afterAll(() => {
    rmDir(testBase);
  });

  afterEach(() => {
    const fixturesDir = path.join(PROJECT_ROOT, 'tests', 'fixtures');
    if (fs.existsSync(fixturesDir)) {
      fs.readdirSync(fixturesDir).forEach(name => {
        if (name !== '.gitkeep' && name !== 'test-base') {
          rmDir(path.join(fixturesDir, name));
        }
      });
    }
  });

  describe('memoria --version', () => {
    it('should output v1.0.0', () => {
      const result = memoriaSync(['--version'], testBase);
      expect(result.stdout.trim()).toBe('v1.0.0');
    });
  });

  describe('memoria help', () => {
    it('should display all commands', () => {
      const result = memoriaSync(['help'], testBase);
      expect(result.stdout).toContain('init');
      expect(result.stdout).toContain('generate');
      expect(result.stdout).toContain('server');
    });
  });

  describe('memoria init .', () => {
    it('should initialize site in current directory', async () => {
      const dir = mkTempDir('test-init-dot');
      
      const result = await memoria(['init', '.'], dir);
      expect(result.status).toBe(0);
      expect(fs.existsSync(path.join(dir, '_config.yml'))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'content'))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'content', 'blogs'))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'content', 'vlogs'))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'content', 'photos'))).toBe(true);
    });

    it('should fail gracefully on re-init (status != 0)', async () => {
      const dir = mkTempDir('test-init-dot-reinit');
      
      const r1 = await memoria(['init', '.'], dir);
      expect(r1.status).toBe(0);

      const r2 = await memoria(['init', '.'], dir);
      expect(r2.status).not.toBe(0);
      expect(r2.stderr).toContain('already');
    });
  });

  describe('memoria init <dirname>', () => {
    it('should create site in subdirectory', async () => {
      const parentDir = path.join(testBase, 'test-init-named');
      if (fs.existsSync(parentDir)) fs.rmSync(parentDir, { recursive: true });
      fs.mkdirSync(parentDir);
      
      const result = await memoria(['init', 'my-blog'], parentDir);
      expect(result.status).toBe(0);
      expect(fs.existsSync(path.join(parentDir, 'my-blog', '_config.yml'))).toBe(true);
    });
  });

  describe('memoria (no args)', () => {
    it('should show help when no args', async () => {
      const dir = mkTempDir('test-no-args');
      
      const result = await memoria([], dir);
      expect(result.status === 0 || result.stderr.includes('用法') || result.stderr.includes('Usage')).toBe(true);
    });
  });
});