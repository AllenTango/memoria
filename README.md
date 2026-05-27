# Memoria

一款面向个人的轻量级静态博客系统，支持 **文章（blogs）**、**视频日志（vlogs）**、**相册（photos）** 三种内容形态，主题系统与内容管理分离。

---

## 快速开始

### 1. 创建新站点

```bash
memoria init my-site
cd my-site
```

### 2. 编写内容

在 `content/` 目录下添加 Markdown 文件：

```
content/
├── about.md                # 关于页面
├── blogs/                  # 博客文章
├── vlogs/                  # 视频日志
└── photos/                 # 相册
```

每个文件使用 frontmatter：

```markdown
---
title: "文章标题"
date: "2026-01-01"
---

正文内容...
```

### 3. 构建并预览

```bash
memoria generate        # 构建静态文件到 dist/
memoria server       # 启动本地预览服务器
```

---

## 内置主题

`memoria init` 时可选择以下主题：

| 主题 | 风格 |
|------|------|
| **dracula** | 暗黑紫（默认） |
| **mint** | 薄荷绿 |
| **nord** | 北欧灰蓝 |
| **peach** | 蜜桃粉 |

换主题：`memoria theme`

---

## 项目结构

```
memoria/
├── memoria-core/          # 核心引擎（主题 + 渲染逻辑）
│   ├── src/
│   ├── themes/dracula/
│   └── package.json
├── memoria-cli/          # CLI 工具（init / generate / server 等）
│   ├── bin/
│   ├── lib/
│   ├── assets/site-template/
│   └── package.json
├── scripts/              # 开发辅助脚本
│   ├── test-site/        # 集成测试用站点
│   ├── test-theme.sh     # 主题验证脚本
│   └── smoke-test.sh     # 冒烟测试脚本
├── docs/                 # 项目文档
├── .github/              # GitHub Actions 配置
├── DEVELOPER.md          # 开发者文档
└── README.md
```

---

## 开发者文档

- [DEVELOPER.md](./DEVELOPER.md) — 架构原理、主题开发、CLI 扩展
- [docs/](./docs/) — 更多开发细节

---

## 命令行工具

| 命令 | 说明 |
|------|------|
| `memoria init` | 初始化新站点（复制 site-template） |
| `memoria generate` | 构建静态文件 |
| `memoria server` | 启动预览服务器 |
| `memoria theme` | 切换主题 |
| `memoria new blog` | 新建博客文章 |
| `memoria new vlog` | 新建视频日志 |
| `memoria new photo` | 新建相册条目 |