import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, BarChart3, Megaphone, DollarSign } from 'lucide-react';
import { getAdvertiserDetail } from '../api';

function formatPrice(price) {
  if (!price) return '-';
  if (price >= 1000000) return `Rp ${(price / 1000000).toFixed(1)}jt`;
  if (price >= 1000) return `Rp ${(price / 1000).toFixed(0)}k`;
  return `Rp ${price}`;
}

export default function AdvertiserDetail({ keyword, advertiser, onBack, darkMode }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetail();
  }, [keyword, advertiser]);

  const loadDetail = async () => {
    try {
      const result = await getAdvertiserDetail(keyword, advertiser);
      setData(result);
    } catch (err) {
      console.error('Failed to load detail:', err);
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

  if (!data) {
    return (
      <div>
        <button onClick={onBack} className="flex items-center gap-2 text-sm" style={{ color: '#3b82f6', marginBottom: '16px' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <p style={{ color: textMuted }}>Advertiser not found</p>
      </div>
    );
  }

  const getScoreColor = (s) => {
    if (s >= 80) return '#ef4444';
    if (s >= 65) return '#22c55e';
    if (s >= 50) return '#eab308';
    if (s >= 35) return '#f97316';
    return '#94a3b8';
  };

  return (
    <div>
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium"
        style={{ color: '#3b82f6', marginBottom: '16px' }}>
        <ArrowLeft size={16} /> Back to {keyword.replace(/-/g, ' ')}
      </button>

      {/* Header */}
      <div className="rounded-xl" style={{ padding: '24px', marginBottom: '24px', background: card, border: `1px solid ${border}` }}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: text }}>{data.advertiserName}</h2>
            <div className="flex items-center gap-2" style={{ marginTop: '8px' }}>
              <span className="inline-flex items-center gap-1 rounded-lg text-sm font-semibold"
                style={{
                  padding: '4px 12px',
                  background: `${getScoreColor(data.score)}20`,
                  color: getScoreColor(data.score),
                }}>
                {data.decision.emoji} {data.decision.label}
              </span>
              {data.niches.map(n => (
                <span key={n} className="rounded-md text-xs"
                  style={{ padding: '4px 8px', background: darkMode ? '#1e293b' : '#f1f5f9', color: textMuted }}>
                  {n}
                </span>
              ))}
              {data.productTypes.map(t => (
                <span key={t} className="rounded-md text-xs"
                  style={{ padding: '4px 8px', background: darkMode ? '#1e293b' : '#f1f5f9', color: textMuted }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold" style={{ color: getScoreColor(data.score) }}>{data.score}</div>
            <div className="text-xs" style={{ color: textMuted }}>/ 100</div>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-3 gap-4" style={{ marginBottom: '24px' }}>
        {[
          { icon: <Clock size={20} />, label: 'Duration', value: `${data.longestDuration} days`, points: data.scoreBreakdown.duration, max: 40, color: '#3b82f6' },
          { icon: <BarChart3 size={20} />, label: 'Best Position', value: `#${data.bestPosition}`, points: data.scoreBreakdown.position, max: 35, color: '#8b5cf6' },
          { icon: <Megaphone size={20} />, label: 'Total Ads', value: data.totalAds, points: data.scoreBreakdown.adCount, max: 25, color: '#22c55e' },
        ].map(item => (
          <div key={item.label} className="rounded-xl"
            style={{ padding: '20px', background: card, border: `1px solid ${border}` }}>
            <div className="flex items-center gap-2" style={{ marginBottom: '12px', color: item.color }}>
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: text }}>{item.value}</div>
            <div className="flex items-center gap-2" style={{ marginTop: '8px' }}>
              <div className="flex-1 rounded-full" style={{ height: '6px', background: darkMode ? '#1e293b' : '#e2e8f0' }}>
                <div className="rounded-full" style={{ width: `${(item.points / item.max) * 100}%`, height: '6px', background: item.color }} />
              </div>
              <span className="text-xs font-medium" style={{ color: item.color }}>{item.points}/{item.max}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Price Points */}
      {data.prices.length > 0 && (
        <div className="rounded-xl" style={{ padding: '20px', marginBottom: '24px', background: card, border: `1px solid ${border}` }}>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: text, marginBottom: '12px' }}>
            <DollarSign size={18} /> Price Points
          </h3>
          <div className="flex gap-3 flex-wrap">
            {data.prices.map((p, i) => (
              <span key={i} className="rounded-xl text-sm font-medium"
                style={{
                  padding: '8px 16px',
                  background: i === 0 ? '#2563eb20' : (darkMode ? '#1e293b' : '#f1f5f9'),
                  color: i === 0 ? '#3b82f6' : textMuted,
                  border: i === 0 ? '1px solid #3b82f6' : `1px solid ${border}`,
                }}>
                {formatPrice(p)} {i === 0 && '⭐'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Winning Angles */}
      {data.winningAngles?.length > 0 && (
        <div className="rounded-xl" style={{ padding: '20px', marginBottom: '24px', background: card, border: `1px solid ${border}` }}>
          <h3 className="text-base font-bold" style={{ color: text, marginBottom: '12px' }}>🎯 Winning Angles</h3>
          <div className="flex flex-col gap-2">
            {data.winningAngles.map((angle, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg"
                style={{ padding: '10px 16px', background: darkMode ? '#1e293b' : '#f8fafc' }}>
                <span className="text-sm" style={{ color: text }}>"{angle.phrase}"</span>
                <span className="text-xs font-medium" style={{ color: textMuted }}>×{angle.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sample Ads */}
      <div className="rounded-xl" style={{ padding: '20px', background: card, border: `1px solid ${border}` }}>
        <h3 className="text-base font-bold" style={{ color: text, marginBottom: '12px' }}>
          📢 Ads ({data.ads.length})
        </h3>
        <div className="flex flex-col gap-3">
          {data.ads.map((ad, i) => (
            <div key={ad.id || i} className="rounded-xl"
              style={{ padding: '16px', background: darkMode ? '#1e293b' : '#f8fafc', border: `1px solid ${border}` }}>
              <div className="flex items-center gap-3" style={{ marginBottom: '8px' }}>
                <span className="text-xs font-medium" style={{ color: '#3b82f6' }}>Position #{ad.searchPosition}</span>
                {ad.startDate && (
                  <span className="text-xs" style={{ color: textMuted }}>Started: {ad.startDate}</span>
                )}
                {ad.extractedPrice && (
                  <span className="text-xs font-medium" style={{ color: '#22c55e' }}>{formatPrice(ad.extractedPrice)}</span>
                )}
                {ad.platforms?.map(p => (
                  <span key={p} className="text-xs" style={{ color: textMuted }}>{p}</span>
                ))}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: text, whiteSpace: 'pre-wrap' }}>
                {ad.adText}
              </p>
              {ad.imageUrl && (
                <img src={ad.imageUrl} alt="Ad creative" className="rounded-lg"
                  style={{ marginTop: '12px', maxHeight: '200px', objectFit: 'cover' }}
                  onError={e => e.target.style.display = 'none'} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
