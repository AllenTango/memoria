/**
 * Memoria Desktop — Electron Main Process
 */
import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { registerSiteIpc } from './ipc/site'
import { registerContentIpc } from './ipc/content'
import { registerBuildIpc } from './ipc/build'
import { registerPreviewIpc } from './ipc/preview'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: 'Memoria',
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  })

  // Graceful show after ready
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── App Lifecycle ──────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Register all IPC handlers
  registerSiteIpc()
  registerContentIpc()
  registerBuildIpc()
  registerPreviewIpc()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
