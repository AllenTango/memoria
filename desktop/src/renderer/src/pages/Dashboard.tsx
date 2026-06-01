import React from 'react'
import { useNavigate } from 'react-router-dom'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div>
      <div className="page-header">
        <h1>仪表盘</h1>
        <p>站点概览和快捷操作</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>0</div>
          <div style={{ color: '#888', fontSize: '0.85rem' }}>文章</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎬</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>0</div>
          <div style={{ color: '#888', fontSize: '0.85rem' }}>视频</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>0</div>
          <div style={{ color: '#888', fontSize: '0.85rem' }}>相册</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👁</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>--</div>
          <div style={{ color: '#888', fontSize: '0.85rem' }}>最近访问</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button className="btn btn-primary" onClick={() => navigate('/content')}>📝 写文章</button>
        <button className="btn btn-secondary" onClick={() => navigate('/preview')}>👁 预览站点</button>
        <button className="btn btn-success" onClick={() => window.memoriaAPI?.build.run()}>🔨 构建站点</button>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>最近内容</h2>
        <p style={{ color: '#888' }}>暂无内容，创建你的第一篇文章吧！</p>
      </div>
    </div>
  )
}

export default Dashboard