<template>
  <div class="settings-page">
    <div class="page-header">
      <h1>设置</h1>
      <p>站点配置与主题管理</p>
    </div>

    <div class="settings-section">
      <h2>站点信息</h2>
      <div class="form-group">
        <label>站点名称</label>
        <input v-model="siteName" class="form-input" />
      </div>
      <div class="form-group">
        <label>作者</label>
        <input v-model="siteAuthor" class="form-input" />
      </div>
      <div class="form-group">
        <label>站点 URL</label>
        <input v-model="siteUrl" class="form-input" placeholder="https://example.com" />
      </div>
      <button class="btn btn-primary" @click="saveConfig">保存设置</button>
    </div>

    <div class="settings-section">
      <h2>主题</h2>
      <p class="section-desc">当前主题：{{ currentTheme }}</p>
      <div class="theme-grid">
        <div
          v-for="theme in themes"
          :key="theme"
          :class="['theme-card', { active: currentTheme === theme }]"
          @click="selectTheme(theme)"
        >
          <div class="theme-preview" :style="{ background: themeColors[theme]?.bg || '#f5f5f5' }">
            <div class="theme-preview-accent" :style="{ background: themeColors[theme]?.accent || '#e94560' }"></div>
          </div>
          <div class="theme-name">{{ theme }}</div>
        </div>
      </div>
      <p v-if="themeMessage" class="theme-msg">{{ themeMessage }}</p>
    </div>

    <div class="settings-section">
      <h2>关于</h2>
      <p class="section-desc">Memoria Desktop v1.0.0</p>
      <p class="section-desc">轻量级静态博客桌面写作软件</p>
      <p class="section-desc">基于 Electron + Vue 3</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const siteName = ref('')
const siteAuthor = ref('')
const siteUrl = ref('')
const currentTheme = ref('dracula')
const themes = ref(['dracula', 'mint', 'nord', 'peach'])
const themeMessage = ref('')

const themeColors: Record<string, { bg: string; accent: string }> = {
  dracula: { bg: '#282a36', accent: '#bd93f9' },
  mint: { bg: '#e8f5e9', accent: '#2e7d32' },
  nord: { bg: '#eef8f6', accent: '#00a896' },
  peach: { bg: '#fef3e2', accent: '#e07a5f' }
}

async function loadConfig() {
  if (!window.memoriaAPI) return
  const config = await window.memoriaAPI.site.getConfig()
  siteName.value = config.name || ''
  siteAuthor.value = config.author || ''
  siteUrl.value = config.url || ''
  currentTheme.value = await window.memoriaAPI.site.getTheme()
}

async function saveConfig() {
  if (!window.memoriaAPI) return
  await window.memoriaAPI.site.saveConfig({
    name: siteName.value,
    author: siteAuthor.value,
    url: siteUrl.value,
    icon: ''
  })
  showThemeMessage('✅ 配置已保存')
}

async function selectTheme(theme: string) {
  if (!window.memoriaAPI) return
  await window.memoriaAPI.site.setTheme(theme)
  currentTheme.value = theme
  showThemeMessage(`✅ 主题已切换为 ${theme}，重新构建后生效`)
}

function showThemeMessage(msg: string) {
  themeMessage.value = msg
  setTimeout(() => { themeMessage.value = '' }, 3000)
}

onMounted(loadConfig)
</script>

<style scoped>
.settings-section { background: #fff; border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem; }
.settings-section h2 { font-size: 1.05rem; margin-bottom: 1rem; }
.section-desc { font-size: 0.85rem; color: #888; line-height: 1.6; }

.theme-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.8rem; margin-bottom: 0.5rem; }
.theme-card { border: 2px solid #eee; border-radius: 8px; padding: 0.5rem; cursor: pointer; transition: all 0.2s; text-align: center; }
.theme-card:hover { border-color: #ccc; }
.theme-card.active { border-color: #e94560; }
.theme-preview { height: 60px; border-radius: 4px; display: flex; align-items: flex-end; padding: 0.3rem; }
.theme-preview-accent { width: 100%; height: 8px; border-radius: 2px; }
.theme-name { font-size: 0.8rem; margin-top: 0.4rem; font-weight: 500; }

.theme-msg { font-size: 0.85rem; padding: 0.4rem 0.8rem; border-radius: 6px; margin-top: 0.5rem; background: #d4edda; color: #155724; }
</style>
