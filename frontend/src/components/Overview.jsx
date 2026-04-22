import { useState, useEffect } from 'react';
import { getOverview } from '../api';
import { TrendingUp, Users, FileText, Zap } from 'lucide-react';

function formatPrice(price) {
  if (!price) return '-';
  if (price >= 1000000) return `Rp ${(price / 1000000).toFixed(1)}jt`;
  if (price >= 1000) return `Rp ${(price / 1000).toFixed(0)}k`;
  return `Rp ${price}`;
}

export default function Overview({ darkMode, onSelectKeyword }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      const result = await getOverview();
      setData(result);
    } catch (err) {
      console.error('Failed to load overview:', err);
    }
    setLoading(false);
  };

  const card = darkMode ? '#0f172a' : '#ffffff';
  const border = darkMode ? '#1e293b' : '#e2e8f0';
  const text = darkMode ? '#f1f5f9' : '#0f172a';
  const textMuted = darkMode ? '#64748b' : '#94a3b8';

  if (loading) {
    return <div className="text-center" style={{ padding: '48px', color: textMuted }}>Loading...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold" style={{ color: text, marginBottom: '24px' }}>
        📊 Overview
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4" style={{ marginBottom: '32px' }}>
        {[
          { icon: <FileText size={20} />, label: 'Total Ads', value: data?.totalAdsScraped || 0, color: '#3b82f6' },
          { icon: <Users size={20} />, label: 'Advertisers', value: data?.totalAdvertisers || 0, color: '#8b5cf6' },
          { icon: <TrendingUp size={20} />, label: 'Keywords', value: data?.keywords?.length || 0, color: '#22c55e' },
          { icon: <Zap size={20} />, label: 'Hot Products', value: data?.hottestProducts?.filter(p => p.score >= 65).length || 0, color: '#ef4444' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl"
            style={{ padding: '20px', background: card, border: `1px solid ${border}` }}>
            <div className="flex items-center gap-3" style={{ marginBottom: '8px' }}>
              <div className="rounded-lg" style={{ padding: '8px', background: `${stat.color}20`, color: stat.color }}>
                {stat.icon}
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: text }}>{stat.value.toLocaleString()}</div>
            <div className="text-sm" style={{ color: textMuted }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Keywords Table */}
      <div className="rounded-xl" style={{ marginBottom: '32px', background: card, border: `1px solid ${border}` }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
          <h3 className="text-base font-bold" style={{ color: text }}>📋 Keywords Performance</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}` }}>
                {['Keyword', 'Ads', 'Advertisers', '🔥 Winners', '✅ High', '🟡 Watch', 'Last Scraped'].map(h => (
                  <th key={h} className="text-left font-semibold" style={{ padding: '12px 16px', color: textMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.keywords || []).map(kw => (
                <tr key={kw.keywordId}
                  className="cursor-pointer transition-colors"
                  onClick={() => onSelectKeyword(kw.keywordId)}
                  style={{ borderBottom: `1px solid ${border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = darkMode ? '#1e293b' : '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td className="font-medium" style={{ padding: '12px 16px', color: text }}>{kw.keyword}</td>
                  <td style={{ padding: '12px 16px', color: textMuted }}>{kw.totalAds}</td>
                  <td style={{ padding: '12px 16px', color: textMuted }}>{kw.totalAdvertisers}</td>
                  <td style={{ padding: '12px 16px', color: '#ef4444' }}>{kw.summary?.confirmedWinners || 0}</td>
                  <td style={{ padding: '12px 16px', color: '#22c55e' }}>{kw.summary?.highConfidence || 0}</td>
                  <td style={{ padding: '12px 16px', color: '#eab308' }}>{kw.summary?.worthWatching || 0}</td>
                  <td className="text-xs" style={{ padding: '12px 16px', color: textMuted }}>
                    {kw.scrapedAt ? new Date(kw.scrapedAt).toLocaleString('id-ID') : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hottest Products */}
      {data?.hottestProducts?.length > 0 && (
        <div className="rounded-xl" style={{ marginBottom: '32px', background: card, border: `1px solid ${border}` }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
            <h3 className="text-base font-bold" style={{ color: text }}>🔥 Hottest Products (All Keywords)</h3>
          </div>
          <div>
            {data.hottestProducts.slice(0, 10).map((p, i) => (
              <div key={`${p.advertiserName}-${i}`}
                className="flex items-center justify-between"
                style={{ padding: '12px 20px', borderBottom: i < 9 ? `1px solid ${border}` : 'none' }}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold" style={{ color: textMuted, minWidth: '24px' }}>#{i + 1}</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: text }}>{p.advertiserName}</div>
                    <div className="text-xs" style={{ color: textMuted }}>
                      {p.keyword} • {p.niche} • {formatPrice(p.commonPrice)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: textMuted }}>
                    ⏱️{p.longestDuration}d 📊#{p.bestPosition} 📢{p.totalAds}
                  </span>
                  <span className="text-sm font-bold" style={{
                    color: p.score >= 80 ? '#ef4444' : p.score >= 65 ? '#22c55e' : p.score >= 50 ? '#eab308' : '#94a3b8'
                  }}>
                    {p.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-Keyword Products */}
      {data?.crossKeywordProducts?.length > 0 && (
        <div className="rounded-xl" style={{ background: card, border: `1px solid ${border}` }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
            <h3 className="text-base font-bold" style={{ color: text }}>🔗 Cross-Keyword Products</h3>
            <p className="text-xs" style={{ color: textMuted }}>Products appearing in multiple keyword searches</p>
          </div>
          <div>
            {data.crossKeywordProducts.map((p, i) => (
              <div key={p.advertiserName}
                className="flex items-center justify-between"
                style={{ padding: '12px 20px', borderBottom: i < data.crossKeywordProducts.length - 1 ? `1px solid ${border}` : 'none' }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: text }}>{p.advertiserName}</div>
                  <div className="flex gap-1" style={{ marginTop: '4px' }}>
                    {p.keywords.map(kw => (
                      <span key={kw} className="rounded-md text-xs"
                        style={{ padding: '2px 8px', background: darkMode ? '#1e293b' : '#f1f5f9', color: textMuted }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-sm font-bold" style={{
                  color: p.bestScore >= 80 ? '#ef4444' : p.bestScore >= 65 ? '#22c55e' : '#eab308'
                }}>
                  {p.bestScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
