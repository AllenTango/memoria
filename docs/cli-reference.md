# CLI 命令参考

Memoria CLI 命令，使用 `memoria` 命令执行。

---

## 新建内容

### `memoria new blog`

交互式创建博客文章：

```
文章标题: 小芽第一次上线
日期（YYYY-MM-DD，回车用今天）: 2026-05-11
标签（逗号分隔）: 里程碑,日常
简短描述（可选）:
```

自动在 `content/blogs/` 下生成 `YYYYMMDD-slug.md` 文件，包含完整 frontmatter。

---

### `memoria new vlog`

交互式创建视频记录：

```
视频标题: 项目启动记录
日期（YYYY-MM-DD，回车用今天）: 2026-05-10
视频URL（YouTube embed 或本地路径）: /public/videos/kickoff.mp4
缩略图URL（可选）: /public/images/kickoff-thumb.jpg
描述（可选）:
```

**视频 URL 支持两种格式：**
- 本地路径：`/public/videos/my-video.mp4`（文件放入 `public/videos/`）
- YouTube embed：`https://www.youtube.com/embed/xxx`

---

### `memoria new photo`

交互式创建相册：

```
相册标题: 五一假期
日期（YYYY-MM-DD，回车用今天）: 2026-05-01
每张照片一行，格式: url | caption，直接回车结束输入:
  > /public/images/beach.jpg | 海边日落
  > https://example.com/remote.jpg | 远途风景
  >
```

支持本地图片路径和远程 URL 混用。

---

## 构建

### `memoria generate`

使用当前主题（或 `.themerc` 中保存的主题）构建全站，输出到 `dist/`。

```
memoria generate          # 使用当前主题构建
# 或指定主题: memoria generate --theme <name>
```

构建产物：
- `dist/*.html` — 所有页面
- `dist/colors.css` — 主题配色变量
- `dist/layout.css` — 主题布局样式
- `dist/public/` — 本地资源（图片、视频）

---

### `memoria server`

监听 `content/` 目录，文件变动自动重新构建，适合内容创作阶段使用。

```bash
memoria server
```

---

## 主题

### `memoria theme`

交互式切换主题，显示所有可用主题供选择，当前选择写入 `.themerc` 文件。

---

## 打包与部署

### `memoria bundle`

先执行 `memoria generate`，然后将 `dist/` 打包为 `memoria-YYYYMMDD.zip`。

### `memoria deploy`

将当前更改提交并推送到 GitHub `main` 分支，触发 GitHub Actions 自动构建部署。

> 需要先初始化 git：`git init && git remote add origin <your-repo-url>`

---

## 实现原理

所有命令位于 `memoria/lib/cli-content.js`，使用 Node.js 原生 `readline` 模块实现交互式输入，不依赖外部库。

```javascript
// 命令映射（memoria/lib/cli-content.js）
const commands = {
  'new:blog':   cmdNewBlog,
  'new:vlog':   cmdNewVlog,
  'new:photo':  cmdNewPhoto,
  'theme':      interactiveThemeSwitcher,
  'bundle':     cmdBundle,
  'deploy':     cmdDeploy,
};
```

新增 CLI 命令：在 `commands` 对象中添加函数，并在 `package.json` 的 `scripts` 中注册。