# 测试指南

本文档面向开发者，介绍如何运行和理解 Memoria 的测试。

---

## 测试结构

```
tests/
├── memoria-integration-test.ts   # 完整 CLI 集成测试（主力）
├── cli.test.ts                  # vitest 单元测试
├── vitest.config.mts            # vitest 配置
├── fixtures/                    # 临时测试站点（自动生成，自动清理）
└── logs/                        # 测试日志
```

---

## 快速开始

### 1. 构建项目

```bash
npm run build
```

> 每次修改源码后都需要重新构建再测试。

### 2. 运行集成测试

```bash
npx tsx tests/memoria-integration-test.ts
```

测试会自动：
- 在 `tests/fixtures/` 下创建隔离的临时站点目录
- 依次测试 `init` / `generate` / `clean` / `new blog/vlog/photo` 等命令
- 验证 frontmatter 格式、type 字段、三种内容类型渲染
- **测试完成后自动清理临时目录**

### 3. 查看日志

测试日志保存在 `tests/logs/memoria-test-<timestamp>.log`

```bash
# 最新日志
ls -lt tests/logs/
tail -f tests/logs/*.log
```

---

## 测试覆盖内容

### CLI 命令测试

| 命令 | 测试内容 |
|------|---------|
| `memoria --version` | 版本号输出 |
| `memoria help` | 帮助信息完整 |
| `memoria init .` | 站点初始化（当前目录） |
| `memoria init <name>` | 站点初始化（子目录） |
| `memoria generate` | 构建站点 + 输出文件验证 |
| `memoria clean` | 清理 dist 目录 |
| `memoria new blog` | 交互式创建博客（type 字段验证） |
| `memoria new vlog` | 交互式创建影像（type 字段验证） |
| `memoria new photo` | 交互式创建相册（type 字段验证） |
| `memoria theme list` | 主题列表输出 |
| `memoria bundle` | 构建打包（仅 zip 可用时） |
| re-init 报错 | 重复初始化应报错 |

### 内容渲染测试

- **Blog** — title / date / tags / type:blog / description
- **Vlog** — title / date / tags / type:vlog / video / thumbnail / description
- **Photo** — title / date / tags / type:photo / photos[] / caption / description

### frontmatter 格式测试

- `type` 字段存在且正确
- `init` 生成的示例文档格式与参考一致
- `new` 命令创建的文档格式与参考一致

---

## 本地手动测试

### 快速冒烟测试

```bash
# 1. 构建
npm run build

# 2. npm link（全局可用）
npm link

# 3. 在临时目录测试
mkdir /tmp/test-memoria && cd /tmp/test-memoria
memoria init .
memoria new blog "测试博客"
memoria generate
memoria clean
```

### 交互式输入模拟原理

集成测试使用 `spawn` + `stdin.write` 模拟用户在终端的交互输入：

```typescript
function memoriaInteractive(args: string[], cwd: string, inputs: string[]) {
  const child = spawn('node', [memoriaBin, ...args], { cwd });
  child.stdin.write(inputs[0] + '\n');  // 自动写入第一行
  child.stdin.write(inputs[1] + '\n');  // 自动写入第二行
  // ...
}
```

---

## 注意事项

- 测试依赖 `npm run build` 先执行，构建产物在 `dist/` 目录
- 集成测试会自动创建和清理 `tests/fixtures/test-*/` 临时目录
- 如需跳过某个测试项，可临时修改 `memoria-integration-test.ts`
- 交互式命令（`new blog/vlog/photo`）在非 TTY 模式下会等待 readline timeout，每次约 30 秒，属正常现象

---

## 在线文档

文档通过 GitHub Pages 自动托管，访问：

```
https://<username>.github.io/<repo-name>/
```

推送 `main` 分支后自动部署，触发来源：
- `docs/` 目录下的任意文件变更
- 本 workflow 本身的变更

---

## 添加新测试

在 `memoria-integration-test.ts` 的 `main()` 函数中添加新的测试块：

```typescript
logSection('新测试项');
{
  const dir = mkTempDir('test-my-new-feature');
  await memoria(['init', '.'], dir);
  const t0 = Date.now();
  const r = await memoria(['my-command'], dir);
  record('my new feature', r.status === 0, Date.now() - t0);
}
```

`record(name, passed, duration, error)` 会自动写入结果和日志。