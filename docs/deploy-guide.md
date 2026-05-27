# 部署指南

## GitHub Pages（推荐）

### 方式一：GitHub Actions 自动部署

1. 将项目推送到 GitHub 仓库
2. 进入 **Settings → Pages**
3. **Source** 选择 **GitHub Actions**
4. 每次 push 到 `main` 分支，自动触发构建并部署

workflow 文件已内置在 `.github/workflows/build.yml`，无需额外配置。

### 方式二：手动部署到 GitHub Pages

```bash
# 构建
npm run build

# 打包
npm run bundle     # 生成 memoria-YYYYMMDD.zip

# 推送
npm run deploy
```

下载 `memoria-YYYYMMDD.zip`，解压后在本地切换到 `gh-pages` 分支部署。

---

## Vercel

1. 登录 [vercel.com](https://vercel.com)，Import 项目
2. **Build Command**：`npm run build`
3. **Output Directory**：`dist`
4. 点击 Deploy

---

## Netlify

1. 登录 [netlify.com](https://app.netlify.com)，拖入 `dist/` 文件夹
2. 或连接 GitHub 仓库，设置：
   - **Build Command**：`npm run build`
   - **Publish Directory**：`dist`

---

## Cloudflare Pages

1. 登录 [pages.cloudflare.com](https://pages.cloudflare.com)
2. 连接 GitHub 仓库
3. **Build Command**：`npm run build`
4. **Build Output Directory**：`dist`

---

## 其他静态托管

Memoria 输出目录为纯静态文件（HTML + CSS + 图片/视频），任何支持静态文件托管的服务均可使用。

构建产物：

```
dist/
├── index.html
├── blogs.html
├── vlogs.html
├── photos.html
├── about.html
├── blog/           # 博客详情页
├── vlog/           # 视频详情页
├── photo/          # 相册详情页
├── colors.css
├── layout.css
└── public/         # 本地资源（图片/视频）
```

> ⚠️ 页面内链接为相对路径（如 `/blog/xxx/index.html`），托管根目录需与项目名对应，或在模板中配置 base URL。