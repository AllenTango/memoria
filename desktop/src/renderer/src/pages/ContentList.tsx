import React from 'react'
import { useNavigate } from 'react-router-dom'

const ContentList: React.FC = () => {
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = React.useState<'blog' | 'vlog' | 'photo'>('blog')

  return (
    <div>
      <div className="page-header">
        <h1>内容管理</h1>
        <p>管理你的文章、视频和相册</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          className={`btn ${activeTab === 'blog' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('blog')}
        >
          📝 文章 ({0})
        </button>
        <button
          className={`btn ${activeTab === 'vlog' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('vlog')}
        >
          🎬 视频 ({0})
        </button>
        <button
          className={`btn ${activeTab === 'photo' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('photo')}
        >
          📷 相册 ({0})
        </button>
        <button
          className="btn btn-success"
          style={{ marginLeft: 'auto' }}
          onClick={() => navigate(`/editor?type=${activeTab}`)}
        >
          ➕ 新建
        </button>
      </div>

      <div className="card">
        <p style={{ color: '#888', textAlign: 'center', padding: '2rem 0' }}>
          暂无{activeTab === 'blog' ? '文章' : activeTab === 'vlog' ? '视频' : '相册'}，点击新建开始创作
        </p>
      </div>
    </div>
  )
}

export default ContentList