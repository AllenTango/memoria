/**
 * Memoria Desktop — Preload Script
 * Exposes safe APIs to the renderer via contextBridge
 */
import { contextBridge, ipcRenderer } from 'electron'

// ── Type definitions for exposed API ────────────────────────────────────

export interface SiteInfo {
  name: string
  path: string
  lastOpened: string
  stats: {
    blogs: number
    vlogs: number
    photos: number
  }
}

export interface ContentItem {
  path: string
  type: 'blog' | 'vlog' | 'photo'
  title: string
  date: string
  tags: string[]
  slug: string
  description: string
  content: string
  video?: string
  thumbnail?: string
  cover?: string
  photos?: { url: string; caption: string }[]
}

export interface BuildResult {
  success: boolean
  outputDir: string
  stats: {
    blogs: number
    vlogs: number
    photos: number
    pages: number
  }
  error?: string
}

// ── API surface ─────────────────────────────────────────────────────────

const api = {
  // ── Site Management ─────────────────────────────────────────────
  site: {
    /** Create a new Memoria site at the given path */
    create: (name: string, path: string): Promise<SiteInfo> =>
      ipcRenderer.invoke('site:create', name, path),

    /** Open an existing site directory */
    open: (path: string): Promise<SiteInfo | null> =>
      ipcRenderer.invoke('site:open', path),

    /** List recently opened sites */
    listRecent: (): Promise<SiteInfo[]> =>
      ipcRenderer.invoke('site:listRecent'),

    /** Get site info for the currently open site */
    getCurrent: (): Promise<SiteInfo | null> =>
      ipcRenderer.invoke('site:getCurrent'),

    /** Close the current site */
    close: (): Promise<void> =>
      ipcRenderer.invoke('site:close'),

    /** Get site config (_config.yml) */
    getConfig: (): Promise<Record<string, string>> =>
      ipcRenderer.invoke('site:getConfig'),

    /** Save site config */
    saveConfig: (config: Record<string, string>): Promise<void> =>
      ipcRenderer.invoke('site:saveConfig', config),

    /** Get current theme */
    getTheme: (): Promise<string> =>
      ipcRenderer.invoke('site:getTheme'),

    /** Set current theme */
    setTheme: (theme: string): Promise<void> =>
      ipcRenderer.invoke('site:setTheme', theme)
  },

  // ── Content Management ──────────────────────────────────────────
  content: {
    /** List all content items of a given type (or all types) */
    list: (type?: 'blog' | 'vlog' | 'photo'): Promise<ContentItem[]> =>
      ipcRenderer.invoke('content:list', type),

    /** Get a single content item */
    get: (filePath: string): Promise<ContentItem | null> =>
      ipcRenderer.invoke('content:get', filePath),

    /** Create a new content item */
    create: (type: 'blog' | 'vlog' | 'photo', data: Partial<ContentItem>): Promise<ContentItem> =>
      ipcRenderer.invoke('content:create', type, data),

    /** Update an existing content item */
    update: (filePath: string, data: Partial<ContentItem>): Promise<ContentItem> =>
      ipcRenderer.invoke('content:update', filePath, data),

    /** Delete a content item */
    delete: (filePath: string): Promise<boolean> =>
      ipcRenderer.invoke('content:delete', filePath)
  },

  // ── Build & Preview ────────────────────────────────────────────
  build: {
    /** Build the current site to dist/ */
    run: (): Promise<BuildResult> =>
      ipcRenderer.invoke('build:run'),

    /** Get last build result */
    getLastResult: (): Promise<BuildResult | null> =>
      ipcRenderer.invoke('build:getLastResult')
  },

  preview: {
    /** Start the preview server */
    start: (): Promise<{ port: number }> =>
      ipcRenderer.invoke('preview:start'),

    /** Stop the preview server */
    stop: (): Promise<void> =>
      ipcRenderer.invoke('preview:stop'),

    /** Get the preview server URL */
    getUrl: (): Promise<string | null> =>
      ipcRenderer.invoke('preview:getUrl'),

    /** Notify renderer of content change (auto-rebuild + refresh) */
    onChange: (callback: () => void): void => {
      ipcRenderer.on('preview:changed', () => callback())
    }
  },

  // ── Dialog helpers ──────────────────────────────────────────────
  dialog: {
    /** Open a directory picker */
    openDirectory: (): Promise<string | null> =>
      ipcRenderer.invoke('dialog:openDirectory'),

    /** Open a file picker for images */
    openImage: (): Promise<string | null> =>
      ipcRenderer.invoke('dialog:openImage')
  }
}

// Expose to renderer via window.memoriaAPI
contextBridge.exposeInMainWorld('memoriaAPI', api)

export type MemoriaAPI = typeof api
