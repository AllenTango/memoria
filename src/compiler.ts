/**
 * Memoria Compiler — 读取 Markdown 文件，解析 frontmatter，输出结构化数据
 */
import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { slugify } from './utils';

export interface CompiledItem {
  type: 'blog' | 'vlog' | 'photo';
  title: string;
  date: string;
  slug: string;
  tags: string[];
  content: string;
  description: string;
  video: string;
  thumbnail: string;
  cover?: string;
  photos: { url: string; caption: string }[];
}

interface Frontmatter {
  title?: string;
  date?: string;
  type?: string;
  tags?: string[];
  description?: string;
  video?: string;
  thumbnail?: string;
  cover?: string;
  photos?: { url: string; caption: string }[];
}

/**
 * 解析单个 markdown 文件
 */
export function compileFile(filePath: string, type: 'blog' | 'vlog' | 'photo'): CompiledItem {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content: markdown } = matter(raw);
  const htmlContent = marked.parse(markdown) as string;

  const title = frontmatter.title || path.basename(filePath, '.md');
  const date = frontmatter.date
    ? new Date(frontmatter.date).toISOString().split('T')[0]
    : '1970-01-01';

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
  };
}

/**
 * 扫描指定目录，读取所有 .md 文件
 */
function scanDir(dir: string, type: 'blog' | 'vlog' | 'photo'): CompiledItem[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => compileFile(path.join(dir, f), type))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * 编译所有内容目录
 */
export interface CompiledContent {
  blogs: CompiledItem[];
  vlogs: CompiledItem[];
  photos: CompiledItem[];
  all: CompiledItem[];
}

export function compileAllContent(contentDir: string): CompiledContent {
  const blogs = scanDir(path.join(contentDir, 'blogs'), 'blog');
  const vlogs = scanDir(path.join(contentDir, 'vlogs'), 'vlog');
  const photos = scanDir(path.join(contentDir, 'photos'), 'photo');

  const all = [...blogs, ...vlogs, ...photos].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return { blogs, vlogs, photos, all };
}