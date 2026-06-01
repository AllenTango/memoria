import React from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

const Editor: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const type = (searchParams.get('type') as 'blog' | 'vlog' | 'photo') || 'blog'
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  async function handleSave() {
    if (!title.trim()) {
      alert('请输入标题')
      return
    }
    setSaving(true)
    try {
      if (window.memoriaAPI) {
        await window.memoriaAPI.content.create(type, { title, type })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error('Save failed:', e)
    }
    setSaving(false)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Editor Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderBottom: '1px solid #eee', background: '#fff' }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← 返回</button>
        <span style={{ fontSize: '0.85rem', color: '#888', textTransform: 'capitalize' }}>{type}</span>
        <input
          type="text"
          className="form-input"
          placeholder="输入标题..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ flex: 1, fontSize: '1.1rem', fontWeight: 600 }}
        />
        <button className="btn btn-success" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : saved ? '✓ 已保存' : '💾 保存'}
        </button>
      </div>

      {/* Editor Toolbar */}
      <div style={{ display: 'flex', gap: '0.25rem', padding: '0.5rem 1rem', background: '#f9f9f9', borderBottom: '1px solid #eee' }}>
        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={() => insertMd('**', '**')}>B</button>
        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={() => insertMd('*', '*')}>I</button>
        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={() => insertMd('`', '`')}>#</button>
        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={() => insertMd('# ', '')}>H</button>
      </div>

      {/* Editor Content */}
      <div style={{ flex: 1, padding: '1rem' }}>
        <textarea
          className="form-textarea"
          placeholder="开始写作..."
          value={content}
          onChange={e => setContent(e.target.value)}
          style={{ height: '100%', fontSize: '1rem', lineHeight: 1.8, border: 'none', resize: 'none' }}
        />
      </div>
    </div>
  )

  function insertMd(prefix: string, suffix: string) {
    // Simple insert helper - in real app would use textarea selection API
    setContent(prev => prev + prefix + 'text' + suffix)
  }
}

export default Editor