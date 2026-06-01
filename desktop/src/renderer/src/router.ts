import { createRouter, createMemoryHistory } from 'vue-router'
import Welcome from './views/Welcome.vue'
import Dashboard from './views/Dashboard.vue'
import ContentList from './views/ContentList.vue'
import Editor from './views/Editor.vue'
import SitePreview from './views/SitePreview.vue'
import Settings from './views/Settings.vue'

const routes = [
  { path: '/', name: 'welcome', component: Welcome },
  { path: '/dashboard', name: 'dashboard', component: Dashboard },
  { path: '/content', name: 'content-list', component: ContentList },
  { path: '/editor/:type', name: 'editor-new', component: Editor, props: (route: any) => ({ type: route.params.type }) },
  { path: '/editor', name: 'editor', component: Editor, props: () => ({ type: 'blog' }) },
  { path: '/preview', name: 'preview', component: SitePreview },
  { path: '/settings', name: 'settings', component: Settings }
]

const router = createRouter({
  history: createMemoryHistory(),
  routes
})

export default router
