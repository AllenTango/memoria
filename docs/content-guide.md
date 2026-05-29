# 内容格式说明

Memoria 内容分为三类：**博客（blogs）**、**视频（vlogs）**、**相册（photos）**，均为 Markdown 文件，前置 YAML frontmatter 元数据。

---

## 博客（blogs）

### frontmatter 规范

```yaml
---
title: "文章标题"
date: "2026-05-11"
tags: ["标签1", "标签2"]
type: "blog"
description: "简短描述（SEO 摘要，可选）"
---
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | ✅ | 文章标题 |
| `date` | ✅ | 日期，格式 YYYY-MM-DD |
| `tags` | ✅ | 标签数组，用于筛选 |
| `type` | ✅ | 内容类型，写 `blog` |
| `description` | ❌ | 简短描述，列表页摘要用 |

### 正文示例

```markdown
---
title: "小芽第一次上线"
date: "2026-05-11"
tags: ["里程碑", "日常"]
---

这是正文内容，支持完整 Markdown 语法。

## 二级标题

- 列表项 1
- 列表项 2

![图片描述](/public/images/photo.jpg)

> 引用块

代码块：

```javascript
console.log('Hello');
```
```

---

## 视频记录（vlogs）

### frontmatter 规范

```yaml
---
title: "视频标题"
date: "2026-05-20"
tags: ["视频", "记录"]
type: "vlog"
video: "https://www.youtube.com/embed/xxx"
thumbnail: "/public/images/thumb.jpg"
description: "简短描述"
---
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | ✅ | 视频标题 |
| `date` | ✅ | 日期 |
| `tags` | ✅ | 标签数组 |
| `type` | ✅ | 内容类型，写 `vlog` |
| `video` | ✅ | 视频地址，支持 YouTube embed URL 或本地路径 `/public/videos/xxx.mp4` |
| `thumbnail` | ❌ | 缩略图，本地或远程 URL |
| `description` | ❌ | 简短描述 |

### 视频来源

**本地视频**：将 `.mp4` / `.webm` 文件放入 `public/videos/`，frontmatter 中填：

```
video: "/public/videos/my-video.mp4"
```

**YouTube**：填入 YouTube embed URL：

```
video: "https://www.youtube.com/embed/abc123xyz"
```

### 正文示例

```markdown
---
title: "项目启动记录"
date: "2026-05-10"
video: "/public/videos/kickoff.mp4"
thumbnail: "/public/images/kickoff-thumb.jpg"
description: "Memoria 项目启动第一天"
---

这一天我们决定做一个自己的记录站...
```

---

## 相册（photos）

### frontmatter 规范

```yaml
---
title: "相册标题"
date: "2026-05-01"
tags: ["相册", "旅行"]
type: "photo"
photos:
  - url: "/public/images/photo-1.jpg"
    caption: "照片描述1"
  - url: "https://example.com/remote.jpg"
    caption: "远程图片"
---
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | ✅ | 相册标题 |
| `date` | ✅ | 日期 |
| `tags` | ✅ | 标签数组 |
| `type` | ✅ | 内容类型，写 `photo` |
| `photos` | ✅ | 照片数组，每项 `url` + `caption`（可选） |

### url 支持

本地图片（放入 `public/images/`）：

```
url: "/public/images/beach-sunset.jpg"
```

远程图片（支持任意公开 URL）：

```
url: "https://example.com/photo.jpg"
```

两者可混用。

### 正文示例

```markdown
---
title: "五一假期纪录"
date: "2026-05-01"
photos:
  - url: "/public/images/beach.jpg"
    caption: "海边日落"
  - url: "/public/images/food.jpg"
    caption: "夜市美食"
---

五一假期去了海边，第一次看日出...
```

---

## 通用规范

- 所有 Markdown 文件后缀为 `.md`
- 文件名格式：`YYYY-MM-DD-slug.md`（CLI 自动生成此格式）
- `content/about.md` 为关于页面，格式同上，但放在 `content/` 根目录
- 标签名中英文均可，不要使用特殊字符