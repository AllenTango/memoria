# 架构设计文档

本文档深入介绍 Memoria 的内部架构，面向希望深度定制的开发者。

---

## 整体架构

```
content/*.md          →  compiler.ts  →  结构化数据（JSON-like）
                                             ↓
                    themes/<name>/template.html
                                             ↓
themes/<name>/colors.css  ──────────────────┼──→  dist/*.html
themes/<name>/layout.css ──────────────────┘
public/                          ──────────→  dist/public/
```

**单次构建流程**：

1. `src/index.ts` 解析命令行主题参数，读取 `.themerc` 确定当前主题
2. `src/compiler.ts` 扫描 `content/blogs/`、`content/vlogs/`、`content/photos/`，解析每个 Markdown 文件的 frontmatter + 正文
3. `src/renderer.ts` 读取 `themes/<name>/template.html`，注入各页面的 HTML 内容，写入 `dist/`
4. 复制主题 CSS（`colors.css`、`layout.css`）和 `public/` 目录到 `dist/`

---

## 核心模块

### `src/compiler.ts`

**职责**：读取 Markdown 源文件，解析 frontmatter，将 Markdown 转为 HTML。

**关键函数**：

```javascript
// 扫描目录，返回该目录下所有 .md 文件的解析结果数组
scanDir(dir, type) → Item[]

// 编译单个文件
compileFile(filePath, type) → Item

// 汇总所有内容目录
compileAllContent(contentDir) → { blogs, vlogs, photos, all }
```

**Item 对象结构**：

```javascript
{
  type: 'blog' | 'vlog' | 'photo',
  title: string,          // frontmatter.title
  date: string,          // YYYY-MM-DD
  slug: string,          // slugify(title)，用于 URL
  tags: string[],
  content: string,      // Markdown → HTML 后的正文
  description: string,
  video: string,         // vlog 专用
  thumbnail: string,     // 缩略图
  photos: PhotoItem[],    // photo 专用
}
```

---

### `src/renderer.ts`

**职责**：生成各页面的 HTML 字符串。

**关键函数**：

| 函数 | 页面 |
|------|------|
| `renderIndex({ blogs, vlogs, photos, all })` | 首页（统计卡片 + 标签筛选 + 时间线列表） |
| `renderBlogs({ blogs })` | 博客列表页 |
| `renderVlogs({ vlogs })` | 视频列表页 |
| `renderPhotos({ photos })` | 相册列表页 |
| `renderAbout(aboutData)` | 关于页面 |
| `renderDetail(item, siblings)` | 博客 / 视频 / 相册详情页（根据 `item.type` 分发） |
| `renderTimelinePage({ items })` | 列表页和详情页共用的时间线布局 |

**模板变量替换**：

```javascript
applyTemplate(template, { title, page, content })
// title  → {{PAGE_TITLE}}
// page   → {{PAGE}}（'home'|'blogs'|'vlogs'|'photo'|'about'）
// content → {{PAGE_CONTENT}}
// 导航激活状态根据 page 替换 {{HOME_ACTIVE}} 等
```

---

### `src/utils.ts`

| 函数 | 作用 |
|------|------|
| `formatDate(dateStr)` | 转换为 `YYYY年MM月DD日` 格式 |
| `slugify(str)` | 生成 URL 安全 slug（中英文支持） |
| `extractExcerpt(html, maxLength)` | 从 HTML 中提取纯文本摘要 |
| `readFile(path)` | 读取文件 |
| `writeFile(path, content)` | 写入文件（自动创建父目录） |
| `ensureDir(dirPath)` | 确保目录存在 |

---

## 内容解析流程

```
raw Markdown (.md file)
        ↓
gray-matter 解析 frontmatter
        ↓
marked.parse() 转换正文 Markdown → HTML
        ↓
返回 Item 对象（title / date / tags / content / video / photos 等）
```

**gray-matter** 解析 frontmatter 示例：

```javascript
const { data, content } = matter(rawString);
// data    → { title, date, tags, ... }
// content → Markdown 正文（不含 frontmatter）
```

**marked** 转换正文：

```javascript
const htmlContent = marked.parse(markdownString);
```

---

## 主题加载机制

主题由 `src/index.ts` 决定：

```javascript
// 优先级：命令行参数 > .themerc 文件 > 默认值
const theme = process.argv.includes('--theme')
  ? process.argv[process.argv.indexOf('--theme') + 1]
  : (fs.existsSync('.themerc') ? readFile('.themerc') : 'dracula');
```

构建时将两个 CSS 文件复制到 `dist/`：

```javascript
fs.copyFileSync(`themes/${theme}/colors.css`, 'dist/colors.css');
fs.copyFileSync(`themes/${theme}/layout.css', 'dist/layout.css');
```

HTML 模板中引入顺序：**先 colors.css（变量定义），后 layout.css（使用变量）**：

```html
<link rel="stylesheet" href="/layout.css" />
<link rel="stylesheet" href="/colors.css" />
```

---

## 列表页时间线布局

列表页（博客 / 视频 / 相册）使用 `renderTimelinePage()` 渲染，按年份分组，年份内按日期降序排列。

**时间线交替布局**：每条记录在时间轴左右两侧交替显示（`data-side="left"` / `data-side="right"`）。

```javascript
// renderer.ts
function timelineEntry(item, side) {
  return side === 'left'
    ? `<div class="timeline-card-row">...</div><div class="timeline-connector"></div><div class="timeline-node">...</div>`
    : `<div class="timeline-node">...</div><div class="timeline-connector"></div><div class="timeline-card-row">...</div>`;
}
```

---

## 详情页渲染分发

`renderDetail()` 根据内容类型分发到不同渲染函数：

```javascript
function renderDetail(item, siblings, template) {
  if (item.type === 'photo') return renderPhotoDetail(...);
  if (item.type === 'vlog')  return renderVlogDetail(...);
  return renderBlogDetail(...);
}
```

---

## 本地资源处理

```
public/images/    →  dist/public/images/
public/videos/    →  dist/public/videos/
```

构建时使用 `fs.cpSync` 递归复制：

```javascript
fs.cpSync('public/', 'dist/public/', { recursive: true });
```

Markdown 中的引用路径直接使用 `/public/` 前缀，无需转换。

---

## 样式层叠顺序

页面 `<head>` 中加载顺序：

```html
<link rel="stylesheet" href="/layout.css" />      <!-- 1. 布局样式 -->
<link rel="stylesheet" href="/colors.css" />       <!-- 2. 配色变量 -->
<link rel="stylesheet" href="highlight.js.css" />  <!-- 3. 代码高亮 -->
```

`colors.css` 后加载可以覆盖 `layout.css` 中的部分变量引用。