// Facebook Ads Library Scraper using Playwright
const { chromium } = require('playwright');

// Active scraping sessions
const scrapeSessions = new Map();

// Build Facebook Ads Library URL
function buildAdLibraryUrl(keyword, country = 'ID') {
  const params = new URLSearchParams({
    active_status: 'active',
    ad_type: 'all',
    country: country,
    q: keyword,
    sort_data: JSON.stringify([{ direction: 'desc', name: 'impressions' }]),
    search_type: 'keyword_unordered',
    media_type: 'all',
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

// Extract price from Indonesian ad text
function extractPrice(text) {
  if (!text) return null;
  const patterns = [
    /Rp\.?\s?(\d{1,3}(?:\.\d{3})+)/gi,
    /Rp\.?\s?(\d+)\s?(jt|juta)/gi,
    /Rp\.?\s?(\d+)\s?(rb|ribu)/gi,
    /Rp\.?\s?(\d+)k/gi,
    /(\d{1,3}(?:\.\d{3})+)\s?(?:rupiah|idr)/gi,
    /(\d+)\s?(rb|ribu|k)\b/gi,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      let value = match[1].replace(/\./g, '');
      const suffix = (match[2] || '').toLowerCase();
      value = parseInt(value);
      if (suffix === 'jt' || suffix === 'juta') value *= 1000000;
      else if (suffix === 'rb' || suffix === 'ribu' || suffix === 'k') value *= 1000;
      else if (value < 1000 && !suffix) value *= 1000;
      return value;
    }
  }
  return null;
}

// Classify product type from ad text
function classifyProductType(text) {
  if (!text) return 'other';
  const lower = text.toLowerCase();
  if (/e-?book|buku digital|pdf/i.test(lower)) return 'ebook';
  if (/template|desain|canva/i.test(lower)) return 'template';
  if (/kursus|course|kelas|webinar|workshop|bootcamp/i.test(lower)) return 'course';
  if (/panduan|guide|tutorial|modul/i.test(lower)) return 'guide';
  if (/planner|kalender|tracker|spreadsheet|excel/i.test(lower)) return 'planner';
  if (/video|vlog|konten/i.test(lower)) return 'video';
  if (/software|tools?|app|aplikasi/i.test(lower)) return 'software';
  return 'other';
}

// Detect niche from ad text
function detectNiche(text) {
  if (!text) return 'other';
  const lower = text.toLowerCase();
  if (/dropship|tiktok shop|shopee|marketplace|jualan online/i.test(lower)) return 'dropship';
  if (/trading|crypto|bitcoin|saham|investasi|forex/i.test(lower)) return 'trading';
  if (/diet|fitness|gym|sehat|kurus|langsing|olahraga/i.test(lower)) return 'health';
  if (/bisnis|usaha|umkm|entrepreneur|wirausaha|cuan/i.test(lower)) return 'business';
  if (/desain|design|canva|photoshop|illustrator/i.test(lower)) return 'design';
  if (/masak|resep|kuliner|makanan|frozen food/i.test(lower)) return 'food';
  if (/bahasa|english|inggris|mandarin|jepang/i.test(lower)) return 'language';
  if (/coding|programming|web|developer|IT/i.test(lower)) return 'tech';
  if (/marketing|digital marketing|ads|iklan|copywriting|seo/i.test(lower)) return 'marketing';
  if (/properti|rumah|tanah|property/i.test(lower)) return 'property';
  if (/parenting|anak|ibu|keluarga/i.test(lower)) return 'parenting';
  if (/motivasi|mindset|self.?help|produktif/i.test(lower)) return 'motivation';
  if (/affiliate|komisi|passive income/i.test(lower)) return 'affiliate';
  return 'other';
}

// Extract ads from current page DOM
async function extractAdsFromPage(page) {
  return await page.evaluate(() => {
    const results = [];
    const allDivs = [...document.querySelectorAll('div')];
    const seen = new Set();

    // Find smallest divs containing ad data
    const cardCandidates = allDivs.filter(div => {
      const text = div.innerText || '';
      return text.includes('ID Galeri:') &&
        (text.includes('Bersponsor') || text.includes('Lihat Detail')) &&
        text.length < 2000 && text.length > 100;
    });

    // Sort by text length (smallest first) to get leaf cards
    for (const div of cardCandidates.sort((a, b) => (a.innerText?.length || 0) - (b.innerText?.length || 0))) {
      const text = div.innerText || '';
      const idMatch = text.match(/ID Galeri:\s*(\d+)/);
      if (!idMatch) continue;
      const adId = idMatch[1];
      if (seen.has(adId)) continue;
      seen.add(adId);

      // Extract date
      const dateMatch = text.match(/Mulai dijalankan pada\s+(.+?)(?:\n|Platform)/);
      const startDate = dateMatch ? dateMatch[1].trim() : null;

      // Extract ad count indicator
      const adCountMatch = text.match(/(\d+)\s+iklan menggunakan/);
      const totalAdsIndicator = adCountMatch ? parseInt(adCountMatch[1]) : 1;

      // Extract advertiser name (before 'Bersponsor')
      const sponsorIdx = text.indexOf('Bersponsor');
      let advertiserName = '';
      let adText = '';

      if (sponsorIdx > 0) {
        const beforeSponsor = text.substring(0, sponsorIdx).trim();
        const lines = beforeSponsor.split('\n').filter(l => l.trim());
        advertiserName = lines[lines.length - 1]?.trim() || '';
        if (advertiserName.includes('Lihat Detail') || advertiserName.includes('Buka Menu')) {
          advertiserName = lines[lines.length - 2]?.trim() || '';
        }
        adText = text.substring(sponsorIdx + 'Bersponsor'.length).trim();
        adText = adText.replace(/\d+:\d+\s*\/\s*\d+:\d+/g, '').trim();
      }

      // Extract platforms from icons/text
      const platforms = [];
      if (text.includes('Facebook') || text.includes('Platform')) platforms.push('Facebook');
      if (text.includes('Instagram')) platforms.push('Instagram');
      if (text.includes('Messenger')) platforms.push('Messenger');
      if (platforms.length === 0) platforms.push('Facebook');

      // Extract image
      const img = div.querySelector('img[src*="scontent"], img[src*="fbcdn"]');
      const imageUrl = img ? img.src : null;

      results.push({
        adId,
        advertiserName,
        adText: adText.substring(0, 1500),
        startDate,
        totalAdsIndicator,
        platforms,
        imageUrl,
      });
    }

    return results;
  });
}

// Main scraping function
async function scrapeAdsLibrary(keyword, maxResults, onProgress) {
  const sessionId = keyword.replace(/\s+/g, '-').toLowerCase();

  if (scrapeSessions.has(sessionId) && scrapeSessions.get(sessionId).running) {
    throw new Error(`Already scraping "${keyword}"`);
  }

  const session = {
    running: true,
    progress: 0,
    total: maxResults,
    collected: 0,
    status: 'starting',
    startedAt: new Date().toISOString(),
    error: null,
    rateLimited: false,
  };
  scrapeSessions.set(sessionId, session);

  let browser = null;
  const allAds = new Map();

  try {
    session.status = 'launching browser';
    if (onProgress) onProgress(session);

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const context = await browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      locale: 'id-ID',
    });

    const page = await context.newPage();

    // Block heavy resources for speed
    await page.route('**/*.{mp4,webm,mp3}', route => route.abort());

    // Monitor for rate limiting
    page.on('response', async (res) => {
      if (res.url().includes('graphql')) {
        try {
          const body = await res.text();
          if (body.includes('Rate limit exceeded')) {
            session.rateLimited = true;
          }
        } catch (e) { /* ignore */ }
      }
    });

    session.status = 'navigating to Ads Library';
    if (onProgress) onProgress(session);

    const url = buildAdLibraryUrl(keyword);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(8000);

    // Handle cookie consent popup
    try {
      const cookieBtn = page.locator('button:has-text("Allow"), button:has-text("Izinkan"), button:has-text("Accept")');
      if (await cookieBtn.isVisible({ timeout: 3000 })) {
        await cookieBtn.first().click();
        await page.waitForTimeout(2000);
      }
    } catch (e) { /* no cookie popup */ }

    session.status = 'scraping ads';
    if (onProgress) onProgress(session);

    let position = 1;
    let noNewAdsCount = 0;
    let loadMoreAttempts = 0;
    const maxLoadMoreAttempts = Math.ceil(maxResults / 25); // ~25 ads per page

    while (allAds.size < maxResults && session.running && loadMoreAttempts < maxLoadMoreAttempts) {
      // Extract ads from current page
      const pageAds = await extractAdsFromPage(page);

      let newAdsThisRound = 0;
      for (const ad of pageAds) {
        if (!allAds.has(ad.adId)) {
          allAds.set(ad.adId, {
            id: ad.adId,
            advertiserName: ad.advertiserName,
            adText: ad.adText,
            imageUrl: ad.imageUrl,
            startDate: ad.startDate,
            endDate: null,
            platforms: ad.platforms,
            searchPosition: allAds.size + 1, // Position based on order of discovery
            totalAdsIndicator: ad.totalAdsIndicator,
            extractedPrice: extractPrice(ad.adText),
            productType: classifyProductType(ad.adText),
            niche: detectNiche(ad.adText),
          });
          newAdsThisRound++;
        }
      }

      session.collected = allAds.size;
      session.progress = Math.round((allAds.size / maxResults) * 100);
      if (onProgress) onProgress(session);

      console.log(`[${keyword}] Page ${loadMoreAttempts + 1}: ${pageAds.length} on page, ${newAdsThisRound} new, ${allAds.size} total`);

      // Check if we got new ads
      if (newAdsThisRound === 0) {
        noNewAdsCount++;
        if (noNewAdsCount >= 3) {
          session.status = session.rateLimited ? 'rate limited - stopped' : 'no more results';
          break;
        }
      } else {
        noNewAdsCount = 0;
      }

      // If rate limited, wait longer
      if (session.rateLimited) {
        console.log(`[${keyword}] Rate limited, waiting 30 seconds...`);
        session.status = 'rate limited - waiting';
        if (onProgress) onProgress(session);
        await page.waitForTimeout(30000);
        session.rateLimited = false;
      }

      // Click "Lihat lebih banyak" to load more
      try {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1500);

        const loadMoreBtn = page.locator('a[role="button"]:has-text("Lihat lebih banyak")');
        if (await loadMoreBtn.isVisible({ timeout: 3000 })) {
          await loadMoreBtn.click({ force: true });
          // Wait for new content
          const delay = 4000 + Math.random() * 3000;
          await page.waitForTimeout(delay);
        } else {
          // No load more button - might be end of results
          noNewAdsCount++;
        }
      } catch (e) {
        console.log(`[${keyword}] Load more error:`, e.message);
        noNewAdsCount++;
      }

      loadMoreAttempts++;
    }

    session.status = 'completed';
    session.running = false;
    session.progress = 100;
    if (onProgress) onProgress(session);

  } catch (err) {
    session.status = 'error';
    session.error = err.message;
    session.running = false;
    if (onProgress) onProgress(session);
    throw err;
  } finally {
    if (browser) await browser.close();
  }

  const ads = [...allAds.values()];
  return {
    keyword,
    ads,
    scrapedAt: new Date().toISOString(),
    totalCollected: ads.length,
  };
}

// Stop scraping
function stopScraping(keyword) {
  const sessionId = keyword.replace(/\s+/g, '-').toLowerCase();
  const session = scrapeSessions.get(sessionId);
  if (session) {
    session.running = false;
    session.status = 'stopped';
    return true;
  }
  return false;
}

// Get scraping status
function getScrapeStatus(keyword) {
  const sessionId = keyword.replace(/\s+/g, '-').toLowerCase();
  return scrapeSessions.get(sessionId) || null;
}

// Random user agents
function getRandomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

module.exports = {
  scrapeAdsLibrary,
  stopScraping,
  getScrapeStatus,
  extractPrice,
  classifyProductType,
  detectNiche,
};
