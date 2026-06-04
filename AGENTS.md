# Memoria TUI 开发指导文件

## 1. 项目概况

- **项目名称：** memoria (TypeScript 静态博客生成系统)
- **目标：** 将原有的纯 CLI 交互升级为 TUI (Terminal User Interface) 管理界面
- **核心技术栈：** `Ink` (React for CLI), `TypeScript`, `Node.js`
- **设计哲学：** **逻辑与界面分离 (Decoupling)**
  - `Core` 层：纯 TS 逻辑，无 UI 依赖，负责文件 I/O、进程管理、构建算法
  - `TUI` 层：基于 React 的状态驱动渲染，负责用户输入分发与视觉呈现

---

## 2. 架构设计方案

### 2.1 分层架构

1. **Core 层 (`core/`)**：导出纯函数或类。禁止使用 `console.log`，所有输出应通过回调或返回对象传递
2. **TUI 层 (`tui/`)**：使用 `Ink` 构建。通过 `useState` 和 `useEffect` 管理界面状态，调用 Core 层函数
3. **配置层**：
   - **全局配置 (`~/.memoria/config.json`)**：记录 `recentSites`（最近站点路径列表）和 `defaultEditor`（默认编辑器路径）
   - **站点配置 (`site/config.json`)**：博客本身的元数据配置

### 2.2 状态机流程

```
启动 memoria
  → [View: SiteSelector]（新建/打开站点）
  → (选择/创建站点)
  → [View: SiteDashboard]（资源管理 + 指令执行）
  → (返回/退出)
  → [View: SiteSelector]
```

### 2.3 界面布局规范（Layout）

界面采用响应式 `Box` 布局，划分为四个核心区域：

```
┌──────────────────────────────────────────────────────────┐
│ Header (顶部栏)                                          │
│ [📚 Memoria v1.0] | 当前站点: /path/to/site | 日期       │
├─────────────────────────┬────────────────────────────────┤
│ Left Sidebar (30%)      │ Right Detail/Log (70%)         │
│                         │                                │
│ 文件树结构显示所有资源:    │ 空闲状态: 显示选中目标元数据    │
│  - blogs/               │   (标题、日期、标签、路径)       │
│    - *.md               │                                │
│  - vlogs/               │ 执行状态: 实时滚动日志          │
│    - *.md               │   (/generate 等指令执行过程)    │
│  - photos/              │                                │
│    - *.md               │                                │
│  - public/              │                                │
│                         │                                │
├─────────────────────────┴────────────────────────────────┤
│ StatusBar (底部状态栏)                                    │
│ [Server: RUNNING/STOPPED] | p:预览 s:停止 /:指令 | ↑↓ Enter x │
└──────────────────────────────────────────────────────────┘
```

**各区域职责：**

| 区域 | 职责 |
|------|------|
| **Header** | 固定 1 行，显示应用名称、当前站点路径、日期 |
| **Left Sidebar（30%）** | 文件树结构，支持展开/折叠；上下键导航；`Enter` 唤起系统编辑器 |
| **Right Detail/Log（70%）** | 双模式：浏览时显示元数据；执行指令时实时滚动日志 |
| **Command Overlay** | 按 `/` 唤起，覆盖在主界面之上 |
| **StatusBar** | 底部固定，Server 状态动态颜色（绿=RUNNING，红=STOPPED）|

**编辑器配置优先级：**
1. 环境变量 `MEMORIA_EDITOR`
2. 全局配置 `~/.memoria/config.json` 中的 `defaultEditor`
3. 系统默认 `vim`（兜底）

### 2.4 全局快捷键

| 快捷键 | 行为 |
|--------|------|
| `/` | 打开命令面板 |
| `↑↓` | 在文件树/列表中导航 |
| `Enter` | 确认选择 / 打开文件 |
| `P` | 启动预览服务器 |
| `S` | 停止预览服务器 |
| `x` | 退出当前视图或应用 |
| `Esc` | 返回上一层 |

---

## 3. 详细功能需求

### 3.1 站点管理（Site Management）

**SiteSelector 视图：**
- 列出最近打开的站点（`~/.memoria/config.json`）
- **新建站点**：引导输入名称 → 选择路径 → 调用 `core.initSite()` → 自动记录到最近站点
- **打开站点**：选择路径 → 验证 `core.validateSite()` → 切换至 `SiteDashboard`

### 3.2 站点内操作（Site Dashboard）

**文件树（Left Sidebar）：**
- 显示 `blogs/`、`vlogs/`、`photos/`、`public/` 四个根节点
- 支持展开/折叠目录
- 选中任意文件按 `Enter` → 唤起系统编辑器（优先级：MEMORIA_EDITOR → config.defaultEditor → vim）
- 编辑器退出后 → 刷新文件树 + 重新显示该文件元数据

**Right Detail/Log 区域：**
- **空闲状态**：显示选中节点/文件的元数据
  - 目录节点：显示包含文件数量、最后修改时间
  - 文件节点：显示标题、日期、标签、完整路径
- **执行状态**：执行指令时，实时滚动显示日志输出
  - `/generate`（即 `/b`）→ 显示构建过程日志
  - `/bundle` → 显示打包过程日志
  - `/server` → 显示服务器启动日志
  - 指令完成后 → 回到空闲状态

### 3.3 预览服务器（Preview Server）

- **启动（按 `P`）**：
  - 调用 `core.build()` 确保 dist/ 最新
  - 启动 HTTP 服务器（默认端口 3000）
  - 自动唤起浏览器 `open http://localhost:3000`
  - StatusBar 更新为 `Server: RUNNING`（绿色）
- **停止（按 `S`）**：
  - 调用 `core.stopServer()` 杀死服务器进程
  - StatusBar 更新为 `Server: STOPPED`（红色）
  - 服务器进程必须完全终止

### 3.4 Slash 指令系统（Command Palette）

按 `/` 键进入指令模式，支持以下指令：

| 指令 | 说明 |
|------|------|
| `/create` | 新建站点 |
| `/open` | 打开已有站点 |
| `/generate` 或 `/b` | 构建站点（输出日志到右栏） |
| `/bundle` | 构建 + 打包 |
| `/server` | 启动预览服务器 |
| `/new:blog` | 新建博客文章 |
| `/new:vlog` | 新建影像日志 |
| `/new:photo` | 新建相册 |
| `/theme` | 切换主题 |
| `/exit` | 退出应用 |

---

## 4. 文件映射与实现路径

### Phase 1：Core 层重构（已完成）

已实现 `core/` 下所有模块：
- `core/compiler.ts` — Markdown 解析、frontmatter 提取
- `core/renderer.ts` — HTML 生成（index/blog/vlog/photo/detail）
- `core/utils.ts` — 通用工具函数（slugify、formatDate、ensureDir 等）

验证方式：重写原 CLI 入口，确保 `memoria generate` 等命令行行为一致。

### Phase 2：TUI 基础架构与布局

**任务：搭建响应式骨架，实现四区布局。**

| 文件 | 职责 |
|------|------|
| `tui/components/Layout.tsx` | 顶层布局：Header + Sidebar(30%) + Detail(70%) + StatusBar |
| `tui/components/StatusBar.tsx` | 底部状态栏，Server 状态动态颜色 |
| `tui/app.tsx` | 顶层状态机：Selector ↔ Dashboard 切换 |

### Phase 3：文件树 + 编辑器联动

**任务：左栏资源管理 + 右栏元数据/日志双模式。**

| 文件 | 职责 |
|------|------|
| `tui/components/FileTree.tsx` | 文件树组件，支持展开/折叠、键盘导航 |
| `tui/components/DetailPanel.tsx` | 右栏：元数据显示 / 日志滚动双模式 |
| `tui/components/LogOutput.tsx` | 指令执行时的实时日志滚动组件 |
| `lib/editor.ts` | 编辑器调用封装（spawn 系统编辑器，等待退出） |

**编辑器联动流程：**
```
选中文件 → 按 Enter → spawn($EDITOR, [filePath])
  → 监听 exit 事件 → 刷新文件树 → 重新显示该文件元数据
```

### Phase 4：Server 管理

**任务：启动/停止服务器 + StatusBar 动态同步。**

| 文件 | 职责 |
|------|------|
| `lib/server-manager.ts` | 服务器进程管理（start/stop/isRunning） |
| `tui/components/StatusBar.tsx`（扩展） | 实时显示 Server 状态（RUNNING=绿，STOPPED=红）|

### Phase 5：Polish

- 优化 UI 配色（chalk/Ink 颜色变量）
- 窗口 Resize 自适应
- 异常处理（路径不存在、编辑器未配置等）

---

## 5. 核心数据结构

### SiteConfig（全局配置 ~/.memoria/config.json）

```typescript
interface SiteConfig {
  recentSites: { root: string; name: string; lastOpened: number }[];
  defaultEditor: string; // 系统编辑器路径
}
```

### FileTreeNode（文件树节点）

```typescript
interface FileTreeNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: FileTreeNode[];
  expanded?: boolean;
}
```

### DetailItem（元数据展示对象）

```typescript
interface DetailItem {
  type: 'directory' | 'blog' | 'vlog' | 'photo';
  title: string;
  date?: string;
  tags?: string[];
  path: string;
  // content-specific
  description?: string;
  video?: string;
  photos?: { url: string; caption: string }[];
}
```

### LogEntry（指令日志条目）

```typescript
interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}
```

---

## 6. Agent 执行指令

每步完成后提交代码，由波士确认后再进行下一步。

**Step 1（Phase 2）：Layout 骨架**
- 实现 `tui/components/Layout.tsx`：Header + 左右分栏 + StatusBar 四区布局
- 实现 `tui/components/StatusBar.tsx`：动态 Server 状态颜色
- 重构 `tui/app.tsx`：整合 Layout，保持 Selector/Dashboard 切换能力

**Step 2（Phase 3）：文件树 + 编辑器**
- 实现 `tui/components/FileTree.tsx`：可展开/折叠的文件树，上下键导航
- 实现 `lib/editor.ts`：spawn 系统编辑器，等待退出
- 实现 `tui/components/DetailPanel.tsx`：元数据展示（空闲状态）
- 文件树选中 + `Enter` → 编辑器联动 → 刷新界面

**Step 3（Phase 3）：日志模式**
- 实现 `tui/components/LogOutput.tsx`：实时日志滚动组件
- `executeCmd()` 时右栏切换为日志模式
- `/generate`（`/b`）日志流式显示在右栏

**Step 4（Phase 4）：Server 管理**
- 实现 `lib/server-manager.ts`：`startServer()` / `stopServer()` / `isRunning()`
- `P` 键 → startServer + StatusBar RUNNING
- `S` 键 → stopServer + StatusBar STOPPED

**Step 5（Phase 5）：Polish**
- 配色优化、Resize 自适应、异常处理

---

## 7. 验收标准（Definition of Done）

- [ ] **布局规范**：Header + Sidebar(30%) + Detail(70%) + StatusBar 符合示意图
- [ ] **文件树**：blogs/vlogs/photos/public 四个节点，可展开/折叠，`Enter` 唤起编辑器
- [ ] **编辑器联动**：选中文件 → `Enter` → 编辑器打开 → 退出后界面刷新
- [ ] **元数据显示**：空闲时右栏显示选中目标的标题/日期/标签/路径
- [ ] **日志滚动**：执行 `/generate`（`/b`）时右栏实时滚动显示构建日志
- [ ] **服务器管理**：`P` 启动（StatusBar RUNNING）→ `S` 停止（StatusBar STOPPED）
- [ ] **命令面板**：`/` 唤起，支持 fuzzy 搜索，执行指令
- [ ] **流程闭环**：启动 → 选择站点 → 资源管理 → 构建/预览 → 退出
- [ ] **稳定性**：无内存泄漏，终端 Resize 不导致 UI 崩坏