# 新手入门

本文档面向内容创作者，介绍如何快速上手 Memoria。

## 环境要求

- **Node.js 20+**
- **npm 9+**

检查版本：

```bash
node --version
npm --version
```

## 安装

```bash
# 克隆项目（或解压 zip）
git clone <your-repo-url>
cd memoria

# 安装依赖
npm install
```

## 快速构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录。预览：

```bash
npx serve dist
```

## 创建第一篇内容

```bash
npm run new:blog
```

按提示填写标题、日期、标签，即可在 `content/blogs/` 下生成 Markdown 文件，直接编辑即可。

## 本地资源

所有本地图片、视频放在 `public/` 目录下：

```
public/
├── images/    # 图片文件
└── videos/    # 视频文件
```

在 Markdown 中引用：

```markdown
![我的照片](/public/images/photo-1.jpg)
```

构建时 `public/` 自动复制到 `dist/public/`，无需手动操作。

## 监听文件变动

```bash
npm run dev
```

保存 Markdown 文件后，自动重新构建，适合内容创作阶段使用。

## 下一步

- [内容格式说明](./content-guide.md) — 博客 / 视频 / 相册的 frontmatter 规范
- [主题切换](./theme-guide.md) — 换一款喜欢的主题
- [部署指南](./deploy-guide.md) — 发布到互联网