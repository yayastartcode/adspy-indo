import { useState } from 'react';
import { BarChart3, Plus, Trash2, Settings, X } from 'lucide-react';
import { addKeyword, deleteKeyword } from '../api';

export default function Sidebar({ keywords, activeTab, onTabChange, onKeywordsChange, darkMode }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newMaxResults, setNewMaxResults] = useState(2000);

  const handleAdd = async () => {
    if (!newKeyword.trim()) return;
    try {
      await addKeyword({ keyword: newKeyword.trim(), maxResults: newMaxResults });
      setNewKeyword('');
      setNewMaxResults(2000);
      setShowAdd(false);
      onKeywordsChange();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add keyword');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this keyword and its data?')) return;
    try {
      await deleteKeyword(id);
      onKeywordsChange();
      if (activeTab === id) onTabChange('overview');
    } catch (err) {
      alert('Failed to delete keyword');
    }
  };

  const bg = darkMode ? '#0f172a' : '#ffffff';
  const border = darkMode ? '#1e293b' : '#e2e8f0';
  const text = darkMode ? '#f1f5f9' : '#0f172a';
  const textMuted = darkMode ? '#64748b' : '#94a3b8';
  const hoverBg = darkMode ? '#1e293b' : '#f1f5f9';
  const activeBg = darkMode ? '#1e3a8a' : '#dbeafe';
  const activeText = darkMode ? '#93c5fd' : '#1d4ed8';

  return (
    <aside className="flex flex-col border-r" style={{ width: '260px', background: bg, borderColor: border }}>
      <div style={{ padding: '20px 16px 12px' }}>
        <h2 className="text-lg font-bold" style={{ color: text }}>🔍 Keywords</h2>
      </div>

      <nav className="flex-1 overflow-y-auto" style={{ padding: '0 8px' }}>
        <button
          onClick={() => onTabChange('overview')}
          className="flex items-center gap-2 w-full rounded-xl text-left text-sm font-medium transition-colors"
          style={{
            padding: '10px 12px',
            marginBottom: '4px',
            background: activeTab === 'overview' ? activeBg : 'transparent',
            color: activeTab === 'overview' ? activeText : text,
          }}
        >
          <BarChart3 size={16} />
          Overview
        </button>

        <div style={{ padding: '8px 0 4px 12px' }}>
          <span className="text-xs font-semibold uppercase" style={{ color: textMuted }}>Keywords</span>
        </div>

        {keywords.map(kw => (
          <button
            key={kw.id}
            onClick={() => onTabChange(kw.id)}
            className="flex items-center justify-between w-full rounded-xl text-left text-sm transition-colors group"
            style={{
              padding: '10px 12px',
              marginBottom: '2px',
              background: activeTab === kw.id ? activeBg : 'transparent',
              color: activeTab === kw.id ? activeText : text,
            }}
          >
            <span className="truncate">{kw.keyword}</span>
            <span className="flex items-center gap-1">
              {kw.lastScrapedAt && (
                <span className="text-xs" style={{ color: textMuted }}>
                  {new Date(kw.lastScrapedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </span>
              )}
              <Trash2
                size={14}
                className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                style={{ color: '#ef4444' }}
                onClick={(e) => handleDelete(kw.id, e)}
              />
            </span>
          </button>
        ))}
      </nav>

      <div style={{ padding: '12px 8px', borderTop: `1px solid ${border}` }}>
        {showAdd ? (
          <div className="rounded-xl" style={{ padding: '12px', background: hoverBg }}>
            <input
              type="text"
              placeholder="Keyword..."
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              className="w-full rounded-lg text-sm"
              style={{
                padding: '8px 12px',
                marginBottom: '8px',
                background: darkMode ? '#0f172a' : '#ffffff',
                border: `1px solid ${border}`,
                color: text,
                outline: 'none',
              }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Max results"
                value={newMaxResults}
                onChange={e => setNewMaxResults(parseInt(e.target.value) || 2000)}
                className="flex-1 rounded-lg text-sm"
                style={{
                  padding: '8px 12px',
                  background: darkMode ? '#0f172a' : '#ffffff',
                  border: `1px solid ${border}`,
                  color: text,
                  outline: 'none',
                }}
              />
              <button onClick={handleAdd} className="rounded-lg text-sm font-medium text-white"
                style={{ padding: '8px 16px', background: '#2563eb' }}>
                Add
              </button>
              <button onClick={() => setShowAdd(false)} style={{ color: textMuted }}>
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 w-full rounded-xl text-sm font-medium transition-colors"
            style={{ padding: '10px 12px', color: '#3b82f6' }}
          >
            <Plus size={16} />
            Add Keyword
          </button>
        )}
      </div>
    </aside>
  );
}
