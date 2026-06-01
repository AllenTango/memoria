<template>
  <div class="content-list-page">
    <div class="page-header">
      <h1>内容管理</h1>
      <p>管理你的博客、影像和相册内容</p>
    </div>

    <!-- Type Filter -->
    <div class="filter-bar">
      <button
        v-for="t in contentTypes"
        :key="t.key"
        :class="['filter-btn', { active: filter === t.key }]"
        @click="filter = t.key"
      >
        {{ t.label }}
      </button>
      <div class="filter-spacer"></div>
      <button class="btn btn-primary" @click="createNew">+ 新建</button>
    </div>

    <!-- Content List -->
    <div v-if="filteredItems.length === 0" class="empty-state">
      <p>暂无内容，点击"新建"开始创作</p>
    </div>
    <div v-else class="items-list">
      <div v-for="item in filteredItems" :key="item.path" class="item-row">
        <span class="item-type-badge" :class="'type-' + item.type">{{ typeLabel(item.type) }}</span>
        <div class="item-info">
          <div class="item-title">{{ item.title }}</div>
          <div class="item-meta">{{ item.date }} · {{ item.tags?.join(', ') || '无标签' }}</div>
        </div>
        <div class="item-actions">
          <button class="btn btn-sm btn-secondary" @click="editItem(item)">编辑</button>
          <button class="btn btn-sm btn-danger" @click="deleteItem(item)">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const items = ref<ContentItem[]>([])
const filter = ref<string>('all')

const contentTypes = [
  { key: 'all', label: '全部' },
  { key: 'blog', label: '随笔' },
  { key: 'vlog', label: '影像' },
  { key: 'photo', label: '相册' }
]

const filteredItems = computed(() => {
  if (filter.value === 'all') return items.value
  return items.value.filter(i => i.type === filter.value)
})

function typeLabel(type: string): string {
  return { blog: '随笔', vlog: '影像', photo: '相册' }[type] || type
}

async function loadItems() {
  if (window.memoriaAPI) {
    items.value = await window.memoriaAPI.content.list()
  }
}

function createNew() {
  // Navigate to editor with the selected type
  const type = filter.value === 'all' ? 'blog' : filter.value
  router.push(`/editor/${type}`)
}

function editItem(item: ContentItem) {
  router.push({ name: 'editor', query: { path: item.path, type: item.type } })
}

async function deleteItem(item: ContentItem) {
  if (!confirm(`确定删除「${item.title}」？`)) return
  if (window.memoriaAPI) {
    await window.memoriaAPI.content.delete(item.path)
    await loadItems()
  }
}

onMounted(loadItems)
</script>

<style scoped>
.filter-bar { display: flex; align-items: center; gap: 0.3rem; margin-bottom: 1rem; flex-wrap: wrap; }
.filter-btn {
  background: #fff; border: 1px solid #ddd; border-radius: 20px;
  padding: 0.35rem 0.9rem; font-size: 0.82rem; cursor: pointer;
  transition: all 0.2s;
}
.filter-btn:hover { border-color: #e94560; }
.filter-btn.active { background: #e94560; color: #fff; border-color: #e94560; }
.filter-spacer { flex: 1; }

.empty-state { text-align: center; padding: 4rem 2rem; color: #aaa; }

.items-list { display: flex; flex-direction: column; }
.item-row {
  display: flex; align-items: center; gap: 0.8rem;
  background: #fff; padding: 0.8rem 1rem; border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s;
}
.item-row:hover { background: #fafafa; }
.item-type-badge {
  font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 4px;
  white-space: nowrap; flex-shrink: 0; min-width: 40px; text-align: center;
}
.type-blog { background: #e3f2fd; color: #1565c0; }
.type-vlog { background: #fce4ec; color: #c62828; }
.type-photo { background: #e8f5e9; color: #2e7d32; }
.item-info { flex: 1; overflow: hidden; }
.item-title { font-weight: 500; font-size: 0.9rem; }
.item-meta { font-size: 0.75rem; color: #999; margin-top: 0.15rem; }
.item-actions { display: flex; gap: 0.3rem; flex-shrink: 0; }
</style>
