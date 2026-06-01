import React from 'react'

const SitePreview: React.FC = () => {
  const [url, setUrl] = React.useState('http://localhost:3000/')
  const [loading, setLoading] = React.useState(false)

  return (
    <div>
      <div className="page-header">
        <h1>站点预览</h1>
        <p>实时预览站点效果（需要在终端运行 memoria preview）</p>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            className="form-input"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="http://localhost:3000/"
          />
          <button
            className="btn btn-primary"
            onClick={() => setLoading(true)}
            disabled={loading}
          >
            🔄 刷新
          </button>
        </div>

        <div
          style={{
            width: '100%',
            height: 500,
            border: '1px solid #ddd',
            borderRadius: 8,
            background: '#f9f9f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#888',
            fontSize: '0.9rem',
          }}
        >
          {loading ? '加载中...' : `预览地址: ${url}`}
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>💡 提示</h3>
        <p style={{ color: '#666', fontSize: '0.85rem', lineHeight: 1.6 }}>
          1. 在项目终端运行 <code style={{ background: '#f0f0f0', padding: '0.1rem 0.4rem' }}>memoria preview</code> 启动预览服务<br />
          2. 预览服务运行后，上方将显示站点内容<br />
          3. 修改内容后，站点会自动重新构建
        </p>
      </div>
    </div>
  )
}

export default SitePreview