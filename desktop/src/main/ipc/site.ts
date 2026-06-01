/**
 * Site Management IPC Handler
 */
import { ipcMain, dialog } from 'electron'
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, cpSync } from 'fs'
import { join, resolve, basename } from 'path'
import { homedir } from 'os'
import { getCurrentSitePath, setCurrentSitePath } from './site-state'

interface SiteInfo {
  name: string
  path: string
  lastOpened: string
  stats: { blogs: number; vlogs: number; photos: number }
}

// In-memory state
const recentSites: SiteInfo[] = []
const RECENT_FILE = join(appDataDir(), 'recent-sites.json')

function appDataDir(): string {
  const dir = join(homedir(), '.memoria')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function loadRecentSites(): void {
  try {
    if (existsSync(RECENT_FILE)) {
      const data = JSON.parse(readFileSync(RECENT_FILE, 'utf-8'))
      recentSites.length = 0
      recentSites.push(...data)
    }
  } catch { /* ignore corrupt file */ }
}

function saveRecentSites(): void {
  writeFileSync(RECENT_FILE, JSON.stringify(recentSites.slice(0, 20), null, 2), 'utf-8')
}

function countContent(sitePath: string): { blogs: number; vlogs: number; photos: number } {
  const count = (dir: string): number => {
    const d = join(sitePath, 'content', dir)
    if (!existsSync(d)) return 0
    return readdirSync(d).filter(f => f.endsWith('.md')).length
  }
  return {
    blogs: count('blogs'),
    vlogs: count('vlogs'),
    photos: count('photos')
  }
}

function isSiteDir(dir: string): boolean {
  return existsSync(join(dir, 'content')) && existsSync(join(dir, '_config.yml'))
}

export function registerSiteIpc(): void {
  loadRecentSites()

  // ── Create new site ──────────────────────────────────────────────
  ipcMain.handle('site:create', async (_event, name: string, targetPath: string): Promise<SiteInfo | null> => {
    try {
      const sitePath = resolve(targetPath)

      if (existsSync(sitePath)) {
        throw new Error(`Directory already exists: ${sitePath}`)
      }

      // Create directory structure
      mkdirSync(sitePath, { recursive: true })
      mkdirSync(join(sitePath, 'content', 'blogs'), { recursive: true })
      mkdirSync(join(sitePath, 'content', 'vlogs'), { recursive: true })
      mkdirSync(join(sitePath, 'content', 'photos'), { recursive: true })
      mkdirSync(join(sitePath, 'public', 'images'), { recursive: true })

      // Write _config.yml
      writeFileSync(join(sitePath, '_config.yml'),
        `name: "${name}"\nauthor: ""\nurl: ""\nicon: ""\n`, 'utf-8')

      // Write .themerc
      writeFileSync(join(sitePath, '.themerc'), 'dracula', 'utf-8')

      // Copy built-in themes (from the app package)
      const builtInThemes = join(__dirname, '..', '..', '..', '..', 'themes')
      if (existsSync(builtInThemes)) {
        cpSync(builtInThemes, join(sitePath, 'themes'), { recursive: true })
      }

      const info: SiteInfo = {
        name,
        path: sitePath,
        lastOpened: new Date().toISOString(),
        stats: { blogs: 0, vlogs: 0, photos: 0 }
      }

      setCurrentSitePath(sitePath)
      recentSites.unshift(info)
      saveRecentSites()

      return info
    } catch (err: any) {
      console.error('site:create error:', err)
      throw err
    }
  })

  // ── Open existing site ───────────────────────────────────────────
  ipcMain.handle('site:open', async (_event, targetPath: string): Promise<SiteInfo | null> => {
    const sitePath = resolve(targetPath)
    if (!isSiteDir(sitePath)) {
      throw new Error(`Not a valid Memoria site: ${sitePath}`)
    }

    // Read site name from _config.yml
    let name = basename(sitePath)
    try {
      const config = readFileSync(join(sitePath, '_config.yml'), 'utf-8')
      const match = config.match(/name:\s*"?([^"\n]+)"?/)
      if (match) name = match[1]
    } catch { /* use basename */ }

    const info: SiteInfo = {
      name,
      path: sitePath,
      lastOpened: new Date().toISOString(),
      stats: countContent(sitePath)
    }

    setCurrentSitePath(sitePath)

    // Move to front or add
    const idx = recentSites.findIndex(s => s.path === sitePath)
    if (idx >= 0) recentSites.splice(idx, 1)
    recentSites.unshift(info)
    saveRecentSites()

    return info
  })

  // ── List recent sites ────────────────────────────────────────────
  ipcMain.handle('site:listRecent', async (): Promise<SiteInfo[]> => {
    // Filter to ones that still exist
    return recentSites.filter(s => existsSync(s.path))
  })

  // ── Get current site ─────────────────────────────────────────────
  ipcMain.handle('site:getCurrent', async (): Promise<SiteInfo | null> => {
    const curPath = getCurrentSitePath()
    if (!curPath || !isSiteDir(curPath)) return null

    let name = basename(currentSitePath)
    try {
      const config = readFileSync(join(currentSitePath, '_config.yml'), 'utf-8')
      const match = config.match(/name:\s*"?([^"\n]+)"?/)
      if (match) name = match[1]
    } catch { /* */ }

    return {
      name,
      path: curPath,
      lastOpened: new Date().toISOString(),
      stats: countContent(curPath)
    }
  })

  // ── Close current site ───────────────────────────────────────────
  ipcMain.handle('site:close', async (): Promise<void> => {
    setCurrentSitePath(null)
  })

  // ── Dialog: open directory ───────────────────────────────────────
  ipcMain.handle('dialog:openDirectory', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择 Memoria 站点目录'
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // ── Dialog: open image ──────────────────────────────────────────
  ipcMain.handle('dialog:openImage', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'] }],
      title: '选择图片'
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // ── Site config ─────────────────────────────────────────────────
  ipcMain.handle('site:getConfig', async (): Promise<Record<string, string>> => {
    const cur = getCurrentSitePath()
    if (!cur) return {}
    const configPath = join(cur, '_config.yml')
    if (!existsSync(configPath)) return {}
    const content = readFileSync(configPath, 'utf-8')
    return {
      name: content.match(/name:\s*"?([^"\n]+)"?/)?.[1] || '',
      author: content.match(/author:\s*"?([^"\n]+)"?/)?.[1] || '',
      url: content.match(/url:\s*"?([^"\n]+)"?/)?.[1] || '',
      icon: content.match(/icon:\s*"?([^"\n]+)"?/)?.[1] || ''
    }
  })

  ipcMain.handle('site:saveConfig', async (_event, config: Record<string, string>): Promise<void> => {
    const cur = getCurrentSitePath()
    if (!cur) throw new Error('No site is currently open')
    const configPath = join(cur, '_config.yml')
    const content = [
      `name: "${config.name || ''}"`,
      `author: "${config.author || ''}"`,
      `url: "${config.url || ''}"`,
      `icon: "${config.icon || ''}"`
    ].join('\n') + '\n'
    writeFileSync(configPath, content, 'utf-8')
  })

  // ── Theme ────────────────────────────────────────────────────────
  ipcMain.handle('site:getTheme', async (): Promise<string> => {
    const cur = getCurrentSitePath()
    if (!cur) return 'dracula'
    const themercPath = join(cur, '.themerc')
    if (!existsSync(themercPath)) return 'dracula'
    return readFileSync(themercPath, 'utf-8').trim() || 'dracula'
  })

  ipcMain.handle('site:setTheme', async (_event, theme: string): Promise<void> => {
    const cur = getCurrentSitePath()
    if (!cur) throw new Error('No site is currently open')
    writeFileSync(join(cur, '.themerc'), theme, 'utf-8')
  })
}
