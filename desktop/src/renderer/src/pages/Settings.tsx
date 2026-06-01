import React from 'react'

const Settings: React.FC = () => {
  const [editorPath, setEditorPath] = React.useState('')
  const [theme, setTheme] = React.useState('dracula')
  const [saved, setSaved] = React.useState(false)

  function handleSave() {
    // In real app, save to config file
    localStorage.setItem('memoria-settings', JSON.stringify({ editorPath, theme }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="page-header">
        <h1>设置</h1>
        <p>个性化配置你的写作环境</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>编辑器设置</h3>

        <div className="form-group">
          <label>编辑器路径</label>
          <input
            type="text"
            className="form-input"
            value={editorPath}
            onChange={e => setEditorPath(e.target.value)}
            placeholder="code /usr/local/bin/vim 等"
          />
          <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.3rem' }}>
            设置后，新建内容将自动使用该编辑器打开
          </p>
        </div>

        <div className="form-group">
          <label>默认主题</label>
          <select
            className="form-input"
            value={theme}
            onChange={e => setTheme(e.target.value)}
            style={{ maxWidth: 200 }}
          >
            <option value="dracula">🌙 Dracula (暗色)</option>
            <option value="peach">☀️ Peach (亮色)</option>
          </select>
        </div>

        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? '✓ 已保存' : '💾 保存设置'}
        </button>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>关于</h3>
        <div style={{ color: '#666', fontSize: '0.85rem', lineHeight: 1.8 }}>
          <p><strong>Memoria Desktop</strong> v1.0.0</p>
          <p>轻量级静态博客写作软件</p>
          <p style={{ marginTop: '0.5rem' }}>
            使用 Electron + React 构建 | 底层调用 Memoria CLI
          </p>
        </div>
      </div>
    </div>
  )
}

export default Settings