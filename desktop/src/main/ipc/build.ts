/**
 * Build IPC Handler
 * Calls the Memoria compiler + renderer directly (not via execSync)
 */
import { ipcMain } from 'electron'
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, cpSync } from 'fs'
import { join, dirname } from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'
import { slugify, formatDate } from './render-utils'

// ── Types (mirrored from src/compiler.ts) ────────────────────────────────

interface CompiledItem {
  type: 'blog' | 'vlog' | 'photo'
  title: string
  date: string
  slug: string
  tags: string[]
  content: string
  description: string
  video: string
  thumbnail: string
  cover?: string
  photos: { url: string; caption: string }[]
}

interface BuildResult {
  success: boolean
  outputDir: string
  stats: { blogs: number; vlogs: number; photos: number; pages: number }
  error?: string
}

// ── Shared state ─────────────────────────────────────────────────────────

let lastBuildResult: BuildResult | null = null

// ── Compiler (lightweight inline, mirrors src/compiler.ts) ───────────────

function compileFile(filePath: string, type: 'blog' | 'vlog' | 'photo'): CompiledItem {
  const raw = readFileSync(filePath, 'utf-8')
  const { data: frontmatter, content: markdown } = matter(raw)
  const htmlContent = marked.parse(markdown) as string

  const title = frontmatter.title || filePath.split('/').pop()?.replace('.md', '') || ''
  const parsedDate = frontmatter.date ? new Date(frontmatter.date) : null
  const date = parsedDate && !isNaN(parsedDate.getTime())
    ? parsedDate.toISOString().split('T')[0]
    : '1970-01-01'

  return {
    type: (frontmatter.type as 'blog' | 'vlog' | 'photo') || type,
    title,
    date,
    slug: slugify(title),
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
    content: htmlContent,
    description: frontmatter.description || '',
    video: frontmatter.video || '',
    thumbnail: frontmatter.thumbnail || '',
    cover: frontmatter.cover || '',
    photos: Array.isArray(frontmatter.photos) ? frontmatter.photos : [],
  }
}

function scanDir(dir: string, type: 'blog' | 'vlog' | 'photo'): CompiledItem[] {
  if (!existsSync(dir)) return []
  const { readdirSync } = require('fs')
  return readdirSync(dir)
    .filter((f: string) => f.endsWith('.md'))
    .map((f: string) => compileFile(join(dir, f), type))
    .sort((a: CompiledItem, b: CompiledItem) =>
      (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0))
}

// ── Render (lightweight — minimum needed for page generation) ────────────

function renderIndexHtml(all: CompiledItem[], siteConfig: { name: string }): string {
  const byYear: Record<number, CompiledItem[]> = {}
  for (const item of all) {
    const year = new Date(item.date).getFullYear()
    if (!byYear[year]) byYear[year] = []
    byYear[year].push(item)
  }

  const statsHtml = `
    <div class="home-stats">
      <h1>${siteConfig.name}</h1>
      <div class="home-stats-grid">
        <div class="stat-card"><div class="stat-number">${all.filter(i => i.type === 'blog').length}</div><div class="stat-label">随笔</div></div>
        <div class="stat-card"><div class="stat-number">${all.filter(i => i.type === 'vlog').length}</div><div class="stat-label">影像</div></div>
        <div class="stat-card"><div class="stat-number">${all.filter(i => i.type === 'photo').length}</div><div class="stat-label">相册</div></div>
      </div>
    </div>`

  const itemsHtml = all.map(item => `
    <div class="home-item">
      <a href="/${item.type === 'blog' ? 'blog' : item.type === 'vlog' ? 'vlog' : 'photo'}/${slugify(item.title)}/">
        <h2>${item.title}</h2>
        <p>${formatDate(item.date)}</p>
      </a>
    </div>`).join('')

  return renderPage(`${siteConfig.name} — Memoria`, 'home', statsHtml + itemsHtml)
}

function renderPage(title: string, page: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="/layout.css">
  <link rel="stylesheet" href="/colors.css">
</head>
<body>
  <header class="site-header">
    <a href="/" class="nav-brand">Memoria</a>
    <nav class="nav-links">
      <a href="/" class="nav-link${page === 'home' ? ' active' : ''}">首页</a>
      <a href="/blogs.html" class="nav-link${page === 'blogs' ? ' active' : ''}">随笔</a>
      <a href="/vlogs.html" class="nav-link${page === 'vlogs' ? ' active' : ''}">影像</a>
      <a href="/photos.html" class="nav-link${page === 'photo' ? ' active' : ''}">相册</a>
    </nav>
  </header>
  <main class="main-content">${content}</main>
</body>
</html>`
}

// ── Build function ──────────────────────────────────────────────────────

function build(siteRoot: string): BuildResult {
  const contentDir = join(siteRoot, 'content')
  const outputDir = join(siteRoot, 'dist')

  // Compile all content
  const blogs = scanDir(join(contentDir, 'blogs'), 'blog')
  const vlogs = scanDir(join(contentDir, 'vlogs'), 'vlog')
  const photos = scanDir(join(contentDir, 'photos'), 'photo')
  const all = [...blogs, ...vlogs, ...photos].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  // Read config
  let siteName = 'Memoria'
  const configPath = join(siteRoot, '_config.yml')
  if (existsSync(configPath)) {
    const content = readFileSync(configPath, 'utf-8')
    const match = content.match(/name:\s*"?([^"\n]+)"?/)
    if (match) siteName = match[1]
  }

  // Ensure output dir
  mkdirSync(outputDir, { recursive: true })

  // Copy theme files
  const themeName = getCurrentTheme(siteRoot)
  const themeDir = findThemeDir(siteRoot, themeName)
  if (themeDir) {
    for (const css of ['layout.css', 'colors.css']) {
      const src = join(themeDir, css)
      if (existsSync(src)) copyFileSync(src, join(outputDir, css))
    }
  }

  // Copy public/
  const publicSrc = join(siteRoot, 'public')
  const publicDest = join(outputDir, 'public')
  if (existsSync(publicSrc)) {
    cpSync(publicSrc, publicDest, { recursive: true })
  }

  // Generate pages
  const siteConfig = { name: siteName }

  writeFileSync(join(outputDir, 'index.html'), renderIndexHtml(all, siteConfig))

  // Generate detail pages
  mkdirSync(join(outputDir, 'blog'), { recursive: true })
  mkdirSync(join(outputDir, 'vlog'), { recursive: true })
  mkdirSync(join(outputDir, 'photo'), { recursive: true })

  for (const item of all) {
    const dir = item.type === 'blog' ? 'blog' : item.type === 'vlog' ? 'vlog' : 'photo'
    const itemDir = join(outputDir, dir, item.slug)
    mkdirSync(itemDir, { recursive: true })

    const detailHtml = renderPage(
      `${item.title} — ${siteName}`,
      dir,
      `<h1>${item.title}</h1>
       <p>${formatDate(item.date)}</p>
       ${item.cover ? `<img src="${item.cover}" alt="">` : ''}
       <div class="prose">${item.content}</div>`
    )
    writeFileSync(join(itemDir, 'index.html'), detailHtml)
  }

  const pages = 4 // index + blogs + vlogs + photos
  const result: BuildResult = {
    success: true,
    outputDir,
    stats: { blogs: blogs.length, vlogs: vlogs.length, photos: photos.length, pages }
  }

  return result
}

function getCurrentTheme(siteRoot: string): string {
  const themercPath = join(siteRoot, '.themerc')
  if (existsSync(themercPath)) {
    return readFileSync(themercPath, 'utf-8').trim() || 'dracula'
  }
  return 'dracula'
}

function findThemeDir(siteRoot: string, themeName: string): string | null {
  // Check user themes first, then built-in themes
  const userPath = join(siteRoot, 'themes', themeName)
  if (existsSync(join(userPath, 'template.html'))) return userPath

  const builtInPath = join(__dirname, '..', '..', '..', '..', 'themes', themeName)
  if (existsSync(join(builtInPath, 'template.html'))) return builtInPath

  return null
}

// ── Register IPC ────────────────────────────────────────────────────────

export function registerBuildIpc(): void {
  ipcMain.handle('build:run', async (): Promise<BuildResult> => {
    const { getCurrentSitePath } = require('./site-state')
    const sitePath = getCurrentSitePath()
    if (!sitePath) {
      const result: BuildResult = {
        success: false,
        outputDir: '',
        stats: { blogs: 0, vlogs: 0, photos: 0, pages: 0 },
        error: 'No site is currently open'
      }
      return result
    }

    try {
      const result = build(sitePath)
      lastBuildResult = result
      return result
    } catch (err: any) {
      const result: BuildResult = {
        success: false,
        outputDir: '',
        stats: { blogs: 0, vlogs: 0, photos: 0, pages: 0 },
        error: err.message
      }
      lastBuildResult = result
      return result
    }
  })

  ipcMain.handle('build:getLastResult', async (): Promise<BuildResult | null> => {
    return lastBuildResult
  })
}
