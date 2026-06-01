import React from 'react'
import { useNavigate } from 'react-router-dom'

const Welcome: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center', maxWidth: 500 }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Memoria</h1>
        <p style={{ color: '#888', marginBottom: '2rem' }}>轻量级静态博客写作软件</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
            onClick={() => navigate('/dashboard')}
          >
            📂 打开已有站点
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
            onClick={() => navigate('/dashboard')}
          >
            ➕ 新建站点
          </button>
        </div>

        <div style={{ marginTop: '3rem', padding: '1rem', background: '#f9f9f9', borderRadius: 8 }}>
          <p style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.6 }}>
            💡 <strong>快捷键：</strong>在项目目录下运行 <code style={{ background: '#eee', padding: '0.1rem 0.4rem', borderRadius: 4 }}>memoria</code> 打开 TUI 入口
          </p>
        </div>
      </div>
    </div>
  )
}

export default Welcome