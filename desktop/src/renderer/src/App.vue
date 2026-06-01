<template>
  <div class="app-container">
    <!-- Sidebar (hidden on welcome page) -->
    <aside v-if="showSidebar" class="sidebar">
      <div class="sidebar-header">
        <h1 class="sidebar-title">Memoria</h1>
        <p v-if="currentSite" class="sidebar-sitename">{{ currentSite.name }}</p>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/dashboard" class="nav-item">
          <span class="nav-icon">📊</span>
          <span class="nav-label">仪表盘</span>
        </router-link>
        <router-link to="/content" class="nav-item">
          <span class="nav-icon">📝</span>
          <span class="nav-label">内容管理</span>
        </router-link>
        <router-link to="/preview" class="nav-item">
          <span class="nav-icon">👁</span>
          <span class="nav-label">站点预览</span>
        </router-link>
        <router-link to="/settings" class="nav-item">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label">设置</span>
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <button class="btn-text" @click="closeSite">关闭站点</button>
        <router-link to="/" class="btn-text">返回首页</router-link>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main :class="['main-area', { 'main-full': !showSidebar }]">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentSite = ref<SiteInfo | null>(null)

const showSidebar = computed(() => {
  return router.currentRoute.value.path !== '/'
})

async function loadSite() {
  if (window.memoriaAPI) {
    currentSite.value = await window.memoriaAPI.site.getCurrent()
  }
}

async function closeSite() {
  if (window.memoriaAPI) {
    await window.memoriaAPI.site.close()
    currentSite.value = null
    router.push('/')
  }
}

onMounted(loadSite)
</script>

<style>
/* ── Global Reset & Layout ───────────────────────────────────────── */
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #app { height: 100%; width: 100%; overflow: hidden; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f5f5f5;
  color: #333;
  -webkit-font-smoothing: antialiased;
}

.app-container { display: flex; height: 100%; }

/* ── Sidebar ────────────────────────────────────────────────────── */
.sidebar {
  width: 220px;
  background: #1a1a2e;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.sidebar-header { padding: 1.5rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
.sidebar-title { font-size: 1.3rem; font-weight: 700; color: #e94560; }
.sidebar-sitename { font-size: 0.8rem; color: #aaa; margin-top: 0.3rem; }
.sidebar-nav { flex: 1; padding: 0.5rem 0; }
.nav-item {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.7rem 1rem; color: #ccc; text-decoration: none;
  transition: background 0.2s;
}
.nav-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
.nav-item.router-link-active { background: rgba(233,69,96,0.15); color: #e94560; }
.nav-icon { font-size: 1.1rem; }
.nav-label { font-size: 0.9rem; }
.sidebar-footer { padding: 1rem; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 0.5rem; }
.btn-text { background: none; border: none; color: #999; cursor: pointer; font-size: 0.85rem; text-decoration: none; }
.btn-text:hover { color: #e94560; }

/* ── Main Area ──────────────────────────────────────────────────── */
.main-area { flex: 1; overflow-y: auto; padding: 2rem; }
.main-full { padding: 0; }

/* ── Common Styles ──────────────────────────────────────────────── */
.page-header { margin-bottom: 1.5rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; }
.page-header p { font-size: 0.85rem; color: #888; margin-top: 0.3rem; }

.btn {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.5rem 1rem; border-radius: 6px; border: none;
  font-size: 0.85rem; cursor: pointer; transition: all 0.2s;
}
.btn-primary { background: #e94560; color: #fff; }
.btn-primary:hover { background: #d63851; }
.btn-secondary { background: #e0e0e0; color: #333; }
.btn-secondary:hover { background: #ccc; }
.btn-success { background: #27ae60; color: #fff; }
.btn-success:hover { background: #219a52; }
.btn-danger { background: #e74c3c; color: #fff; }
.btn-danger:hover { background: #c0392b; }

.card {
  background: #fff; border-radius: 8px; padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.form-group { margin-bottom: 1rem; }
.form-group label { display: block; font-size: 0.85rem; font-weight: 500; color: #555; margin-bottom: 0.3rem; }
.form-input, .form-textarea {
  width: 100%; padding: 0.5rem 0.7rem; border: 1px solid #ddd; border-radius: 6px;
  font-size: 0.9rem; font-family: inherit;
}
.form-input:focus, .form-textarea:focus { outline: none; border-color: #e94560; box-shadow: 0 0 0 2px rgba(233,69,96,0.15); }
.form-textarea { resize: vertical; min-height: 120px; }

.tag-input { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
.tag { display: inline-flex; align-items: center; gap: 0.3rem; background: #f0f0f0; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.8rem; }
.tag .tag-remove { cursor: pointer; color: #999; font-size: 0.9rem; }
.tag .tag-remove:hover { color: #e74c3c; }
</style>
