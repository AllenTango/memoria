import React from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import globalStyles from './styles/global.css'

interface SiteInfo {
  name: string
  path: string
}

const App: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentSite, setCurrentSite] = React.useState<SiteInfo | null>(null)

  const showSidebar = location.pathname !== '/'

  React.useEffect(() => {
    loadSite()
  }, [])

  async function loadSite() {
    if (window.memoriaAPI) {
      const site = await window.memoriaAPI.site.getCurrent()
      setCurrentSite(site)
    }
  }

  async function closeSite() {
    if (window.memoriaAPI) {
      await window.memoriaAPI.site.close()
      setCurrentSite(null)
      navigate('/')
    }
  }

  return (
    <div className="app-container">
      {showSidebar && (
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1 className="sidebar-title">Memoria</h1>
            {currentSite && <p className="sidebar-sitename">{currentSite.name}</p>}
          </div>
          <nav className="sidebar-nav">
            <Link to="/dashboard" className={`nav-item${location.pathname === '/dashboard' ? ' active' : ''}`}>
              <span className="nav-icon">📊</span>
              <span className="nav-label">仪表盘</span>
            </Link>
            <Link to="/content" className={`nav-item${location.pathname === '/content' ? ' active' : ''}`}>
              <span className="nav-icon">📝</span>
              <span className="nav-label">内容管理</span>
            </Link>
            <Link to="/preview" className={`nav-item${location.pathname === '/preview' ? ' active' : ''}`}>
              <span className="nav-icon">👁</span>
              <span className="nav-label">站点预览</span>
            </Link>
            <Link to="/settings" className={`nav-item${location.pathname === '/settings' ? ' active' : ''}`}>
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">设置</span>
            </Link>
          </nav>
          <div className="sidebar-footer">
            <button className="btn-text" onClick={closeSite}>关闭站点</button>
            <Link to="/" className="btn-text">返回首页</Link>
          </div>
        </aside>
      )}
      <main className={`main-area${!showSidebar ? ' main-full' : ''}`}>
        <Outlet />
      </main>
    </div>
  )
}

export default App

// ── Type Declarations ───────────────────────────────────────────────────

declare global {
  interface Window {
    memoriaAPI?: {
      site: {
        getCurrent: () => Promise<SiteInfo | null>
        close: () => Promise<void>
      }
      content: {
        list: (type: string) => Promise<ContentItem[]>
        create: (type: string, data: Partial<ContentItem>) => Promise<ContentItem>
        read: (type: string, id: string) => Promise<string>
        write: (type: string, id: string, content: string) => Promise<void>
        delete: (type: string, id: string) => Promise<void>
      }
      build: {
        run: () => Promise<void>
        watch: (callback: (event: string) => void) => void
      }
    }
  }
}

interface ContentItem {
  id: string
  title: string
  type: 'blog' | 'vlog' | 'photo'
  date: string
  category?: string
  tags?: string[]
}