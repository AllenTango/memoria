/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Exposed by preload via contextBridge
interface MemoriaAPI {
  site: {
    create: (name: string, path: string) => Promise<SiteInfo>
    open: (path: string) => Promise<SiteInfo | null>
    listRecent: () => Promise<SiteInfo[]>
    getCurrent: () => Promise<SiteInfo | null>
    close: () => Promise<void>
    getConfig: () => Promise<Record<string, string>>
    saveConfig: (config: Record<string, string>) => Promise<void>
    getTheme: () => Promise<string>
    setTheme: (theme: string) => Promise<void>
  }
  content: {
    list: (type?: 'blog' | 'vlog' | 'photo') => Promise<ContentItem[]>
    get: (filePath: string) => Promise<ContentItem | null>
    create: (type: 'blog' | 'vlog' | 'photo', data: Partial<ContentItem>) => Promise<ContentItem>
    update: (filePath: string, data: Partial<ContentItem>) => Promise<ContentItem>
    delete: (filePath: string) => Promise<boolean>
  }
  build: {
    run: () => Promise<BuildResult>
    getLastResult: () => Promise<BuildResult | null>
  }
  preview: {
    start: () => Promise<{ port: number }>
    stop: () => Promise<void>
    getUrl: () => Promise<string | null>
    onChange: (callback: () => void) => void
  }
  dialog: {
    openDirectory: () => Promise<string | null>
    openImage: () => Promise<string | null>
  }
}

interface SiteInfo {
  name: string
  path: string
  lastOpened: string
  stats: { blogs: number; vlogs: number; photos: number }
}

interface ContentItem {
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

interface BuildResult {
  success: boolean
  outputDir: string
  stats: { blogs: number; vlogs: number; photos: number; pages: number }
  error?: string
}

declare global {
  interface Window {
    memoriaAPI: MemoriaAPI
  }
}
