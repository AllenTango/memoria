/**
 * Memoria CLI 测试
 * 测试 TypeScript 重构后的 CLI 功能
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const MEMORIA_BIN = '/home/dev/.npm-global/bin/memoria';

function runMemoria(args: string[], cwd?: string): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execSync(`${MEMORIA_BIN} ${args.join(' ')}`, {
      cwd: cwd || process.cwd(),
      encoding: 'utf-8',
      timeout: 30000,
    });
    return { stdout, stderr: '', status: 0 };
  } catch (e: any) {
    return {
      stdout: e.stdout?.toString() || '',
      stderr: e.stderr?.toString() || '',
      status: e.status || 1,
    };
  }
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function logResult(testName: string, passed: boolean, details: string): void {
  const timestamp = getTimestamp();
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const logLine = `[${timestamp}] ${status} | ${testName} | ${details}\n`;
  const logFile = path.join(__dirname, 'logs', `test-results-${timestamp}.log`);
  
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  fs.writeFileSync(logFile, logLine, 'utf-8');
  console.log(logLine.trim());
}

describe('Memoria CLI Tests', () => {
  const testRoot = path.join(__dirname, 'fixtures');
  
  beforeAll(() => {
    // Ensure logs directory exists
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Verify memoria is accessible
    try {
      fs.accessSync(MEMORIA_BIN, fs.constants.X_OK);
    } catch {
      throw new Error(`memoria binary not executable at ${MEMORIA_BIN}`);
    }
  });

  describe('memoria --version', () => {
    it('should output v1.0.0', () => {
      const result = runMemoria(['--version']);
      logResult('memoria --version', result.stdout.trim() === 'v1.0.0', `Got: ${result.stdout.trim()}`);
      expect(result.stdout.trim()).toBe('v1.0.0');
    });
  });

  describe('memoria help', () => {
    it('should display help text', () => {
      const result = runMemoria(['help']);
      const hasCommands = result.stdout.includes('init') && result.stdout.includes('generate') && result.stdout.includes('server');
      logResult('memoria help', hasCommands, `Output length: ${result.stdout.length}`);
      expect(hasCommands).toBe(true);
    });
  });

  describe('memoria init .', () => {
    const initDir = path.join(testRoot, 'test-site-init');
    
    beforeEach(() => {
      // Clean up if exists
      if (fs.existsSync(initDir)) {
        fs.rmSync(initDir, { recursive: true, force: true });
      }
      fs.mkdirSync(initDir, { recursive: true });
    });

    afterEach(() => {
      // Clean up after test
      if (fs.existsSync(initDir)) {
        fs.rmSync(initDir, { recursive: true, force: true });
      }
    });

    it('should initialize a new site in the current directory', () => {
      // Run init in the empty directory
      const result = runMemoria(['init', '.'], initDir);
      
      logResult(
        'memoria init .',
        result.status === 0 && fs.existsSync(path.join(initDir, '_config.yml')) && fs.existsSync(path.join(initDir, 'content')),
        `Status: ${result.status}, _config.yml: ${fs.existsSync(path.join(initDir, '_config.yml'))}, content: ${fs.existsSync(path.join(initDir, 'content'))}`
      );

      // Should succeed
      expect(result.status).toBe(0);
      
      // Should create _config.yml
      expect(fs.existsSync(path.join(initDir, '_config.yml'))).toBe(true);
      
      // Should create content directory
      expect(fs.existsSync(path.join(initDir, 'content'))).toBe(true);
      
      // Should have blogs, vlogs, photos subdirectories
      expect(fs.existsSync(path.join(initDir, 'content', 'blogs'))).toBe(true);
      expect(fs.existsSync(path.join(initDir, 'content', 'vlogs'))).toBe(true);
      expect(fs.existsSync(path.join(initDir, 'content', 'photos'))).toBe(true);
    });

    it('should not re-initialize an existing site (should fail gracefully)', () => {
      // First init
      const result1 = runMemoria(['init', '.'], initDir);
      expect(result1.status).toBe(0);

      // Second init should fail (already has _config.yml)
      const result2 = runMemoria(['init', '.'], initDir);
      logResult(
        'memoria init . (re-init prevention)',
        result2.status !== 0 || result2.stderr.includes('already'),
        `Status: ${result2.status}`
      );
      // Should either fail or warn
      expect(result2.status !== 0 || result2.stdout.includes('already')).toBe(true);
    });
  });

  describe('memoria init <dirname>', () => {
    const parentDir = path.join(testRoot, 'test-init-parent');
    
    beforeEach(() => {
      if (fs.existsSync(parentDir)) {
        fs.rmSync(parentDir, { recursive: true, force: true });
      }
      fs.mkdirSync(parentDir, { recursive: true });
    });

    afterEach(() => {
      if (fs.existsSync(parentDir)) {
        fs.rmSync(parentDir, { recursive: true, force: true });
      }
    });

    it('should create a new site in a subdirectory', () => {
      const newDir = path.join(parentDir, 'my-blog');
      const result = runMemoria(['init', 'my-blog'], parentDir);
      
      logResult(
        'memoria init <dirname>',
        result.status === 0 && fs.existsSync(path.join(newDir, '_config.yml')),
        `Status: ${result.status}`
      );

      expect(result.status).toBe(0);
      expect(fs.existsSync(path.join(newDir, '_config.yml'))).toBe(true);
    });
  });

  describe('memoria (no args)', () => {
    it('should display help when run without arguments', () => {
      // Run from a non-site directory
      const tmpDir = path.join(testRoot, 'tmp-no-args-test');
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tmpDir, { recursive: true });

      try {
        const result = runMemoria([], tmpDir);
        // Should show help or error gracefully
        expect(result.status === 0 || result.stderr.includes('用法') || result.stderr.includes('Usage')).toBe(true);
        logResult('memoria (no args)', true, 'Displayed help or usage');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('Global command availability', () => {
    it('memoria should be in PATH', () => {
      try {
        const result = execSync('which memoria', { encoding: 'utf-8' });
        logResult('memoria in PATH', result.includes('memoria'), `Found at: ${result.trim()}`);
        expect(result.trim()).toContain('memoria');
      } catch {
        // Try npm-global path
        const npmGlobalBin = '/home/dev/.npm-global/bin/memoria';
        const exists = fs.existsSync(npmGlobalBin);
        logResult('memoria in PATH (npm-global)', exists, `Path: ${npmGlobalBin}`);
        expect(exists).toBe(true);
      }
    });
  });
});

// Cleanup function for afterAll
function cleanupFixtures(): void {
  const fixturesDir = path.join(__dirname, 'fixtures');
  if (fs.existsSync(fixturesDir)) {
    try {
      const entries = fs.readdirSync(fixturesDir);
      for (const entry of entries) {
        const fullPath = path.join(fixturesDir, entry);
        if (entry !== '.gitkeep') {
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      }
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  }
}

// Export for manual cleanup
export { cleanupFixtures };