import { useState, useEffect, useRef } from 'react';
import { Play, Square, RefreshCw, ArrowUpDown, Filter, ChevronRight } from 'lucide-react';
import { getResults, startScrape, getScrapeStatus, stopScrape } from '../api';

function ScoreBar({ score, darkMode }) {
  const getColor = (s) => {
    if (s >= 80) return '#ef4444';
    if (s >= 65) return '#22c55e';
    if (s >= 50) return '#eab308';
    if (s >= 35) return '#f97316';
    return '#94a3b8';
  };
  return (
    <div className="flex items-center gap-2" style={{ minWidth: '120px' }}>
      <div className="flex-1 rounded-full" style={{ height: '8px', background: darkMode ? '#1e293b' : '#e2e8f0' }}>
        <div className="rounded-full transition-all" style={{ width: `${score}%`, height: '8px', background: getColor(score) }} />
      </div>
      <span className="text-sm font-bold" style={{ color: getColor(score), minWidth: '28px' }}>{score}</span>
    </div>
  );
}

function DecisionBadge({ decision }) {
  const colors = {
    red: { bg: '#fef2f2', text: '#dc2626', darkBg: '#450a0a', darkText: '#fca5a5' },
    green: { bg: '#f0fdf4', text: '#16a34a', darkBg: '#052e16', darkText: '#86efac' },
    yellow: { bg: '#fefce8', text: '#ca8a04', darkBg: '#422006', darkText: '#fde047' },
    orange: { bg: '#fff7ed', text: '#ea580c', darkBg: '#431407', darkText: '#fdba74' },
    gray: { bg: '#f8fafc', text: '#64748b', darkBg: '#1e293b', darkText: '#94a3b8' },
  };
  const c = colors[decision.color] || colors.gray;
  return (
    <span className="inline-flex items-center gap-1 rounded-lg text-xs font-semibold"
      style={{ padding: '4px 8px', background: c.darkBg, color: c.darkText }}>
      {decision.emoji} {decision.label}
    </span>
  );
}

function formatPrice(price) {
  if (!price) return '-';
  if (price >= 1000000) return `Rp ${(price / 1000000).toFixed(1)}jt`;
  if (price >= 1000) return `Rp ${(price / 1000).toFixed(0)}k`;
  return `Rp ${price}`;
}

export default function KeywordResults({ keywordId, darkMode, onSelectAdvertiser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState(null);
  const [sort, setSort] = useState('score');
  const [order, setOrder] = useState('desc');
  const [minScore, setMinScore] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    loadResults();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [keywordId, sort, order, minScore]);

  const loadResults = async () => {
    setLoading(true);
    try {
      const params = { sort, order };
      if (minScore) params.minScore = minScore;
      const result = await getResults(keywordId, params);
      setData(result);
    } catch (err) {
      console.error('Failed to load results:', err);
    }
    setLoading(false);
  };

  const handleStartScrape = async () => {
    try {
      await startScrape(keywordId);
      setScraping(true);
      // Poll for progress
      pollRef.current = setInterval(async () => {
        try {
          const status = await getScrapeStatus(keywordId);
          setScrapeProgress(status);
          if (!status.running) {
            clearInterval(pollRef.current);
            setScraping(false);
            loadResults();
          }
        } catch (e) { /* ignore */ }
      }, 2000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start scraping');
    }
  };

  const handleStopScrape = async () => {
    try {
      await stopScrape(keywordId);
    } catch (err) { /* ignore */ }
  };

  const card = darkMode ? '#0f172a' : '#ffffff';
  const border = darkMode ? '#1e293b' : '#e2e8f0';
  const text = darkMode ? '#f1f5f9' : '#0f172a';
  const textMuted = darkMode ? '#64748b' : '#94a3b8';

  if (loading && !data) {
    return <div className="text-center" style={{ padding: '48px', color: textMuted }}>Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: text }}>
            🔍 {keywordId.replace(/-/g, ' ')}
          </h2>
          <p className="text-sm" style={{ color: textMuted }}>
            {data?.totalAds || 0} ads • {data?.totalAdvertisers || 0} advertisers
            {data?.scrapedAt && ` • Last scraped: ${new Date(data.scrapedAt).toLocaleString('id-ID')}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {scraping ? (
            <>
              <div className="flex items-center gap-2 rounded-xl text-sm"
                style={{ padding: '8px 16px', background: darkMode ? '#1e293b' : '#f1f5f9', color: text }}>
                <RefreshCw size={14} className="animate-spin" />
                {scrapeProgress?.progress || 0}% ({scrapeProgress?.collected || 0} ads)
              </div>
              <button onClick={handleStopScrape} className="flex items-center gap-2 rounded-xl text-sm font-medium text-white"
                style={{ padding: '8px 16px', background: '#ef4444' }}>
                <Square size={14} /> Stop
              </button>
            </>
          ) : (
            <button onClick={handleStartScrape} className="flex items-center gap-2 rounded-xl text-sm font-medium text-white"
              style={{ padding: '8px 16px', background: '#2563eb' }}>
              <Play size={14} /> Scrape Now
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-5 gap-3" style={{ marginBottom: '24px' }}>
          {[
            { label: '🔥 Confirmed', value: data.summary.confirmedWinners, color: '#ef4444' },
            { label: '✅ High Conf', value: data.summary.highConfidence, color: '#22c55e' },
            { label: '🟡 Watching', value: data.summary.worthWatching, color: '#eab308' },
            { label: '⚡ Rising', value: data.summary.risingFast, color: '#f97316' },
            { label: '⚪ Early', value: data.summary.tooEarly, color: '#94a3b8' },
          ].map(item => (
            <div key={item.label} className="rounded-xl text-center"
              style={{ padding: '16px', background: card, border: `1px solid ${border}` }}>
              <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</div>
              <div className="text-xs" style={{ color: textMuted }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sort & Filter */}
      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: '16px' }}>
        <div className="flex items-center gap-1">
          <ArrowUpDown size={14} style={{ color: textMuted }} />
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="rounded-lg text-sm"
            style={{ padding: '6px 10px', background: card, border: `1px solid ${border}`, color: text, outline: 'none' }}>
            <option value="score">Score</option>
            <option value="duration">Duration</option>
            <option value="position">Position</option>
            <option value="ads">Total Ads</option>
            <option value="price">Price</option>
          </select>
          <button onClick={() => setOrder(o => o === 'desc' ? 'asc' : 'desc')}
            className="rounded-lg text-xs"
            style={{ padding: '6px 10px', background: card, border: `1px solid ${border}`, color: textMuted }}>
            {order === 'desc' ? '↓' : '↑'}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Filter size={14} style={{ color: textMuted }} />
          <select value={minScore} onChange={e => setMinScore(e.target.value)}
            className="rounded-lg text-sm"
            style={{ padding: '6px 10px', background: card, border: `1px solid ${border}`, color: text, outline: 'none' }}>
            <option value="">All Scores</option>
            <option value="80">🔥 80+ (Winners)</option>
            <option value="65">✅ 65+ (High Conf)</option>
            <option value="50">🟡 50+ (Watching)</option>
            <option value="35">⚡ 35+ (Rising)</option>
          </select>
        </div>
      </div>

      {/* Products List */}
      {(!data?.products || data.products.length === 0) ? (
        <div className="rounded-xl text-center" style={{ padding: '48px', background: card, border: `1px solid ${border}` }}>
          <p className="text-lg" style={{ color: textMuted }}>No data yet</p>
          <p className="text-sm" style={{ color: textMuted, marginTop: '8px' }}>
            Click "Scrape Now" to start collecting ads
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.products.map((product, i) => (
            <button
              key={product.advertiserName}
              onClick={() => onSelectAdvertiser(keywordId, product.advertiserName)}
              className="rounded-xl text-left transition-all hover:scale-[1.01]"
              style={{ padding: '20px', background: card, border: `1px solid ${border}` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3" style={{ marginBottom: '8px' }}>
                    <span className="text-sm font-bold" style={{ color: textMuted }}>#{i + 1}</span>
                    <h3 className="text-base font-bold" style={{ color: text }}>{product.advertiserName}</h3>
                    <DecisionBadge decision={product.decision} />
                  </div>
                  <div className="flex items-center gap-4 flex-wrap text-sm" style={{ color: textMuted }}>
                    <span>⏱️ {product.longestDuration} days</span>
                    <span>📊 #{product.bestPosition}</span>
                    <span>📢 {product.totalAds} ads</span>
                    <span>💰 {formatPrice(product.commonPrice)}</span>
                    <span className="rounded-md text-xs"
                      style={{ padding: '2px 8px', background: darkMode ? '#1e293b' : '#f1f5f9' }}>
                      {product.niche}
                    </span>
                    <span className="rounded-md text-xs"
                      style={{ padding: '2px 8px', background: darkMode ? '#1e293b' : '#f1f5f9' }}>
                      {product.productType}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ScoreBar score={product.score} darkMode={darkMode} />
                  <ChevronRight size={16} style={{ color: textMuted }} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
