/**
 * Preview Server IPC Handler
 * Starts/stops a local HTTP server serving the built dist/
 */
import { ipcMain, BrowserWindow } from 'electron'
import { createServer, type Server } from 'http'
import { existsSync, createReadStream, statSync, readFileSync } from 'fs'
import { join, extname } from 'path'
import { watch } from 'fs'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

let server: Server | null = null
let serverPort: number = 0
let currentDistDir: string = ''
let watcherClose: (() => void) | null = null

function startServer(distDir: string, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    currentDistDir = distDir

    server = createServer((req, res) => {
      let filePath = join(distDir, req.url === '/' ? 'index.html' : req.url || 'index.html')

      // If path doesn't exist, try index.html (SPA-like fallback)
      if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        filePath = join(distDir, 'index.html')
      }

      const ext = extname(filePath)
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'

      try {
        res.writeHead(200, { 'Content-Type': contentType })
        createReadStream(filePath).pipe(res)
      } catch {
        res.writeHead(404)
        res.end('Not found')
      }
    })

    server.listen(port, () => {
      serverPort = (server?.address() as any)?.port || port
      resolve(serverPort)
    })

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Try next port
        server?.close()
        startServer(distDir, port + 1).then(resolve).catch(reject)
      } else {
        reject(err)
      }
    })
  })
}

function stopServer(): void {
  if (server) {
    server.close()
    server = null
  }
  if (watcherClose) {
    watcherClose()
    watcherClose = null
  }
}

function startWatcher(siteRoot: string): void {
  // Watch content directory for changes and notify renderer
  const contentDir = join(siteRoot, 'content')
  if (!existsSync(contentDir)) return

  const watcher = watch(contentDir, { recursive: true }, (_eventType, _filename) => {
    // Notify all windows that content changed
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('preview:changed')
    })
  })

  watcherClose = () => {
    watcher.close()
  }
}

export function registerPreviewIpc(): void {
  ipcMain.handle('preview:start', async (): Promise<{ port: number }> => {
    const { getCurrentSitePath } = require('./site-state')
    const sitePath = getCurrentSitePath()
    if (!sitePath) throw new Error('No site is currently open')

    const distDir = join(sitePath, 'dist')
    if (!existsSync(distDir)) {
      // Auto-build if dist doesn't exist
      const { build } = require('./build')
      try {
        // We need to trigger a build first
        throw new Error('Please build the site first (memoria build)')
      } catch {
        throw new Error('No dist directory found. Please build the site first.')
      }
    }

    // Stop existing server if any
    stopServer()

    const port = await startServer(distDir, 3000)
    startWatcher(sitePath)

    return { port }
  })

  ipcMain.handle('preview:stop', async (): Promise<void> => {
    stopServer()
  })

  ipcMain.handle('preview:getUrl', async (): Promise<string | null> => {
    if (!server) return null
    return `http://localhost:${serverPort}`
  })
}
