# Memoria

轻量级静态博客系统，支持 **文章（blogs）**、**视频日志（vlogs）**、**相册（photos）** 三种内容形态，开箱即用。

---

## ⚠️ 当前状态

**尚未发布到 npm（预发布版本）**

当前为本地开发/测试阶段，发布后会可通过 `npm install -g memoria` 安装。

---

## 安装与快速开始

### 方式一：本地开发（当前可用）

```bash
# 1. 克隆仓库
git clone https://github.com/AllenTango/memoria.git
cd memoria

# 2. 链接为全局命令
npm link

# 3. 创建站点
memoria init my-blog
cd my-blog

# 4. 开始使用
memoria generate        # 构建到 dist/
memoria server          # 本地预览（http://localhost:3000）
```

### 方式二：直接使用（发布后）

```bash
npm install -g memoria
memoria init my-blog
cd my-blog
memoria generate
memoria server
```

---

## 创建内容

### 新建文章

```bash
memoria new blog "我的第一篇文章"
# 或手动创建 Markdown 文件到 content/blogs/
```

### 新建视频日志

```bash
memoria new vlog "第一次 vlog"
# 或手动创建到 content/vlogs/
```

### 新建相册

```bash
memoria new photo "旅行相册"
# 或手动创建到 content/photos/
```

### frontmatter 格式

每个内容文件开头使用 YAML frontmatter：

```markdown
---
title: "文章标题"
date: "2026-01-01"
---

正文内容...
```

---

## 主题切换

```bash
memoria theme           # 交互式选择
memoria theme list      # 列出所有可用主题
```

内置主题：

| 主题 | 风格 |
|------|------|
| **dracula** | 暗黑紫（默认） |
| **mint** | 薄荷绿 |
| **nord** | 北欧灰蓝 |
| **peach** | 蜜桃粉 |

---

## 部署

```bash
memoria deploy          # 交互式选择部署平台
```

支持的部署平台：
- GitHub Pages（自动配置 GitHub Actions）
- Vercel / Netlify（输出构建命令）

---

## 命令一览

| 命令 | 说明 |
|------|------|
| `memoria init <name>` | 创建新站点 |
| `memoria generate` | 构建静态文件到 dist/ |
| `memoria server` | 本地预览（热重载） |
| `memoria clean` | 清理 dist/ |
| `memoria theme` | 切换主题 |
| `memoria new blog/vlog/photo <title>` | 新建内容 |
| `memoria deploy` | 部署站点 |
| `memoria upgrade` | 升级全局 CLI |
| `memoria sync` | 同步内置主题到站点 |
| `memoria help` | 帮助 |

---

## 项目结构（用户站点）

```
my-blog/
├── content/              # 内容（blogs/vlogs/photos）
│   ├── about.md
│   ├── blogs/
│   ├── vlogs/
│   └── photos/
├── themes/               # 主题（可自定义）
├── public/               # 静态资源（图片/视频）
├── dist/                 # 构建输出（可部署）
├── _config.yml           # 站点配置
├── package.json
└── .themerc             # 当前主题
```

---

## 文档

- [快速开始](./docs/getting-started.md)
- [内容创作](./docs/content-guide.md)
- [主题开发](./docs/theme-guide.md)
- [部署指南](./docs/deploy-guide.md)
- [CLI 参考](./docs/cli-reference.md)
- [开发者文档](./docs/developer.md)