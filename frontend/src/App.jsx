import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import KeywordResults from './components/KeywordResults';
import Overview from './components/Overview';
import AdvertiserDetail from './components/AdvertiserDetail';
import { getKeywords } from './api';
import { Sun, Moon } from 'lucide-react';
import './index.css';

export default function App() {
  const [keywords, setKeywords] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAdvertiser, setSelectedAdvertiser] = useState(null);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    loadKeywords();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const loadKeywords = async () => {
    try {
      const data = await getKeywords();
      setKeywords(data);
    } catch (err) {
      console.error('Failed to load keywords:', err);
    }
  };

  const handleSelectAdvertiser = (keyword, advertiser) => {
    setSelectedAdvertiser({ keyword, advertiser });
  };

  const handleBackFromDetail = () => {
    setSelectedAdvertiser(null);
  };

  return (
    <div className="flex h-screen" style={{ background: darkMode ? '#020617' : '#f8fafc' }}>
      <Sidebar
        keywords={keywords}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setSelectedAdvertiser(null); }}
        onKeywordsChange={loadKeywords}
        darkMode={darkMode}
      />
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b"
          style={{
            padding: '16px 24px',
            background: darkMode ? '#0f172a' : '#ffffff',
            borderColor: darkMode ? '#1e293b' : '#e2e8f0',
          }}>
          <div>
            <h1 className="text-xl font-bold" style={{ color: darkMode ? '#f1f5f9' : '#0f172a' }}>
              🇮🇩 AdSpy Indo
            </h1>
            <p className="text-sm" style={{ color: darkMode ? '#64748b' : '#94a3b8' }}>
              Winning Digital Product Intelligence
            </p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-xl transition-colors"
            style={{
              padding: '8px',
              background: darkMode ? '#1e293b' : '#f1f5f9',
              color: darkMode ? '#f1f5f9' : '#334155',
            }}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        <div style={{ padding: '24px' }}>
          {selectedAdvertiser ? (
            <AdvertiserDetail
              keyword={selectedAdvertiser.keyword}
              advertiser={selectedAdvertiser.advertiser}
              onBack={handleBackFromDetail}
              darkMode={darkMode}
            />
          ) : activeTab === 'overview' ? (
            <Overview darkMode={darkMode} onSelectKeyword={setActiveTab} />
          ) : (
            <KeywordResults
              keywordId={activeTab}
              darkMode={darkMode}
              onSelectAdvertiser={handleSelectAdvertiser}
            />
          )}
        </div>
      </main>
    </div>
  );
}
