<template>
  <div class="welcome-page">
    <div class="welcome-hero">
      <div class="welcome-icon">🫘</div>
      <h1>Memoria</h1>
      <p class="welcome-tagline">轻量级静态博客 — 桌面写作软件</p>
    </div>

    <div class="welcome-actions">
      <button class="action-card" @click="createSite">
        <span class="action-icon">✨</span>
        <span class="action-title">新建站点</span>
        <span class="action-desc">创建一个新的博客站点</span>
      </button>

      <button class="action-card" @click="openSite">
        <span class="action-icon">📂</span>
        <span class="action-title">打开站点</span>
        <span class="action-desc">打开已有的 Memoria 站点</span>
      </button>
    </div>

    <!-- Recent Sites -->
    <div v-if="recentSites.length > 0" class="recent-section">
      <h2 class="recent-title">最近打开的站点</h2>
      <div class="recent-list">
        <div
          v-for="site in recentSites"
          :key="site.path"
          class="recent-item"
          @click="openRecentSite(site.path)"
        >
          <div class="recent-item-icon">📦</div>
          <div class="recent-item-info">
            <div class="recent-item-name">{{ site.name }}</div>
            <div class="recent-item-path">{{ site.path }}</div>
          </div>
          <div class="recent-item-stats">
            <span>📝 {{ site.stats.blogs }}</span>
            <span>🎬 {{ site.stats.vlogs }}</span>
            <span>📷 {{ site.stats.photos }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Site Dialog -->
    <div v-if="showCreateDialog" class="dialog-overlay" @click.self="showCreateDialog = false">
      <div class="dialog">
        <h2>新建站点</h2>
        <div class="form-group">
          <label>站点名称</label>
          <input v-model="newSiteName" class="form-input" placeholder="我的博客" />
        </div>
        <div class="form-group">
          <label>保存位置</label>
          <div class="path-picker">
            <input v-model="newSitePath" class="form-input" placeholder="选择目录..." readonly />
            <button class="btn btn-secondary" @click="pickDirectory">选择</button>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="showCreateDialog = false">取消</button>
          <button class="btn btn-primary" @click="confirmCreate" :disabled="!newSiteName || !newSitePath">
            创建
          </button>
        </div>
        <p v-if="createError" class="error-msg">{{ createError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const recentSites = ref<SiteInfo[]>([])
const showCreateDialog = ref(false)
const newSiteName = ref('')
const newSitePath = ref('')
const createError = ref('')

onMounted(async () => {
  if (window.memoriaAPI) {
    recentSites.value = await window.memoriaAPI.site.listRecent()
  }
})

async function createSite() {
  newSiteName.value = ''
  newSitePath.value = ''
  createError.value = ''
  showCreateDialog.value = true
}

async function pickDirectory() {
  if (window.memoriaAPI) {
    const dir = await window.memoriaAPI.dialog.openDirectory()
    if (dir) {
      newSitePath.value = dir
    }
  }
}

async function confirmCreate() {
  if (!newSiteName.value || !newSitePath.value) return
  createError.value = ''

  if (window.memoriaAPI) {
    try {
      const fullPath = `${newSitePath.value}/${newSiteName.value}`
      await window.memoriaAPI.site.create(newSiteName.value, fullPath)
      showCreateDialog.value = false
      router.push('/dashboard')
    } catch (err: any) {
      createError.value = err.message || '创建失败'
    }
  }
}

async function openSite() {
  if (window.memoriaAPI) {
    const dir = await window.memoriaAPI.dialog.openDirectory()
    if (dir) {
      await openRecentSite(dir)
    }
  }
}

async function openRecentSite(path: string) {
  if (window.memoriaAPI) {
    try {
      const site = await window.memoriaAPI.site.open(path)
      if (site) {
        router.push('/dashboard')
      }
    } catch (err: any) {
      createError.value = err.message || '打开失败'
    }
  }
}
</script>

<style scoped>
.welcome-page {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; min-height: 100vh; padding: 2rem;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: #fff;
}
.welcome-hero { text-align: center; margin-bottom: 3rem; }
.welcome-icon { font-size: 4rem; margin-bottom: 0.5rem; }
.welcome-hero h1 { font-size: 2.5rem; font-weight: 800; color: #e94560; }
.welcome-tagline { color: #aaa; margin-top: 0.5rem; font-size: 1rem; }

.welcome-actions { display: flex; gap: 1rem; margin-bottom: 2rem; }
.action-card {
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
  border-radius: 12px; padding: 1.5rem 2rem; cursor: pointer; text-align: center;
  transition: all 0.2s; min-width: 180px;
}
.action-card:hover { background: rgba(255,255,255,0.15); transform: translateY(-2px); }
.action-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
.action-title { font-weight: 600; font-size: 1rem; display: block; }
.action-desc { font-size: 0.8rem; color: #999; margin-top: 0.3rem; display: block; }

.recent-section { width: 100%; max-width: 600px; }
.recent-title { font-size: 1rem; color: #aaa; margin-bottom: 0.8rem; }
.recent-list { display: flex; flex-direction: column; gap: 0.5rem; }
.recent-item {
  display: flex; align-items: center; gap: 0.8rem;
  background: rgba(255,255,255,0.06); border-radius: 8px;
  padding: 0.8rem 1rem; cursor: pointer; transition: background 0.2s;
}
.recent-item:hover { background: rgba(255,255,255,0.12); }
.recent-item-icon { font-size: 1.5rem; }
.recent-item-info { flex: 1; }
.recent-item-name { font-weight: 500; }
.recent-item-path { font-size: 0.75rem; color: #888; }
.recent-item-stats { display: flex; gap: 0.8rem; font-size: 0.8rem; color: #aaa; }

.dialog-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.dialog { background: #fff; color: #333; border-radius: 12px; padding: 2rem; width: 420px; max-width: 90vw; }
.dialog h2 { margin-bottom: 1.2rem; }
.path-picker { display: flex; gap: 0.5rem; }
.path-picker .form-input { flex: 1; }
.dialog-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.5rem; }
.error-msg { color: #e74c3c; font-size: 0.85rem; margin-top: 0.8rem; }
</style>
