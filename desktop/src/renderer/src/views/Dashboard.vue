<template>
  <div class="dashboard">
    <div class="page-header">
      <h1>仪表盘</h1>
      <p v-if="currentSite">{{ currentSite.name }} — {{ currentSite.path }}</p>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">{{ stats.blogs }}</div>
        <div class="stat-label">随笔</div>
        <button class="btn btn-sm btn-primary" @click="newContent('blog')">+ 新建</button>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.vlogs }}</div>
        <div class="stat-label">影像</div>
        <button class="btn btn-sm btn-primary" @click="newContent('vlog')">+ 新建</button>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.photos }}</div>
        <div class="stat-label">相册</div>
        <button class="btn btn-sm btn-primary" @click="newContent('photo')">+ 新建</button>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.tags }}</div>
        <div class="stat-label">标签</div>
      </div>
    </div>

    <!-- Actions -->
    <div class="action-bar">
      <button class="btn btn-success" @click="buildSite" :disabled="building">
        {{ building ? '构建中...' : '🚀 构建站点' }}
      </button>
      <button class="btn btn-secondary" @click="startPreview">
        👁 预览站点
      </button>
    </div>

    <!-- Build result -->
    <div v-if="lastBuild" :class="['build-result', lastBuild.success ? 'build-success' : 'build-error']">
      <p v-if="lastBuild.success">
        ✅ 构建成功 — {{ lastBuild.stats.blogs }} 篇随笔、{{ lastBuild.stats.vlogs }} 个视频、{{ lastBuild.stats.photos }} 个相册
      </p>
      <p v-else>❌ 构建失败: {{ lastBuild.error }}</p>
    </div>

    <!-- Recent Content -->
    <div class="section">
      <h2>最近内容</h2>
      <div v-if="recentItems.length === 0" class="empty-state">
        <p>还没有内容，点击上方按钮开始写作吧</p>
      </div>
      <div v-else class="content-list">
        <div v-for="item in recentItems" :key="item.path" class="content-item"
             @click="editContent(item)">
          <span class="content-type-badge" :class="'type-' + item.type">
            {{ typeLabel(item.type) }}
          </span>
          <div class="content-item-info">
            <div class="content-item-title">{{ item.title }}</div>
            <div class="content-item-meta">{{ item.date }} · {{ item.tags?.join(', ') || '无标签' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentSite = ref<SiteInfo | null>(null)
const stats = ref({ blogs: 0, vlogs: 0, photos: 0, tags: 0 })
const recentItems = ref<ContentItem[]>([])
const building = ref(false)
const lastBuild = ref<BuildResult | null>(null)

function typeLabel(type: string): string {
  return { blog: '随笔', vlog: '影像', photo: '相册' }[type] || type
}

function newContent(type: string) {
  router.push(`/editor/${type}`)
}

function editContent(item: ContentItem) {
  router.push({ name: 'editor', query: { path: item.path, type: item.type } })
}

async function loadData() {
  if (!window.memoriaAPI) return

  currentSite.value = await window.memoriaAPI.site.getCurrent()
  if (!currentSite.value) {
    router.push('/')
    return
  }

  const items = await window.memoriaAPI.content.list()
  recentItems.value = items.slice(0, 10)

  const tagSet = new Set<string>()
  items.forEach(i => (i.tags || []).forEach(t => tagSet.add(t)))

  stats.value = {
    blogs: items.filter(i => i.type === 'blog').length,
    vlogs: items.filter(i => i.type === 'vlog').length,
    photos: items.filter(i => i.type === 'photo').length,
    tags: tagSet.size
  }

  lastBuild.value = await window.memoriaAPI.build.getLastResult()
}

async function buildSite() {
  if (!window.memoriaAPI) return
  building.value = true
  try {
    lastBuild.value = await window.memoriaAPI.build.run()
  } finally {
    building.value = false
  }
}

async function startPreview() {
  if (!window.memoriaAPI) return

  // Build first if needed
  if (!lastBuild.value?.success) {
    await buildSite()
  }

  router.push('/preview')
}

onMounted(loadData)
</script>

<style scoped>
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
@media (max-width: 600px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
.stat-card { background: #fff; border-radius: 10px; padding: 1.2rem; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.stat-number { font-size: 2rem; font-weight: 700; color: #e94560; }
.stat-label { font-size: 0.85rem; color: #888; margin: 0.3rem 0; }
.btn-sm { padding: 0.3rem 0.7rem; font-size: 0.75rem; }

.action-bar { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }

.build-result { padding: 0.8rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; }
.build-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.build-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }

.section { margin-top: 1.5rem; }
.section h2 { font-size: 1.1rem; margin-bottom: 0.8rem; }

.empty-state { text-align: center; padding: 3rem; color: #aaa; }

.content-list { display: flex; flex-direction: column; gap: 0.4rem; }
.content-item {
  display: flex; align-items: center; gap: 0.8rem;
  background: #fff; border-radius: 6px; padding: 0.8rem 1rem;
  cursor: pointer; transition: box-shadow 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.content-item:hover { box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
.content-type-badge {
  font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 4px;
  white-space: nowrap; flex-shrink: 0;
}
.type-blog { background: #e3f2fd; color: #1565c0; }
.type-vlog { background: #fce4ec; color: #c62828; }
.type-photo { background: #e8f5e9; color: #2e7d32; }
.content-item-info { flex: 1; overflow: hidden; }
.content-item-title { font-weight: 500; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.content-item-meta { font-size: 0.75rem; color: #999; }
</style>
