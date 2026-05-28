# Memoria CLI 快捷命令

## 使用方式

所有命令位于 `memoria/` 目录下执行。

---

## 新建文章

### `memoria new blog` — 新建博客

交互式创建博客文章：

```
文章标题: 小芽第一次上线
日期（YYYY-MM-DD，回车用今天）: 2026-05-11
标签（逗号分隔）: 里程碑,日常
简短描述（可选）:
```

自动在 `content/blogs/` 下生成带 frontmatter 的 Markdown 文件。

---

### `memoria new vlog` — 新建视频记录

交互式创建视频记录：

```
视频标题: 第一次视频记录
日期（YYYY-MM-DD，回车用今天）: 2026-05-20
视频URL（YouTube embed 或本地路径）: /public/videos/my-video.mp4
缩略图URL（可选）: /public/images/my-thumb.jpg
描述（可选）:
```

**视频 URL 支持两种格式：**
- 本地视频：`/public/videos/xxx.mp4`（文件放入 `public/videos/`）
- YouTube embed：`https://www.youtube.com/embed/xxx`

---

### `memoria new photo` — 新建相册

交互式创建相册：

```
相册标题: 五一假期
日期（YYYY-MM-DD，回车用今天）: 2026-05-01
每张照片一行，格式: url | caption，直接回车结束输入:
  > /public/images/beach.jpg | 海边日落
  > https://example.com/remote.jpg | 远途风景
  >
```

支持本地路径和远程 URL 混用。

---

## 构建与预览

### `memoria generate` — 构建网站

```bash
memoria generate
```

- 使用当前主题（或 `.themerc` 中保存的主题）构建全站
- 扫描 `content/blogs/`、`content/vlogs/`、`content/photos/`
- 复制 `public/` 目录到 `dist/public/`
- 复制主题 CSS 到 `dist/`
- 输出静态文件到 `dist/`

### 指定主题构建

```bash
# 指定主题（通过 memoria theme 选择或 --theme 参数）
# memoria generate --theme nord
```

### `memoria server` — 监听模式

```bash
memoria server
```

监听 `content/` 目录，文件变动自动重新构建，适合内容创作阶段使用。

---

## 主题切换

### `memoria theme` — 交互式切换

```bash
memoria theme
```

显示所有可用主题供选择，当前选择写入 `.themerc` 文件。

内置主题：`dracula`（默认）、`nord`、`peach`、`mint`，init 后位于站点 `themes/` 目录。

切换后下次 `memoria generate` 自动使用新主题。

---

## 打包与推送

### `memoria bundle` — 打包

```bash
memoria bundle
```

- 先执行 `memoria generate`
- 将 `dist/` 打包成 `memoria-YYYYMMDD.zip`

### `memoria deploy` — 推送到 GitHub

```bash
memoria deploy
```

- 提交当前更改
- Push 到 `main` 分支
- 触发 GitHub Actions 自动构建部署

> 需要先初始化 git：`git init && git remote add origin <your-repo-url>`

---

## 升级与同步

### `memoria upgrade` — 升级全局 CLI

```bash
memoria upgrade
```

升级 memoria 全局 CLI，等同于 `npm update -g memoria`。无需在站点目录执行。

---

### `memoria sync` — 同步内置主题

```bash
memoria sync
```

将 memoria 源码的最新内置主题同步到当前站点的 `themes/` 目录。必须在站点目录下执行。

内置主题被更新后（如 dracula 配色调整），运行此命令将最新版本同步到你的站点。

同步过程中若检测到站点主题文件已被修改，会提示确认是否覆盖。

---

## 本地资源使用

> ⚠️ 所有本地资源文件必须放在项目根目录的 `public/` 下！

```
public/
├── images/    # 图片文件（.jpg, .png, .gif, .webp...）
└── videos/    # 视频文件（.mp4, .webm...）
```

构建时 `public/` 目录自动完整复制到 `dist/public/`，Markdown 中直接使用 `/public/` 路径即可。

**示例：**

```bash
# 1. 把图片放入 public/images/
cp /path/to/photo.jpg public/images/

# 2. 在 frontmatter 中引用：
#    video: "/public/videos/my-video.mp4"
#    thumbnail: "/public/images/my-thumb.jpg"

# 3. 构建后 dist/public/ 即为可访问的路径
```

---

## 实现原理

CLI 命令通过 `memoria/lib/cli-content.js` 实现，使用 Node.js 原生 `readline` 模块实现交互式输入，不依赖任何外部库。