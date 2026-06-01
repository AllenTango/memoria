<template>
  <div class="preview-page">
    <div class="preview-toolbar">
      <div class="toolbar-info">
        <h1>站点预览</h1>
        <span v-if="previewUrl" class="preview-url">{{ previewUrl }}</span>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-secondary" @click="buildFirst" :disabled="building">
          {{ building ? '构建中...' : '🔄 重新构建' }}
        </button>
        <button v-if="!serverRunning" class="btn btn-success" @click="startServer">
          ▶ 启动预览
        </button>
        <button v-else class="btn btn-danger" @click="stopServer">
          ⏹ 停止预览
        </button>
      </div>
    </div>

    <!-- Preview Iframe -->
    <div class="preview-viewport">
      <div class="viewport-controls">
        <label class="viewport-label">预览尺寸：</label>
        <button :class="['viewport-btn', { active: viewportSize === 'mobile' }]" @click="viewportSize = 'mobile'">
          📱 手机
        </button>
        <button :class="['viewport-btn', { active: viewportSize === 'tablet' }]" @click="viewportSize = 'tablet'">
          📟 平板
        </button>
        <button :class="['viewport-btn', { active: viewportSize === 'desktop' }]" @click="viewportSize = 'desktop'">
          🖥 桌面
        </button>
        <a v-if="previewUrl" :href="previewUrl" target="_blank" class="btn btn-sm btn-secondary">在浏览器中打开 ↗</a>
      </div>
      <div class="iframe-wrapper" :class="'viewport-' + viewportSize">
        <div v-if="!serverRunning" class="preview-placeholder">
          <p>点击「启动预览」查看站点</p>
        </div>
        <iframe v-else :src="previewUrl" frameborder="0"></iframe>
      </div>
    </div>

    <!-- Page Navigation -->
    <div v-if="serverRunning" class="preview-nav">
      <button v-for="page in pages" :key="page.href"
              :class="['nav-page-btn', { active: currentPage === page.href }]"
              @click="navigatePage(page.href)">
        {{ page.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const previewUrl = ref<string | null>(null)
const serverRunning = ref(false)
const building = ref(false)
const viewportSize = ref<'mobile' | 'tablet' | 'desktop'>('desktop')
const currentPage = ref('/')

const pages = [
  { label: '首页', href: '/' },
  { label: '随笔', href: '/blogs.html' },
  { label: '影像', href: '/vlogs.html' },
  { label: '相册', href: '/photos.html' },
  { label: '关于', href: '/about.html' }
]

function navigatePage(href: string) {
  currentPage.value = href
  // Reload iframe by updating src
  if (previewUrl.value) {
    previewUrl.value = `http://localhost:${getPort()}${href}`
  }
}

function getPort(): string {
  if (!previewUrl.value) return '3000'
  const match = previewUrl.value.match(/:(\d+)/)
  return match ? match[1] : '3000'
}

async function buildFirst() {
  if (!window.memoriaAPI) return
  building.value = true
  try {
    await window.memoriaAPI.build.run()
    if (serverRunning.value) {
      // Restart server to pick up new build
      await stopServer()
      await startServer()
    }
  } finally {
    building.value = false
  }
}

async function startServer() {
  if (!window.memoriaAPI) return

  // Ensure build exists
  const lastResult = await window.memoriaAPI.build.getLastResult()
  if (!lastResult?.success) {
    building.value = true
    const result = await window.memoriaAPI.build.run()
    building.value = false
    if (!result.success) return
  }

  try {
    const { port } = await window.memoriaAPI.preview.start()
    previewUrl.value = `http://localhost:${port}/`
    serverRunning.value = true
    currentPage.value = '/'

    // Listen for content changes
    window.memoriaAPI.preview.onChange(() => {
      // Auto-rebuild and refresh
      rebuildAndRefresh()
    })
  } catch (err: any) {
    console.error('Preview start failed:', err)
  }
}

async function stopServer() {
  if (!window.memoriaAPI) return
  await window.memoriaAPI.preview.stop()
  serverRunning.value = false
  previewUrl.value = null
}

let refreshTimer: any = null

async function rebuildAndRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(async () => {
    await window.memoriaAPI?.build.run()
    if (previewUrl.value) {
      previewUrl.value = previewUrl.value + '?t=' + Date.now()
    }
  }, 500)
}

onUnmounted(() => {
  stopServer()
})
</script>

<style scoped>
.preview-page { display: flex; flex-direction: column; height: calc(100vh - 4rem); }
.preview-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 0.5rem; flex-shrink: 0;
}
.toolbar-info h1 { font-size: 1.2rem; }
.preview-url { font-size: 0.75rem; color: #888; }
.toolbar-actions { display: flex; gap: 0.3rem; }

.preview-viewport { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.viewport-controls {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.5rem 0; margin-bottom: 0.5rem; flex-shrink: 0;
}
.viewport-label { font-size: 0.8rem; color: #888; }
.viewport-btn {
  background: #fff; border: 1px solid #ddd; border-radius: 6px;
  padding: 0.25rem 0.6rem; font-size: 0.8rem; cursor: pointer;
}
.viewport-btn.active { background: #e94560; color: #fff; border-color: #e94560; }

.iframe-wrapper {
  flex: 1; background: #fff; border-radius: 8px; overflow: hidden;
  margin: 0 auto; transition: all 0.3s;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}
.iframe-wrapper iframe { width: 100%; height: 100%; }
.viewport-desktop { width: 100%; max-width: 100%; }
.viewport-tablet { width: 768px; max-width: 100%; }
.viewport-mobile { width: 375px; max-width: 100%; }

.preview-placeholder {
  display: flex; align-items: center; justify-content: center;
  height: 100%; color: #aaa; font-size: 1.1rem;
}

.preview-nav {
  display: flex; gap: 0.3rem; padding: 0.5rem 0;
  flex-shrink: 0; flex-wrap: wrap;
}
.nav-page-btn {
  background: #fff; border: 1px solid #ddd; border-radius: 6px;
  padding: 0.3rem 0.7rem; font-size: 0.8rem; cursor: pointer;
}
.nav-page-btn.active { background: #e94560; color: #fff; border-color: #e94560; }
</style>
