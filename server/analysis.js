// Analysis Engine - Scoring & Intelligence
const db = require('./db');

// Calculate winning score for an advertiser's ads
function calculateWinningScore(advertiserData) {
  let score = 0;

  // Duration scoring (0-40 points)
  const daysRunning = advertiserData.longestDuration || 0;
  if (daysRunning >= 30) score += 40;
  else if (daysRunning >= 14) score += 30;
  else if (daysRunning >= 7) score += 15;

  // Position scoring (0-35 points)
  const bestPosition = advertiserData.bestPosition || 9999;
  if (bestPosition <= 20) score += 35;
  else if (bestPosition <= 50) score += 25;
  else if (bestPosition <= 100) score += 15;

  // Total ads scoring (0-25 points)
  const totalAds = advertiserData.totalAds || 0;
  if (totalAds >= 10) score += 25;
  else if (totalAds >= 5) score += 20;
  else if (totalAds >= 3) score += 10;

  return Math.min(score, 100);
}

// Get decision matrix label
function getDecisionLabel(score) {
  if (score >= 80) return { label: 'CONFIRMED WINNER', emoji: '🔥', color: 'red' };
  if (score >= 65) return { label: 'HIGH CONFIDENCE', emoji: '✅', color: 'green' };
  if (score >= 50) return { label: 'WORTH WATCHING', emoji: '🟡', color: 'yellow' };
  if (score >= 35) return { label: 'RISING FAST', emoji: '⚡', color: 'orange' };
  return { label: 'TOO EARLY', emoji: '⚪', color: 'gray' };
}

// Calculate days between two dates
function daysBetween(dateStr1, dateStr2) {
  if (!dateStr1) return 0;
  const d1 = new Date(dateStr1);
  const d2 = dateStr2 ? new Date(dateStr2) : new Date();
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

// Analyze results for a keyword
function analyzeKeywordResults(keywordId) {
  const results = db.getResults(keywordId);
  if (!results || !results.ads || results.ads.length === 0) {
    return {
      keyword: keywordId,
      totalAds: 0,
      totalAdvertisers: 0,
      products: [],
      nicheBreakdown: {},
      priceBreakdown: {},
      scrapedAt: null,
    };
  }

  const ads = results.ads;

  // Group by advertiser
  const byAdvertiser = {};
  for (const ad of ads) {
    const name = ad.advertiserName || 'Unknown';
    if (!byAdvertiser[name]) {
      byAdvertiser[name] = {
        advertiserName: name,
        ads: [],
        totalAds: 0,
        bestPosition: 9999,
        longestDuration: 0,
        prices: [],
        niches: [],
        productTypes: [],
        platforms: [],
        adTexts: [],
      };
    }
    const group = byAdvertiser[name];
    group.ads.push(ad);
    group.totalAds = Math.max(group.totalAds, ad.totalAdsIndicator || 1);
    if (group.totalAds < group.ads.length) group.totalAds = group.ads.length;
    group.bestPosition = Math.min(group.bestPosition, ad.searchPosition || 9999);
    
    const duration = daysBetween(ad.startDate, null);
    group.longestDuration = Math.max(group.longestDuration, duration);
    
    if (ad.extractedPrice) group.prices.push(ad.extractedPrice);
    if (ad.niche) group.niches.push(ad.niche);
    if (ad.productType) group.productTypes.push(ad.productType);
    if (ad.platforms) group.platforms.push(...ad.platforms);
    if (ad.adText) group.adTexts.push(ad.adText);
  }

  // Calculate scores and build product list
  const products = Object.values(byAdvertiser).map(group => {
    const score = calculateWinningScore(group);
    const decision = getDecisionLabel(score);
    
    // Most common price
    const priceFreq = {};
    group.prices.forEach(p => { priceFreq[p] = (priceFreq[p] || 0) + 1; });
    const commonPrice = Object.entries(priceFreq)
      .sort((a, b) => b[1] - a[1])[0];

    // Most common niche
    const nicheFreq = {};
    group.niches.forEach(n => { nicheFreq[n] = (nicheFreq[n] || 0) + 1; });
    const commonNiche = Object.entries(nicheFreq)
      .sort((a, b) => b[1] - a[1])[0];

    // Most common product type
    const typeFreq = {};
    group.productTypes.forEach(t => { typeFreq[t] = (typeFreq[t] || 0) + 1; });
    const commonType = Object.entries(typeFreq)
      .sort((a, b) => b[1] - a[1])[0];

    // Unique platforms
    const uniquePlatforms = [...new Set(group.platforms)];

    return {
      advertiserName: group.advertiserName,
      score,
      decision,
      totalAds: group.totalAds,
      bestPosition: group.bestPosition,
      longestDuration: group.longestDuration,
      commonPrice: commonPrice ? parseInt(commonPrice[0]) : null,
      allPrices: [...new Set(group.prices)].sort((a, b) => a - b),
      niche: commonNiche ? commonNiche[0] : 'other',
      productType: commonType ? commonType[0] : 'other',
      platforms: uniquePlatforms,
      sampleAds: group.ads.slice(0, 5).map(ad => ({
        id: ad.id,
        adText: ad.adText ? ad.adText.substring(0, 500) : '',
        imageUrl: ad.imageUrl,
        startDate: ad.startDate,
        searchPosition: ad.searchPosition,
        extractedPrice: ad.extractedPrice,
      })),
      scoreBreakdown: {
        duration: group.longestDuration >= 30 ? 40 : group.longestDuration >= 14 ? 30 : group.longestDuration >= 7 ? 15 : 0,
        position: group.bestPosition <= 20 ? 35 : group.bestPosition <= 50 ? 25 : group.bestPosition <= 100 ? 15 : 0,
        adCount: group.totalAds >= 10 ? 25 : group.totalAds >= 5 ? 20 : group.totalAds >= 3 ? 10 : 0,
      },
    };
  });

  // Sort by score descending
  products.sort((a, b) => b.score - a.score);

  // Niche breakdown
  const nicheBreakdown = {};
  for (const p of products) {
    if (!nicheBreakdown[p.niche]) {
      nicheBreakdown[p.niche] = { count: 0, avgScore: 0, totalScore: 0 };
    }
    nicheBreakdown[p.niche].count++;
    nicheBreakdown[p.niche].totalScore += p.score;
    nicheBreakdown[p.niche].avgScore = Math.round(
      nicheBreakdown[p.niche].totalScore / nicheBreakdown[p.niche].count
    );
  }

  // Price breakdown
  const priceRanges = {
    'under_100k': { min: 0, max: 100000, count: 0 },
    '100k_300k': { min: 100000, max: 300000, count: 0 },
    '300k_1jt': { min: 300000, max: 1000000, count: 0 },
    'above_1jt': { min: 1000000, max: Infinity, count: 0 },
  };
  for (const p of products) {
    if (!p.commonPrice) continue;
    for (const [key, range] of Object.entries(priceRanges)) {
      if (p.commonPrice >= range.min && p.commonPrice < range.max) {
        range.count++;
        break;
      }
    }
  }

  return {
    keyword: keywordId,
    totalAds: ads.length,
    totalAdvertisers: products.length,
    scrapedAt: results.scrapedAt,
    products,
    nicheBreakdown,
    priceBreakdown: priceRanges,
    summary: {
      confirmedWinners: products.filter(p => p.score >= 80).length,
      highConfidence: products.filter(p => p.score >= 65 && p.score < 80).length,
      worthWatching: products.filter(p => p.score >= 50 && p.score < 65).length,
      risingFast: products.filter(p => p.score >= 35 && p.score < 50).length,
      tooEarly: products.filter(p => p.score < 35).length,
    },
  };
}

// Cross-keyword overview
function generateOverview() {
  const keywords = db.getKeywords();
  const keywordResults = [];

  for (const kw of keywords) {
    const analysis = analyzeKeywordResults(kw.id);
    keywordResults.push({
      keyword: kw.keyword,
      keywordId: kw.id,
      totalAds: analysis.totalAds,
      totalAdvertisers: analysis.totalAdvertisers,
      scrapedAt: analysis.scrapedAt,
      topProducts: analysis.products.slice(0, 3),
      summary: analysis.summary,
    });
  }

  // Find hottest products across all keywords
  const allProducts = [];
  for (const kw of keywords) {
    const analysis = analyzeKeywordResults(kw.id);
    for (const p of analysis.products) {
      allProducts.push({ ...p, keyword: kw.keyword, keywordId: kw.id });
    }
  }
  allProducts.sort((a, b) => b.score - a.score);

  // Detect products appearing in multiple keywords
  const advertiserKeywords = {};
  for (const p of allProducts) {
    if (!advertiserKeywords[p.advertiserName]) {
      advertiserKeywords[p.advertiserName] = { keywords: new Set(), bestScore: 0, product: null };
    }
    advertiserKeywords[p.advertiserName].keywords.add(p.keyword);
    if (p.score > advertiserKeywords[p.advertiserName].bestScore) {
      advertiserKeywords[p.advertiserName].bestScore = p.score;
      advertiserKeywords[p.advertiserName].product = p;
    }
  }

  const crossKeywordProducts = Object.entries(advertiserKeywords)
    .filter(([_, data]) => data.keywords.size > 1)
    .map(([name, data]) => ({
      advertiserName: name,
      keywords: [...data.keywords],
      bestScore: data.bestScore,
      product: data.product,
    }))
    .sort((a, b) => b.bestScore - a.bestScore);

  return {
    keywords: keywordResults,
    hottestProducts: allProducts.slice(0, 10),
    crossKeywordProducts,
    totalAdsScraped: keywordResults.reduce((sum, k) => sum + k.totalAds, 0),
    totalAdvertisers: keywordResults.reduce((sum, k) => sum + k.totalAdvertisers, 0),
  };
}

// Get advertiser detail across a keyword
function getAdvertiserDetail(keywordId, advertiserName) {
  const results = db.getResults(keywordId);
  if (!results || !results.ads) return null;

  const ads = results.ads.filter(a => a.advertiserName === advertiserName);
  if (ads.length === 0) return null;

  // Extract winning angles (common phrases)
  const phrases = {};
  for (const ad of ads) {
    if (!ad.adText) continue;
    // Split into sentences and count frequency
    const sentences = ad.adText.split(/[.!?\n]+/).filter(s => s.trim().length > 10);
    for (const s of sentences) {
      const clean = s.trim().substring(0, 100);
      phrases[clean] = (phrases[clean] || 0) + 1;
    }
  }
  const winningAngles = Object.entries(phrases)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase, count]) => ({ phrase, count }));

  const group = {
    advertiserName,
    totalAds: ads.length,
    bestPosition: Math.min(...ads.map(a => a.searchPosition || 9999)),
    longestDuration: Math.max(...ads.map(a => daysBetween(a.startDate, null))),
    prices: [...new Set(ads.map(a => a.extractedPrice).filter(Boolean))],
    niches: [...new Set(ads.map(a => a.niche).filter(Boolean))],
    productTypes: [...new Set(ads.map(a => a.productType).filter(Boolean))],
    platforms: [...new Set(ads.flatMap(a => a.platforms || []))],
  };

  const score = calculateWinningScore(group);
  const decision = getDecisionLabel(score);

  return {
    ...group,
    score,
    decision,
    winningAngles,
    scoreBreakdown: {
      duration: group.longestDuration >= 30 ? 40 : group.longestDuration >= 14 ? 30 : group.longestDuration >= 7 ? 15 : 0,
      position: group.bestPosition <= 20 ? 35 : group.bestPosition <= 50 ? 25 : group.bestPosition <= 100 ? 15 : 0,
      adCount: group.totalAds >= 10 ? 25 : group.totalAds >= 5 ? 20 : group.totalAds >= 3 ? 10 : 0,
    },
    ads: ads.map(ad => ({
      id: ad.id,
      adText: ad.adText ? ad.adText.substring(0, 500) : '',
      imageUrl: ad.imageUrl,
      startDate: ad.startDate,
      searchPosition: ad.searchPosition,
      extractedPrice: ad.extractedPrice,
      productType: ad.productType,
      niche: ad.niche,
      platforms: ad.platforms,
      totalAdsIndicator: ad.totalAdsIndicator,
    })),
  };
}

module.exports = {
  calculateWinningScore,
  getDecisionLabel,
  analyzeKeywordResults,
  generateOverview,
  getAdvertiserDetail,
};
