const fs = require('fs');
const path = require('path');

/**
 * Read file content safely
 * @param {string} filePath
 * @returns {string}
 */
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Write file content safely
 * @param {string} filePath
 * @param {string} content
 */
function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Ensure directory exists
 * @param {string} dirPath
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Recursively get all files matching extension
 * @param {string} dir
 * @param {string} ext
 * @returns {string[]}
 */
function getFilesRecursive(dir, ext) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getFilesRecursive(fullPath, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Convert a date string to a readable format
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Generate a slug from a string
 * @param {string} str
 * @returns {string}
 */
function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    // Replace spaces/hyphens/underscores with dash
    .replace(/[\s_-]+/g, '-')
    // Remove characters that are not alphanumerics, Chinese, or dash
    .replace(/[^\w\u4e00-\u9fff-]/g, '')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extract a summary/excerpt from HTML content
 * @param {string} html
 * @param {number} maxLength
 * @returns {string}
 */
function extractExcerpt(html, maxLength = 160) {
  // Remove HTML tags
  const text = html.replace(/<[^>]+>/g, '').trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '…';
}

module.exports = {
  readFile,
  writeFile,
  ensureDir,
  getFilesRecursive,
  formatDate,
  slugify,
  extractExcerpt,
};
