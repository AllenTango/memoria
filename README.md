# Memoria

🫘 轻量级静态博客系统，支持 **文章（blogs）**、**视频日志（vlogs）**、**相册（photos）** 三种内容形态，开箱即用。

---

## ⚠️ 当前状态

**TypeScript 版本，重构中，尚未发布 npm**

当前为本地开发/测试阶段。发布后可通过 `npm install -g memoria` 安装。

---

## 安装与快速开始

### 方式一：本地开发（当前可用）

```bash
# 1. 克隆仓库
git clone https://github.com/AllenTango/memoria.git
cd memoria

# 2. 安装依赖
npm install

# 3. 构建 TypeScript
npm run build

# 4. 链接为全局命令
npm link

# 5. 创建站点
memoria init my-blog
cd my-blog

# 6. 开始使用
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
```

### 新建视频日志

```bash
memoria new vlog "第一次 vlog"
```

### 新建相册

```bash
memoria new photo "旅行相册"
```

### frontmatter 格式

```markdown
---
title: "文章标题"
date: "2026-01-01"
tags: ["标签1", "标签2"]
type: "blog"           # blog | vlog | photo
description: "描述"
---

正文内容...
```

---

## 主题切换

```bash
memoria theme           # 交互式选择
memoria theme list      # 列出所有可用主题
memoria theme new <name>  # 创建自定义主题
```

内置主题：dracula / mint / nord / peach

---

## 命令一览

| 命令 | 说明 |
|------|------|
| `memoria init <name>` | 创建新站点 |
| `memoria generate` | 构建静态文件到 dist/ |
| `memoria server` | 本地预览（热重载） |
| `memoria clean` | 清理 dist/ |
| `memoria bundle` | 构建并打包成 zip |
| `memoria theme` | 切换主题 |
| `memoria new blog/vlog/photo` | 新建内容（交互式） |
| `memoria deploy` | 部署站点 |
| `memoria upgrade` | 升级全局 CLI |
| `memoria sync` | 同步内置主题到站点 |
| `memoria help` | 帮助 |

---

## 在线文档

📚 **已托管至 GitHub Pages：** https://allenTango.github.io/memoria/

文档包括：快速开始 / 内容创作 / 主题开发 / 部署指南 / CLI 参考 / 测试指南

本地文档：`docs/` 目录

---

## 测试

```bash
npm run build                              # 先构建 TypeScript
npx tsx tests/memoria-integration-test.ts  # 运行集成测试
```

详见 [测试指南](./docs/testing.md)

---

## 项目结构

```
memoria/
├── src/              # 编译引擎（TypeScript）
├── lib/              # CLI 核心逻辑
├── bin/              # CLI 入口
├── dist/             # 编译输出（npm 包）
├── themes/           # 内置主题
├── docs/             # 项目文档
├── tests/            # 测试脚本
└── package.json
```

---

## 技术栈

- **TypeScript** — 类型安全
- **Node.js 18+** — 运行时
- **gray-matter** — YAML frontmatter 解析
- **marked** — Markdown 渲染
- **highlight.js** — 代码高亮