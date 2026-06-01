/**
 * Shared site state — used across IPC handlers
 * Module-level singleton accessible by require
 */

let currentSitePath: string | null = null

export function setCurrentSitePath(path: string | null): void {
  currentSitePath = path
}

export function getCurrentSitePath(): string | null {
  return currentSitePath
}
