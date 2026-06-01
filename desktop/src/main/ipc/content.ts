/**
 * Content Management IPC Handler
 * Reads/writes Markdown files in content/{blogs,vlogs,photos}/
 */
import { ipcMain } from 'electron'
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, mkdirSync } from 'fs'
import { join, dirname, basename } from 'path'
import matter from 'gray-matter'
import { getCurrentSitePath as getSitePath } from './site-state'

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

// ── Helpers ─────────────────────────────────────────────────────────────

function getCurrentSitePath(): string {
  // We'll store the current site path via a simple module-level var
  // Set by site:open / site:create, cleared by site:close
  const p = getSitePath()
  if (!p) throw new Error('No site is currently open')
  return p
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '')
    .replace(/^-+|-+$/g, '')
}

function parseItem(filePath: string, type: 'blog' | 'vlog' | 'photo'): ContentItem {
  const raw = readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)

  return {
    path: filePath,
    type: (data.type as ContentItem['type']) || type,
    title: data.title || basename(filePath, '.md'),
    date: data.date || '1970-01-01',
    tags: Array.isArray(data.tags) ? data.tags : [],
    slug: slugify(data.title || basename(filePath, '.md')),
    description: data.description || '',
    content: content || '',
    video: data.video || '',
    thumbnail: data.thumbnail || '',
    cover: data.cover || '',
    photos: Array.isArray(data.photos) ? data.photos : []
  }
}

function generateFrontmatter(data: Partial<ContentItem>, markdown: string): string {
  const lines = ['---']
  if (data.title) lines.push(`title: "${data.title}"`)
  if (data.date) lines.push(`date: "${data.date}"`)
  if (data.type) lines.push(`type: "${data.type}"`)
  if (data.tags && data.tags.length > 0) {
    lines.push(`tags: [${data.tags.map(t => `"${t}"`).join(', ')}]`)
  } else {
    lines.push('tags: []')
  }
  if (data.description) lines.push(`description: "${data.description}"`)
  if (data.video) lines.push(`video: "${data.video}"`)
  if (data.thumbnail) lines.push(`thumbnail: "${data.thumbnail}"`)
  if (data.cover) lines.push(`cover: "${data.cover}"`)
  if (data.photos && data.photos.length > 0) {
    lines.push('photos:')
    for (const p of data.photos) {
      lines.push(`  - url: "${p.url}"`)
      lines.push(`    caption: "${p.caption}"`)
    }
  }
  lines.push('---')
  lines.push('')
  lines.push(markdown || '')
  return lines.join('\n')
}

// ── Register IPC handlers ──────────────────────────────────────────────

export function registerContentIpc(): void {
  // ── List content ────────────────────────────────────────────────
  ipcMain.handle('content:list', async (_event, type?: 'blog' | 'vlog' | 'photo'): Promise<ContentItem[]> => {
    const sitePath = getCurrentSitePath()
    const types = type ? [type] : ['blog', 'vlog', 'photo'] as const
    const results: ContentItem[] = []

    for (const t of types) {
      const dir = join(sitePath, 'content', `${t}s`)
      if (!existsSync(dir)) continue
      const files = readdirSync(dir).filter(f => f.endsWith('.md'))
      for (const file of files) {
        try {
          results.push(parseItem(join(dir, file), t))
        } catch { /* skip corrupt files */ }
      }
    }

    // Sort by date descending
    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return results
  })

  // ── Get single content item ─────────────────────────────────────
  ipcMain.handle('content:get', async (_event, filePath: string): Promise<ContentItem | null> => {
    if (!existsSync(filePath)) return null
    const typeMap: Record<string, 'blog' | 'vlog' | 'photo'> = {
      blogs: 'blog', vlogs: 'vlog', photos: 'photo'
    }
    const parent = basename(dirname(filePath))
    const type = typeMap[parent] || 'blog'
    return parseItem(filePath, type)
  })

  // ── Create content ──────────────────────────────────────────────
  ipcMain.handle('content:create', async (_event, type: 'blog' | 'vlog' | 'photo', data: Partial<ContentItem>): Promise<ContentItem> => {
    const sitePath = getCurrentSitePath()
    const date = data.date || new Date().toISOString().split('T')[0]
    const title = data.title || `Untitled ${type}`
    const slug = slugify(title)
    const filename = `${date.replace(/-/g, '')}-${slug}.md`
    const typeDir = type === 'blog' ? 'blogs' : type === 'vlog' ? 'vlogs' : 'photos'
    const filePath = join(sitePath, 'content', typeDir, filename)

    mkdirSync(dirname(filePath), { recursive: true })
    const markdown = data.content || ''
    const frontmatter = generateFrontmatter({ ...data, type, title, date }, markdown)
    writeFileSync(filePath, frontmatter, 'utf-8')

    return parseItem(filePath, type)
  })

  // ── Update content ──────────────────────────────────────────────
  ipcMain.handle('content:update', async (_event, filePath: string, data: Partial<ContentItem>): Promise<ContentItem> => {
    if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

    // Read existing frontmatter
    const raw = readFileSync(filePath, 'utf-8')
    const { data: existing, content: markdown } = matter(raw)

    // Merge: keep existing frontmatter, override with provided data
    const merged = { ...existing, ...data } as any

    // Rebuild frontmatter
    const newContent = generateFrontmatter(merged, data.content !== undefined ? data.content : markdown)
    writeFileSync(filePath, newContent, 'utf-8')

    const parent = basename(dirname(filePath))
    const typeMap: Record<string, 'blog' | 'vlog' | 'photo'> = {
      blogs: 'blog', vlogs: 'vlog', photos: 'photo'
    }
    return parseItem(filePath, typeMap[parent] || 'blog')
  })

  // ── Delete content ──────────────────────────────────────────────
  ipcMain.handle('content:delete', async (_event, filePath: string): Promise<boolean> => {
    if (!existsSync(filePath)) return false
    unlinkSync(filePath)
    return true
  })
}
