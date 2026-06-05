/**
 * Recent project management
 * Stores recently opened/created Memoria sites
 */
import * as path from 'path';
import * as fs from 'fs';
import { getMemoriaDir, getRecentFilePath } from './paths.js';

const MEMORIA_DIR = getMemoriaDir();
const RECENT_FILE = getRecentFilePath();

interface RecentEntry {
  root: string;
  name: string;
  lastOpened: number; // timestamp
}

function ensureMemoriaDir(): void {
  if (!fs.existsSync(MEMORIA_DIR)) {
    fs.mkdirSync(MEMORIA_DIR, { recursive: true });
  }
}

export function isMemoriaProject(dir: string): boolean {
  return fs.existsSync(path.join(dir, '.themerc')) ||
         fs.existsSync(path.join(dir, 'content')) ||
         fs.existsSync(path.join(dir, '.memoria'));
}

export function getProjectName(dir: string): string {
  const name = path.basename(dir);
  const pkgPath = path.join(dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) return pkg.name;
    } catch {}
  }
  return name;
}

export function getRecentProjects(): RecentEntry[] {
  ensureMemoriaDir();
  try {
    if (fs.existsSync(RECENT_FILE)) {
      const data = JSON.parse(fs.readFileSync(RECENT_FILE, 'utf-8'));
      return (Array.isArray(data) ? data : []).filter(e =>
        fs.existsSync(e.root) && isMemoriaProject(e.root)
      );
    }
  } catch {}
  return [];
}

export function addRecentProject(root: string): void {
  ensureMemoriaDir();
  const recents = getRecentProjects().filter(e => e.root !== root);
  recents.unshift({
    root,
    name: getProjectName(root),
    lastOpened: Date.now()
  });
  // Keep only last 10
  const trimmed = recents.slice(0, 10);
  fs.writeFileSync(RECENT_FILE, JSON.stringify(trimmed, null, 2));
}

export function clearRecentProjects(): void {
  ensureMemoriaDir();
  if (fs.existsSync(RECENT_FILE)) {
    fs.unlinkSync(RECENT_FILE);
  }
}
