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

## 创建新站点

```bash
memoria init              # 在当前目录初始化
memoria init my-site      # 在当前目录下新建 my-site/ 并初始化
```

**`memoria init`** 在当前目录创建站点，目录必须为空（或已被初始化过）。

**`memoria init <dirname>`** 在当前目录下新建子目录并初始化。

## 快速构建

```bash
memoria generate
```

构建产物输出到 `dist/` 目录。预览：

```bash
npx serve dist
```

## 创建第一篇内容

```bash
memoria new blog
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
memoria server
```

保存 Markdown 文件后，自动重新构建，适合内容创作阶段使用。

## 下一步

- [内容格式说明](./content-guide.md) — 博客 / 视频 / 相册的 frontmatter 规范
- [主题切换](./theme-guide.md) — 换一款喜欢的主题
- [部署指南](./deploy-guide.md) — 发布到互联网
## 自定义站点图标

Memoria 默认使用内置的植物图标（memoria-icon.png）。你可以通过修改 `_config.yml` 来自定义：

```yaml
site:
  name: "我的博客"
  icon: "/public/images/your-icon.png"  # 相对于站点根目录
```

**准备图标：**
1. 将图标文件放入站点的 `public/images/` 目录
2. 在 `_config.yml` 中设置 `icon: "/public/images/你的图标.png"`
3. 运行 `memoria generate` 重新构建

**注意事项：**
- 图标路径相对于站点 `public/` 目录
- 支持格式：PNG、JPG、SVG
- 建议尺寸：至少 512x512 像素
