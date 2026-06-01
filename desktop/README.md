# Memoria Desktop

Memoria 的桌面写作软件版 — 面向非开发者的图形界面博客写作工具。

## 快速开始

```bash
# 安装依赖
cd desktop && npm install

# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build

# 打包桌面应用
npx electron-vite build
npx electron-builder --win  # Windows
npx electron-builder --mac  # macOS
npx electron-builder --linux # Linux
```

## 功能概览

| 功能 | 说明 |
|------|------|
| 📊 **仪表盘** | 站点统计、一键构建、最近内容列表 |
| 📝 **内容管理** | 文章/视频/相册三种内容类型的 CRUD |
| ✏️ **写作编辑器** | Blog 编辑器（Markdown + 实时预览）、Vlog 表单编辑器、Photo 相册编辑器 |
| 👁 **站点预览** | 内嵌 iframe 预览, 支持手机/平板/桌面三档尺寸 |
| ⚙️ **设置** | 站点名称/作者/URL 配置, 主题切换 (Dracula/Mint/Nord/Peach) |

## 架构

```
desktop/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts             # 窗口创建、应用生命周期
│   │   └── ipc/
│   │       ├── site.ts          # 站点管理 IPC
│   │       ├── content.ts       # 内容 CRUD IPC
│   │       ├── build.ts         # 构建引擎 IPC
│   │       ├── preview.ts       # 预览服务器 IPC
│   │       ├── site-state.ts    # 共享状态
│   │       └── render-utils.ts  # 渲染工具函数
│   ├── preload/
│   │   └── index.ts             # contextBridge API 暴露
│   └── renderer/                # Vue 3 SPA
│       ├── index.html
│       └── src/
│           ├── main.ts          # Vue 入口
│           ├── router.ts        # 路由配置
│           ├── App.vue          # 根组件 + 侧边栏
│           └── views/
│               ├── Welcome.vue      # 新建/打开站点
│               ├── Dashboard.vue    # 站点仪表盘
│               ├── ContentList.vue  # 内容管理列表
│               ├── Editor.vue       # 写作编辑器
│               ├── SitePreview.vue  # 站点预览
│               └── Settings.vue     # 设置页面
├── package.json
├── electron.vite.config.ts
└── tsconfig*.json
```

## 与 CLI 版的关系

- **共享引擎**：`desktop/src/main/ipc/build.ts` 内嵌了 compiler + renderer 逻辑
- **共享数据格式**：内容以相同 frontmatter Markdown 格式存储，CLI 和桌面版可操作同一站点
- **CLI 继续可用**：桌面版是扩展，不替代原有 `memoria generate` / `memoria server` 等命令

## 技术栈

- **Electron 33** — 桌面壳
- **Vue 3 + Pinia** — 渲染进程
- **Vite 5 + electron-vite** — 构建工具
- **gray-matter + marked** — Markdown 解析
- **highlight.js** — 代码高亮
