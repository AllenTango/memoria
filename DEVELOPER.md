# DEVELOPER.md

本文档面向想要深入了解或扩展 Memoria 的开发者。

---

## 项目架构

```
memoria/
├── memoria-core/          # 核心引擎（主题 + 渲染逻辑）
│   ├── src/               # 构建入口、编译器、渲染器、工具函数
│   ├── themes/dracula/    # 默认主题（暗黑紫）
│   └── package.json
├── memoria-cli/           # CLI 工具
│   ├── bin/               # 命令行入口
│   ├── lib/               # CLI 实现逻辑
│   ├── assets/site-template/  # init 时复制的站点模板
│   │   ├── _config.yml
│   │   ├── package.json
│   │   ├── content/
│   │   └── themes/        # 可选主题（mint, nord, peach）
│   └── package.json
├── scripts/               # 开发辅助脚本
│   ├── test-site/         # 集成测试用站点
│   │   ├── _config.yml
│   │   ├── package.json
│   │   └── content/       # 测试内容
│   ├── test-theme.sh      # 主题结构验证脚本
│   └── smoke-test.sh      # 冒烟测试脚本
├── docs/                  # 项目文档
├── .github/               # GitHub Actions CI 配置
├── DEVELOPER.md           # 本文档（开发者文档）
└── README.md              # 项目入口说明（使用者视角）
```

### 核心流程

```
src/index.js（入口）
  → src/compiler.js（扫描 content/，解析 Markdown + frontmatter）
  → src/renderer.js（读取 theme/template.html，注入数据，输出 HTML）
  → dist/*.html + dist/colors.css + dist/layout.css + dist/public/
```

---

## 主题系统原理

### 双层 CSS 结构

每个主题采用**双层 CSS 结构**：

1. **`colors.css`** — 定义所有 CSS Custom Properties 变量，分两层：
   - **主题原生变量**：`--dracula-background`、`--nord-bg` 等，值即为色值
   - **语义别名**：`--color-bg`、`--color-accent` 等，值指向前者

2. **`layout.css`** — 组件样式，**不直接写颜色值**，统一使用 `colors.css` 中定义的语义别名

这样做的好处：**换主题只需替换 `colors.css`，`layout.css` 完全不用改**。

### colors.css 结构示例

```css
/* ── Dracula Color Variables ─────────────────────────── */
:root {
  /* ① 主题原生变量 */
  --dracula-background:  #282a36;
  --dracula-foreground:  #f8f8f2;
  --dracula-purple:      #bd93f9;
  --dracula-cyan:        #8be9fd;
  /* ... */

  /* ② 语义别名（layout.css 使用这些） */
  --color-bg:           var(--dracula-background);
  --color-text:         var(--dracula-foreground);
  --color-accent:       var(--dracula-purple);
  --color-link:         var(--dracula-cyan);
  --color-border:       var(--dracula-current-line);
  --color-nav-bg:       rgba(40, 42, 54, 0.95);
  --color-nav-mobile:   rgba(40, 42, 54, 0.97);
  /* ... */
}
```

### 语义变量完整列表

| 变量 | 用途 |
|------|------|
| `--color-bg` | 页面主背景 |
| `--color-surface` | 卡片 / 面板背景 |
| `--color-text` | 主文字颜色 |
| `--color-text-muted` | 次要文字 / 注释 |
| `--color-accent` | 主强调色（链接 / hover / 边框） |
| `--color-accent-warm` | 暖调强调（代码 / 日期 / 描述） |
| `--color-accent-cool` | 冷调强调（备用） |
| `--color-accent-pink` | 粉色（品牌 / 特殊） |
| `--color-accent-green` | 成功提示 |
| `--color-accent-red` | 错误提示 |
| `--color-heading` | 标题 / strong 文字颜色 |
| `--color-border` | 分割线 / 边框 |
| `--color-link` | 链接颜色 |
| `--color-selection` | 文字选中背景 |
| `--color-nav-bg` | 桌面端导航栏背景 |
| `--color-nav-mobile` | 移动端导航栏背景 |
| `--color-caption-bg` | 相册照片描述层背景 |
| `--color-overlay-btn` | 覆盖层按钮背景 |

### 切换主题原理

`src/index.js` 读取主题名的优先级：

1. **命令行参数** `--theme dracula`
2. **`.themerc` 文件**（由 `npm run theme` 写入）
3. **默认值** `'dracula'`

```javascript
const themeArg = process.argv.includes('--theme')
  ? process.argv[process.argv.indexOf('--theme') + 1]
  : null;
const savedTheme = fs.existsSync('.themerc')
  ? fs.readFileSync('.themerc', 'utf-8').trim()
  : null;
const currentTheme = themeArg || savedTheme || 'dracula';
```

构建时将 `themes/<currentTheme>/colors.css` 和 `themes/<currentTheme>/layout.css` 复制到 `dist/`。

---

## 如何新增主题

### 步骤 1：创建主题目录

```
themes/my-theme/
├── colors.css
├── layout.css
└── template.html
```

### 步骤 2：编写 colors.css

在 `:root {}` 中定义主题原生变量和语义别名：

```css
/* ── My Theme Color Variables ────────────────────────── */
:root {
  /* ① 主题原生变量（色值） */
  --my-bg:        #1a1a2e;
  --my-surface:   #16213e;
  --my-text:      #eaeaea;
  --my-muted:     #a0a0a0;
  --my-accent:    #e94560;
  --my-cyan:      #3498db;
  --my-orange:    #f39c12;
  --my-pink:      #ff6b9d;
  --my-border:    #2a2a4a;

  /* ② 语义别名（必须） */
  --color-bg:           var(--my-bg);
  --color-surface:      var(--my-surface);
  --color-text:         var(--my-text);
  --color-text-muted:   var(--my-muted);
  --color-accent:       var(--my-accent);
  --color-accent-warm:  var(--my-orange);
  --color-accent-cool:  var(--my-cyan);
  --color-accent-pink:  var(--my-pink);
  --color-border:       var(--my-border);
  --color-link:         var(--my-cyan);
  --color-heading:     var(--my-accent-warm);
  --color-nav-bg:       rgba(26, 26, 46, 0.95);
  --color-nav-mobile:   rgba(26, 26, 46, 0.97);
  --color-caption-bg:   rgba(26, 26, 46, 0.8);
  --color-overlay-btn:  rgba(26, 26, 46, 0.8);
}
```

### 步骤 3：编写 layout.css

**不直接写颜色值**，所有颜色使用 `var(--color-*)`：

```css
body {
  background-color: var(--color-bg);
  color: var(--color-text);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

a {
  color: var(--color-link);
  text-decoration: none;
}

a:hover {
  color: var(--color-accent);
}

/* 其他组件... */
```

### 步骤 4：复制 template.html

从现有主题（如 `themes/dracula/template.html`）复制，稍作定制（可选）。

### 步骤 5：启用主题

```bash
# 方式一：交互式选择
npm run theme

# 方式二：手动写入
echo "my-theme" > .themerc

# 方式三：构建时指定
node src/index.js --theme my-theme
```

---

## CLI 命令扩展方法

CLI 定义在 `memoria/lib/cli-content.js`，使用原生 Node.js `readline` 模块，无外部依赖。

### 新增命令

在 `commands` 对象中添加条目：

```javascript
const commands = {
  'new:blog': cmdNewBlog,
  'new:vlog': cmdNewVlog,
  'new:photo': cmdNewPhoto,
  'theme': async () => { /* ... */ },
  'bundle': cmdBundle,
  'deploy': cmdDeploy,

  // 新增命令
  'my-command': async () => {
    // 实现逻辑
    console.log('Hello from my-command');
  },
};
```

然后在 package.json scripts 中注册：

```json
"my-command": "node memoria/lib/cli-content.js my-command"
```

### 命令注册到 npm script

所有 CLI 命令通过 `memoria/lib/cli-content.js <command>` 的方式调用，推荐在 `package.json` 的 `scripts` 中注册：

```json
"scripts": {
  "my-command": "node memoria/lib/cli-content.js my-command"
}
```

---

## 构建流程说明

```
1. 解析主题参数（命令行 > .themerc > 默认 dracula）
2. compileAllContent() 扫描 content/blogs, content/vlogs, content/photos
   - gray-matter 解析 frontmatter
   - marked 解析 Markdown 正文
   - 按 date 降序排序
3. 读取 themes/<theme>/template.html
4. 复制 theme CSS 到 dist/
5. 复制 public/ 到 dist/public/
6. 渲染并写入各页面
   - index.html（首页）
   - blogs.html / vlogs.html / photos.html（列表页）
   - about.html（关于页）
   - blog/<slug>/index.html 等（详情页）
7. 输出报告：页面数量、内容条数
```

---

## 开发调试方法

### 监听模式（文件变动自动重建）

```bash
npm run dev
```

`content/` 目录下任何 Markdown 文件保存后，自动重新运行完整构建。

### 指定主题构建

```bash
node src/index.js --theme nord
```

### 查看构建输出

```bash
# 本地预览
npx serve dist

# 检查输出文件
ls dist/
ls dist/blog/
```

### 添加调试输出

在 `src/index.js` 的 `build()` 函数中添加 `console.log`：

```javascript
function build() {
  console.log(`Theme: ${currentTheme}`);
  console.log(`Blogs: ${blogs}`);
  // ...
}
```

### 调试 renderer

在 `src/renderer.js` 中每个渲染函数返回前，可以将 `content` 打印出来检查结构。

---

## 关键文件说明

| 文件 | 作用 |
|------|------|
| `src/compiler.js` | `scanDir()` 扫描目录 → `compileFile()` 解析单个文件 → `compileAllContent()` 汇总 |
| `src/renderer.js` | `renderIndex()` / `renderBlogs()` / `renderVlogs()` / `renderPhotos()` / `renderAbout()` / `renderDetail()` |
| `src/utils.js` | `slugify()` 生成 URL 安全标题、`formatDate()` 格式化日期、`extractExcerpt()` 提取摘要 |
| `memoria/lib/cli-content.js` | 交互式 CLI，`readline` 提问，生成 Markdown 骨架 |
| `themes/<name>/template.html` | HTML 模板，`{{PAGE_TITLE}}`、`{{PAGE_CONTENT}}` 等占位符 |