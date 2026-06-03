/**
 * Content creation — side effects for blog/vlog/photo content files
 */
import * as path from 'path';
import * as fs from 'fs';

export type ContentType = 'blog' | 'vlog' | 'photo';

export interface CreateContentResult {
  success: boolean;
  path?: string;
  error?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildFrontmatter(ct: ContentType, titleText: string, dateStr: string): string {
  if (ct === 'blog') {
    return ['---', `title: "${titleText}"`, `date: "${dateStr}"`, 'tags: []', 'type: "blog"', 'description: ""', '---', '', ''].join('\n');
  } else if (ct === 'vlog') {
    return ['---', `title: "${titleText}"`, `date: "${dateStr}"`, 'tags: []', 'type: "vlog"', 'video: ""', 'thumbnail: ""', 'description: ""', '---', '', ''].join('\n');
  }
  return ['---', `title: "${titleText}"`, `date: "${dateStr}"`, 'tags: []', 'type: "photo"', 'photos: []', 'description: ""', '---', '', ''].join('\n');
}

/**
 * Create a new blog/vlog/photo content file.
 * Returns result with path on success, or error message on failure.
 */
export function createContent(
  projectRoot: string,
  type: ContentType,
  title: string
): CreateContentResult {
  try {
    const date = new Date().toISOString().split('T')[0];
    const content = buildFrontmatter(type, title.trim(), date);
    const typeMap: Record<ContentType, string> = { blog: 'blogs', vlog: 'vlogs', photo: 'photos' };
    const dir = path.join(projectRoot, 'content', typeMap[type]);
    const slug = slugify(title.trim());
    const filename = `${date.replace(/-/g, '')}-${slug}.md`;
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Check if a directory is empty (no files other than .dotfiles).
 */
export function isEmptyDir(dir: string): boolean {
  if (!fs.existsSync(dir)) return true;
  const entries = fs.readdirSync(dir);
  return entries.filter(e => !e.startsWith('.')).length === 0;
}