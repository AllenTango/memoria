/**
 * Memoria Compiler — 读取 Markdown 文件，解析 frontmatter，输出结构化数据
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const { slugify } = require('./utils');

/**
 * 解析单个 markdown 文件
 * @param {string} filePath — 完整文件路径
 * @param {string} type — 'blog' | 'vlog' | 'photo'
 */
function compileFile(filePath, type) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content: markdown } = matter(raw);
  const htmlContent = marked.parse(markdown);

  const title = frontmatter.title || path.basename(filePath, '.md');
  const date = frontmatter.date
    ? new Date(frontmatter.date).toISOString().split('T')[0]
    : '1970-01-01';

  return {
    type: frontmatter.type || type || 'blog',
    title,
    date,
    slug: slugify(title),
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
    content: htmlContent,
    description: frontmatter.description || '',
    video: frontmatter.video || '',
    thumbnail: frontmatter.thumbnail || '',
    photos: Array.isArray(frontmatter.photos) ? frontmatter.photos : [],
  };
}

/**
 * 扫描指定目录，读取所有 .md 文件
 * @param {string} dir — 目录路径
 * @param {string} type — 默认类型
 */
function scanDir(dir, type) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => compileFile(path.join(dir, f), type))
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // 最新的在前
}

/**
 * 编译所有内容目录
 * @param {string} contentDir
 */
function compileAllContent(contentDir) {
  const blogs = scanDir(path.join(contentDir, 'blogs'), 'blog');
  const vlogs = scanDir(path.join(contentDir, 'vlogs'), 'vlog');
  const photos = scanDir(path.join(contentDir, 'photos'), 'photo');

  // all: 统一时间线数据
  const all = [...blogs, ...vlogs, ...photos].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  return { blogs, vlogs, photos, all };
}

module.exports = { compileAllContent };
