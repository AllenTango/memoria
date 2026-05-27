# Memoria

> 你我大事件记录站 — 用 Markdown 书写，用静态网站呈现。

Memoria 是一个轻量级静态网站生成器，专为记录生活大事件而设计。支持博客、视频、相册三种内容形态，内置多款精心设计的响应式主题，部署到任意静态托管平台即可。

## 特性

- **纯静态输出** — 无后端、无数据库，输出目录可直接部署
- **Markdown 内容创作** — 博客 / 视频 / 相册，一个文件夹搞定
- **内置 3 款主题** — Dracula（默认，暗黑紫）、Nord、Peach、Mint，init 后位于站点 `themes/` 目录
- **响应式双端适配** — 移动端底部 Tab Bar / 桌面端顶部导航
- **本地资源完整支持** — 图片、视频统一放在 `public/` 目录，构建时自动复制
- **CLI 快捷命令** — 交互式新建文章 / 切换主题 / 打包部署，开箱即用

## 快速开始

```bash
# 安装依赖
npm install

# 构建网站（默认 dracula 主题）
npm run build

# 预览（需要静态服务器）
npx serve dist

# 监听文件变动自动构建
npm run dev
```

## 内容创作

```bash
# 新建一篇博客
npm run new:blog

# 新建一条视频记录
npm run new:vlog

# 新建一个相册
npm run new:photo
```

CLI 会交互式询问标题、日期等信息，自动在对应目录下生成带 frontmatter 的 Markdown 文件。

## 主题切换

内置 3 款主题：**dracula**（默认，暗黑紫）、**nord**（北欧清新）、**peach**（温暖杂志风）、**mint**（活力薄荷）。init 后位于站点 `themes/` 目录。

```bash
# 交互式切换（显示所有可用主题）
npm run theme

# 指定主题构建
memoria generate --theme nord  # 或 memoria theme 交互式选择
```

主题偏好会写入 `.themerc` 文件，后续 `npm run build` 自动使用已选主题。

## 部署指南

### GitHub Pages（推荐）

1. 将项目推送到 GitHub 仓库
2. 在仓库 Settings → Pages 中，Source 选择 **GitHub Actions**
3. 每次 push 到 `main` 分支，GitHub Actions 自动构建并部署

或手动部署：

```bash
npm run bundle    # 构建 + 打包成 memoria-YYYYMMDD.zip
npm run deploy   # 推送到 GitHub（需先初始化 git）
```

### 其他静态托管（Vercel / Netlify / Cloudflare Pages）

将 `dist/` 目录设置为输出目录，构建命令填写：

```bash
npm install && npm run build
```

输出目录：`dist/`

## 技术栈

| 用途 | 技术 |
|------|------|
| 运行时 | Node.js |
| Markdown 解析 | [marked](https://marked.js.org/) |
| Frontmatter 解析 | [gray-matter](https://github.com/jonschlinkert/gray-matter) |
| 代码高亮 | [highlight.js](https://highlightjs.org/) |
| 图标 | [Lucide](https://lucide.dev/) |
| 主题系统 | CSS Custom Properties（双层结构） |
| CI/CD | GitHub Actions |

## License

MIT