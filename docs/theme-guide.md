# 主题开发指南

## 主题列表

> init 后所有内置主题位于站点 `themes/` 目录。


| 主题 | 风格 | 说明 |
|------|------|------|
| `dracula` | 暗黑紫 | 默认主题，基于 Dracula 官方配色 |
| `nord` | 北欧清新 | 冷调薄荷白 + 青绿强调 |
| `peach` | 温暖杂志风 | 奶油杏色 + 深棕对比 |
| `mint` | 活力薄荷 | 荧光薄荷绿 + 橙红撞色 |

## 切换主题

```bash
# 交互式选择
memoria theme

# 直接指定主题构建
memoria generate --theme nord  # 或交互式选择: memoria theme
```

主题选择会写入 `.themerc` 文件，后续 `memoria generate` 自动使用该主题。

## 同步内置主题

内置主题会随 memoria 更新而改进。`memoria init` 时主题被复制到站点，之后需要手动同步以获取更新。

```bash
memoria sync   # 同步最新内置主题到站点
```

同步时会对比站点已安装的主题与源码的差异：
- 若主题文件无变化 → 直接覆盖
- 若主题曾被修改 → 提示确认是否覆盖（详见 `memoria sync --help`）

同步完成后运行 `memoria generate` 重新构建。

## 主题结构

每个主题目录下包含三个文件：

| 文件 | 作用 |
|------|------|
| `colors.css` | 配色变量层（CSS Custom Properties） |
| `layout.css` | 布局与组件样式（使用 colors.css 中的变量） |
| `template.html` | HTML 页面骨架 |

## 新增自定义主题

### 步骤 1：创建目录

```
themes/my-theme/
├── colors.css
├── layout.css
└── template.html
```

### 步骤 2：编写 colors.css

`colors.css` 定义所有 CSS 颜色变量，分两层：

**① 主题原生变量**（色值本身）：

```css
--my-bg:        #1a1a2e;
--my-surface:   #16213e;
--my-text:      #eaeaea;
--my-muted:     #a0a0a0;
--my-accent:    #e94560;
--my-cyan:      #3498db;
--my-orange:    #f39c12;
--my-pink:      #ff6b9d;
--my-border:    #2a2a4a;
```

**② 语义别名**（必须定义，供 layout.css 使用）：

```css
--color-bg:           var(--my-bg);
--color-surface:      var(--my-surface);
--color-text:         var(--my-text);
--color-text-muted:   var(--my-muted);
--color-accent:       var(--my-accent);
--color-accent-warm:  var(--my-orange);
--color-accent-cool:  var(--my-cyan);
--color-accent-pink:  var(--my-pink);
--color-border:       var(--my-border);
--color-link:         var(--my-cyan);
--color-heading:      var(--my-accent);
--color-nav-bg:       rgba(26, 26, 46, 0.95);
--color-nav-mobile:   rgba(26, 26, 46, 0.97);
--color-caption-bg:   rgba(26, 26, 46, 0.8);
--color-overlay-btn:  rgba(26, 26, 46, 0.8);
```

> **重要**：`layout.css` 中**不直接写颜色值**，所有颜色必须通过 `var(--color-*)` 引自 `colors.css`。

### 步骤 3：编写 layout.css

从现有主题（如 `themes/dracula/layout.css`）复制，替换其中所有硬编码颜色为语义变量。

常见替换模式：

```css
/* ❌ 不要这样写 */
background-color: #282a36;
color: #f8f8f2;

/* ✅ 应该这样写 */
background-color: var(--color-bg);
color: var(--color-text);
```

### 步骤 4：复制 template.html

从现有主题复制 `template.html` 到新主题目录，按需修改（可选）。

### 步骤 5：启用

```bash
# 交互式选择
memoria theme

# 或手动写入
echo "my-theme" > .themerc
```

## 主题配色参考

### Dracula

```
Background:   #282A36
Current Line: #44475A
Foreground:  #F8F8F2
Comment:      #6272A4
Cyan:         #8BE9FD
Green:        #50FA7B
Orange:       #FFB86C
Pink:         #FF79C6
Purple:       #BD93F9
Red:          #FF5555
Yellow:       #F1FA8C
```

### Nord

```
Polar Night:  #2E3440 / #3B4252 / #434C5E / #4C566A
Snow Storm:   #D8DEE9 / #E5E9F0 / #ECEFF4
Aurora:       #A3BE8C / #EBCB8B / #E89B8C / #ADBBDA
```

### Peach

```
Cream:        #FDF0E8
Surface:      #FAE5D8
Text:         #2C1810
Accent:       #C4622D
Warm:         #8B4513
Cool:         #4A6FA5
```

### Mint

```
Background:   #EEFFF4
Surface:      #C8FFE0
Text:         #061A1C
Accent:       #FF4D00
Green:        #00D68F
```

---

## 验证主题

```bash
memoria generate     # 使用当前 .themerc 中的主题构建
memoria generate --theme nord   # 指定 nord 主题构建并预览
```

检查 `dist/` 目录下 `colors.css` 和 `layout.css` 是否已更新为新主题内容。