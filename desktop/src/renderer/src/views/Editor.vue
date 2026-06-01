<template>
  <div class="editor-page">
    <div class="editor-header">
      <h1>{{ isNew ? '新建' : '编辑' }} {{ typeLabel }}</h1>
      <div class="editor-actions">
        <button class="btn btn-secondary" @click="saveDraft">💾 保存草稿</button>
        <button class="btn btn-primary" @click="saveAndClose">保存并返回</button>
      </div>
    </div>

    <!-- Blog Editor -->
    <template v-if="contentType === 'blog'">
      <div class="editor-layout">
        <div class="editor-left">
          <div class="form-group">
            <label>标题</label>
            <input v-model="form.title" class="form-input form-input-lg" placeholder="文章标题..." />
          </div>
          <div class="form-row">
            <div class="form-group form-group-half">
              <label>日期</label>
              <input v-model="form.date" type="date" class="form-input" />
            </div>
            <div class="form-group form-group-half">
              <label>封面图 URL</label>
              <input v-model="form.cover" class="form-input" placeholder="https://..." />
            </div>
          </div>
          <div class="form-group">
            <label>描述</label>
            <input v-model="form.description" class="form-input" placeholder="简短描述..." />
          </div>
          <div class="form-group">
            <label>标签</label>
            <div class="tag-input">
              <span v-for="(tag, i) in form.tags" :key="i" class="tag">
                {{ tag }}<span class="tag-remove" @click="removeTag(i)">×</span>
              </span>
              <input
                v-model="newTag"
                class="tag-add-input"
                placeholder="添加标签..."
                @keydown.enter.prevent="addTag"
                @keydown.tab.prevent="addTag"
              />
            </div>
          </div>
          <div class="form-group">
            <label>正文 (Markdown)</label>
            <textarea
              v-model="form.content"
              class="form-textarea editor-textarea"
              placeholder="开始写作..."
            ></textarea>
          </div>
        </div>
        <div class="editor-right">
          <div class="preview-panel">
            <div class="preview-header">实时预览</div>
            <div class="preview-content" v-html="renderedContent"></div>
          </div>
        </div>
      </div>
    </template>

    <!-- Vlog Editor -->
    <template v-if="contentType === 'vlog'">
      <div class="editor-form">
        <div class="form-group">
          <label>标题</label>
          <input v-model="form.title" class="form-input form-input-lg" placeholder="视频标题..." />
        </div>
        <div class="form-row">
          <div class="form-group form-group-half">
            <label>日期</label>
            <input v-model="form.date" type="date" class="form-input" />
          </div>
          <div class="form-group form-group-half">
            <label>缩略图 URL</label>
            <input v-model="form.thumbnail" class="form-input" placeholder="https://..." />
          </div>
        </div>
        <div class="form-group">
          <label>视频 URL</label>
          <input v-model="form.video" class="form-input" placeholder="YouTube URL 或本地路径" />
          <p class="form-hint">支持 YouTube 嵌入链接 (https://www.youtube.com/embed/...)</p>
        </div>
        <div v-if="form.video" class="video-preview">
          <iframe v-if="form.video.includes('youtube') || form.video.includes('youtu.be')"
                  :src="form.video" frameborder="0" allowfullscreen></iframe>
          <video v-else :src="form.video" controls></video>
        </div>
        <div class="form-group">
          <label>描述</label>
          <textarea v-model="form.description" class="form-textarea" placeholder="视频描述..."></textarea>
        </div>
        <div class="form-group">
          <label>标签</label>
          <div class="tag-input">
            <span v-for="(tag, i) in form.tags" :key="i" class="tag">
              {{ tag }}<span class="tag-remove" @click="removeTag(i)">×</span>
            </span>
            <input v-model="newTag" class="tag-add-input" placeholder="添加标签..."
                   @keydown.enter.prevent="addTag" @keydown.tab.prevent="addTag" />
          </div>
        </div>
        <div class="form-group">
          <label>备注 (Markdown)</label>
          <textarea v-model="form.content" class="form-textarea" placeholder="可选备注..."></textarea>
        </div>
      </div>
    </template>

    <!-- Photo Editor -->
    <template v-if="contentType === 'photo'">
      <div class="editor-form">
        <div class="form-group">
          <label>相册标题</label>
          <input v-model="form.title" class="form-input form-input-lg" placeholder="相册标题..." />
        </div>
        <div class="form-row">
          <div class="form-group form-group-half">
            <label>日期</label>
            <input v-model="form.date" type="date" class="form-input" />
          </div>
          <div class="form-group form-group-half">
            <label>缩略图 URL</label>
            <input v-model="form.thumbnail" class="form-input" placeholder="https://..." />
          </div>
        </div>
        <div class="form-group">
          <label>描述</label>
          <input v-model="form.description" class="form-input" placeholder="相册描述..." />
        </div>
        <div class="form-group">
          <label>标签</label>
          <div class="tag-input">
            <span v-for="(tag, i) in form.tags" :key="i" class="tag">
              {{ tag }}<span class="tag-remove" @click="removeTag(i)">×</span>
            </span>
            <input v-model="newTag" class="tag-add-input" placeholder="添加标签..."
                   @keydown.enter.prevent="addTag" @keydown.tab.prevent="addTag" />
          </div>
        </div>
        <div class="form-group">
          <label>照片列表</label>
          <div class="photo-list">
            <div v-for="(photo, i) in form.photos" :key="i" class="photo-item">
              <img :src="photo.url" class="photo-thumb" alt="" />
              <div class="photo-fields">
                <input v-model="photo.url" class="form-input form-input-sm" placeholder="图片 URL" />
                <input v-model="photo.caption" class="form-input form-input-sm" placeholder="标题" />
              </div>
              <button class="btn btn-sm btn-danger" @click="removePhoto(i)">×</button>
            </div>
          </div>
          <div class="photo-add">
            <input v-model="newPhotoUrl" class="form-input form-input-sm" placeholder="图片 URL" />
            <input v-model="newPhotoCaption" class="form-input form-input-sm" placeholder="标题" />
            <button class="btn btn-sm btn-primary" @click="addPhoto">添加</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Save notification -->
    <div v-if="saveMessage" :class="['save-toast', saveMessageType]">
      {{ saveMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const contentType = ref<string>('blog')
const isNew = ref(true)
const editingPath = ref<string | null>(null)
const form = ref({
  title: '', date: '', tags: [] as string[],
  description: '', content: '',
  video: '', thumbnail: '', cover: '',
  photos: [] as { url: string; caption: string }[]
})
const newTag = ref('')
const newPhotoUrl = ref('')
const newPhotoCaption = ref('')
const saveMessage = ref('')
const saveMessageType = ref('success')

const typeLabel = computed(() => {
  return { blog: '随笔', vlog: '影像', photo: '相册' }[contentType.value] || contentType.value
})

const renderedContent = computed(() => {
  if (!form.value.content) return '<p style="color:#aaa;">在左侧开始写作...</p>'
  // Simple Markdown rendering (using basic regex for preview)
  let html = form.value.content
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  html = html
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
  return '<p>' + html + '</p>'
})

function addTag() {
  const tag = newTag.value.trim()
  if (tag && !form.value.tags.includes(tag)) {
    form.value.tags.push(tag)
  }
  newTag.value = ''
}

function removeTag(idx: number) {
  form.value.tags.splice(idx, 1)
}

function addPhoto() {
  const url = newPhotoUrl.value.trim()
  if (url) {
    form.value.photos.push({ url, caption: newPhotoCaption.value.trim() })
    newPhotoUrl.value = ''
    newPhotoCaption.value = ''
  }
}

function removePhoto(idx: number) {
  form.value.photos.splice(idx, 1)
}

function showMessage(msg: string, type: 'success' | 'error' = 'success') {
  saveMessage.value = msg
  saveMessageType.value = type === 'success' ? 'save-success' : 'save-error'
  setTimeout(() => { saveMessage.value = '' }, 2000)
}

async function saveDraft() {
  if (!window.memoriaAPI) return

  try {
    if (isNew.value) {
      const item = await window.memoriaAPI.content.create(contentType.value as any, form.value)
      editingPath.value = item.path
      isNew.value = false
      showMessage('✅ 已创建')
    } else if (editingPath.value) {
      await window.memoriaAPI.content.update(editingPath.value, form.value)
      showMessage('✅ 已保存')
    }
  } catch (err: any) {
    showMessage('❌ ' + (err.message || '保存失败'), 'error')
  }
}

async function saveAndClose() {
  await saveDraft()
  router.push('/content')
}

onMounted(async () => {
  contentType.value = (route.params.type as string) || route.query.type as string || 'blog'

  // If editing existing content
  const editPath = route.query.path as string
  if (editPath && window.memoriaAPI) {
    const item = await window.memoriaAPI.content.get(editPath)
    if (item) {
      isNew.value = false
      editingPath.value = item.path
      contentType.value = item.type
      form.value = {
        title: item.title,
        date: item.date,
        tags: item.tags || [],
        description: item.description || '',
        content: item.content || '',
        video: item.video || '',
        thumbnail: item.thumbnail || '',
        cover: item.cover || '',
        photos: item.photos || []
      }
    }
  }

  // Default date
  if (!form.value.date) {
    form.value.date = new Date().toISOString().split('T')[0]
  }
})
</script>

<style scoped>
.editor-page { height: 100%; display: flex; flex-direction: column; }
.editor-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1rem; flex-shrink: 0;
}
.editor-header h1 { font-size: 1.3rem; }
.editor-actions { display: flex; gap: 0.5rem; }

.form-input-lg { font-size: 1.1rem; font-weight: 600; }
.form-row { display: flex; gap: 1rem; }
.form-group-half { flex: 1; }
.form-hint { font-size: 0.75rem; color: #999; margin-top: 0.2rem; }

.editor-layout { display: flex; gap: 1rem; flex: 1; min-height: 0; }
.editor-left { flex: 1; overflow-y: auto; padding-right: 0.5rem; }
.editor-right { flex: 1; overflow-y: auto; }
.editor-textarea { min-height: 400px; font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace; font-size: 0.85rem; line-height: 1.6; }

.editor-form { max-width: 700px; }

.preview-panel {
  background: #fff; border: 1px solid #ddd; border-radius: 8px;
  height: 100%; display: flex; flex-direction: column; position: sticky; top: 0;
}
.preview-header {
  padding: 0.5rem 1rem; border-bottom: 1px solid #eee;
  font-size: 0.8rem; color: #888; font-weight: 500; background: #fafafa;
  border-radius: 8px 8px 0 0;
}
.preview-content { padding: 1rem; overflow-y: auto; flex: 1; font-size: 0.9rem; line-height: 1.7; }
.preview-content :deep(h1) { font-size: 1.5rem; margin-bottom: 0.5rem; }
.preview-content :deep(h2) { font-size: 1.2rem; margin-bottom: 0.4rem; }
.preview-content :deep(p) { margin-bottom: 0.5rem; }
.preview-content :deep(img) { max-width: 100%; border-radius: 4px; margin: 0.5rem 0; }

.video-preview { margin-bottom: 1rem; }
.video-preview iframe, .video-preview video { width: 100%; height: 300px; border-radius: 8px; }

.tag-add-input {
  border: none; outline: none; font-size: 0.85rem; padding: 0.2rem;
  min-width: 100px; font-family: inherit;
}

.photo-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem; }
.photo-item { display: flex; align-items: center; gap: 0.5rem; background: #f9f9f9; border-radius: 6px; padding: 0.5rem; }
.photo-thumb { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; }
.photo-fields { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; }
.form-input-sm { font-size: 0.8rem; padding: 0.3rem 0.5rem; }
.photo-add { display: flex; gap: 0.3rem; }

.save-toast {
  position: fixed; bottom: 1.5rem; right: 1.5rem;
  padding: 0.6rem 1.2rem; border-radius: 8px; font-size: 0.85rem;
  z-index: 50; animation: fadeIn 0.2s;
}
.save-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.save-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
