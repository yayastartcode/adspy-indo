// AdSpy Indo - Facebook Ads Library Scraper
// Usage: node scrape.js <keyword-id> [max-results]
// Example: node scrape.js ebook 2000

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const resultsDir = path.join(dataDir, 'results');
const keywordsFile = path.join(dataDir, 'keywords.json');

// Ensure dirs
if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

// Read keywords config
function getKeywords() {
  if (!fs.existsSync(keywordsFile)) return [];
  return JSON.parse(fs.readFileSync(keywordsFile, 'utf8'));
}

function saveKeywords(keywords) {
  fs.writeFileSync(keywordsFile, JSON.stringify(keywords, null, 2), 'utf8');
}

// Price extraction
function extractPrice(text) {
  if (!text) return null;
  const patterns = [
    /Rp\.?\s?(\d{1,3}(?:\.\d{3})+)/gi,
    /Rp\.?\s?(\d+)\s?(jt|juta)/gi,
    /Rp\.?\s?(\d+)\s?(rb|ribu)/gi,
    /Rp\.?\s?(\d+)k/gi,
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
      return value;
    }
  }
  return null;
}

// Product type classification
function classifyProductType(text) {
  if (!text) return 'other';
  const lower = text.toLowerCase();
  if (/e-?book|buku digital|pdf/i.test(lower)) return 'ebook';
  if (/template|desain|canva/i.test(lower)) return 'template';
  if (/kursus|course|kelas|webinar|workshop/i.test(lower)) return 'course';
  if (/panduan|guide|tutorial|modul/i.test(lower)) return 'guide';
  if (/planner|kalender|tracker|spreadsheet/i.test(lower)) return 'planner';
  if (/software|tools?|app|aplikasi/i.test(lower)) return 'software';
  return 'other';
}

// Niche detection
function detectNiche(text) {
  if (!text) return 'other';
  const lower = text.toLowerCase();
  if (/dropship|tiktok shop|shopee|marketplace/i.test(lower)) return 'dropship';
  if (/trading|crypto|bitcoin|saham|investasi|forex/i.test(lower)) return 'trading';
  if (/diet|fitness|gym|sehat|kurus/i.test(lower)) return 'health';
  if (/bisnis|usaha|umkm|entrepreneur|cuan/i.test(lower)) return 'business';
  if (/desain|design|canva|photoshop/i.test(lower)) return 'design';
  if (/masak|resep|kuliner|makanan/i.test(lower)) return 'food';
  if (/bahasa|english|inggris/i.test(lower)) return 'language';
  if (/coding|programming|web|developer/i.test(lower)) return 'tech';
  if (/marketing|digital marketing|ads|iklan|copywriting/i.test(lower)) return 'marketing';
  if (/motivasi|mindset|self.?help/i.test(lower)) return 'motivation';
  if (/affiliate|komisi|passive income/i.test(lower)) return 'affiliate';
  return 'other';
}

// Random user agent
function randomUA() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

// Main scrape function
async function scrape(keyword, maxResults) {
  console.log(`\n🔍 Scraping "${keyword}" (max ${maxResults} ads)...\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    userAgent: randomUA(),
    viewport: { width: 1920, height: 1080 },
    locale: 'id-ID',
  });

  const page = await context.newPage();
  await page.route('**/*.{mp4,webm,mp3}', route => route.abort());

  // Track rate limiting
  let rateLimited = false;
  page.on('response', async (res) => {
    if (res.url().includes('graphql')) {
      try {
        const body = await res.text();
        if (body.includes('Rate limit exceeded')) rateLimited = true;
      } catch (e) {}
    }
  });

  // Build URL
  const params = new URLSearchParams({
    active_status: 'active', ad_type: 'all', country: 'ID', q: keyword,
    sort_data: JSON.stringify([{ direction: 'desc', name: 'impressions' }]),
    search_type: 'keyword_unordered', media_type: 'all',
  });
  const url = `https://www.facebook.com/ads/library/?${params}`;

  console.log('📡 Navigating to Facebook Ads Library...');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(8000);

  // Handle cookie popup
  try {
    const cookieBtn = page.locator('button:has-text("Allow"), button:has-text("Izinkan")');
    if (await cookieBtn.isVisible({ timeout: 3000 })) {
      await cookieBtn.first().click();
      await page.waitForTimeout(2000);
    }
  } catch (e) {}

  const allAds = new Map();
  let noNewCount = 0;
  let pageNum = 0;

  while (allAds.size < maxResults && pageNum < Math.ceil(maxResults / 25) + 5) {
    // Extract ads
    const pageAds = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const allDivs = [...document.querySelectorAll('div')];

      const cards = allDivs.filter(div => {
        const text = div.innerText || '';
        return text.includes('ID Galeri:') &&
          (text.includes('Bersponsor') || text.includes('Lihat Detail')) &&
          text.length < 2000 && text.length > 100;
      });

      for (const div of cards.sort((a, b) => (a.innerText?.length || 0) - (b.innerText?.length || 0))) {
        const text = div.innerText || '';
        const idMatch = text.match(/ID Galeri:\s*(\d+)/);
        if (!idMatch || seen.has(idMatch[1])) continue;
        seen.add(idMatch[1]);

        const dateMatch = text.match(/Mulai dijalankan pada\s+(.+?)(?:\n|Platform)/);
        const adCountMatch = text.match(/(\d+)\s+iklan menggunakan/);
        const sponsorIdx = text.indexOf('Bersponsor');
        let advertiserName = '', adText = '';

        if (sponsorIdx > 0) {
          const lines = text.substring(0, sponsorIdx).trim().split('\n').filter(l => l.trim());
          advertiserName = lines[lines.length - 1]?.trim() || '';
          if (advertiserName.includes('Lihat Detail') || advertiserName.includes('Buka Menu'))
            advertiserName = lines[lines.length - 2]?.trim() || '';
          adText = text.substring(sponsorIdx + 'Bersponsor'.length).trim().replace(/\d+:\d+\s*\/\s*\d+:\d+/g, '').trim();
        }

        const img = div.querySelector('img[src*="scontent"], img[src*="fbcdn"]');

        results.push({
          adId: idMatch[1],
          advertiserName,
          adText: adText.substring(0, 1500),
          startDate: dateMatch ? dateMatch[1].trim() : null,
          totalAdsIndicator: adCountMatch ? parseInt(adCountMatch[1]) : 1,
          imageUrl: img ? img.src : null,
        });
      }
      return results;
    });

    let newCount = 0;
    for (const ad of pageAds) {
      if (!allAds.has(ad.adId)) {
        allAds.set(ad.adId, {
          id: ad.adId,
          advertiserName: ad.advertiserName,
          adText: ad.adText,
          imageUrl: ad.imageUrl,
          startDate: ad.startDate,
          endDate: null,
          platforms: ['Facebook'],
          searchPosition: allAds.size + 1,
          totalAdsIndicator: ad.totalAdsIndicator,
          extractedPrice: extractPrice(ad.adText),
          productType: classifyProductType(ad.adText),
          niche: detectNiche(ad.adText),
        });
        newCount++;
      }
    }

    pageNum++;
    const pct = Math.round((allAds.size / maxResults) * 100);
    process.stdout.write(`\r📊 Page ${pageNum}: ${allAds.size} ads collected (${pct}%)`);

    if (newCount === 0) {
      noNewCount++;
      if (noNewCount >= 3) {
        console.log('\n⚠️  No more new ads found.');
        break;
      }
    } else {
      noNewCount = 0;
    }

    if (rateLimited) {
      console.log('\n⏳ Rate limited, waiting 30 seconds...');
      await page.waitForTimeout(30000);
      rateLimited = false;
    }

    // Click load more
    try {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);
      const btn = page.locator('a[role="button"]:has-text("Lihat lebih banyak")');
      if (await btn.isVisible({ timeout: 3000 })) {
        await btn.click({ force: true });
        await page.waitForTimeout(4000 + Math.random() * 3000);
      }
    } catch (e) {}
  }

  await browser.close();

  const ads = [...allAds.values()];
  console.log(`\n\n✅ Done! Collected ${ads.length} ads.\n`);

  return { keyword, ads, scrapedAt: new Date().toISOString(), totalCollected: ads.length };
}

// Main
(async () => {
  const keywordId = process.argv[2];
  if (!keywordId) {
    console.log('Usage: node scrape.js <keyword-id> [max-results]');
    console.log('Example: node scrape.js ebook 2000');
    console.log('\nAvailable keywords:');
    getKeywords().forEach(kw => console.log(`  - ${kw.id} (${kw.keyword}, max: ${kw.maxResults})`));
    process.exit(1);
  }

  const keywords = getKeywords();
  const kw = keywords.find(k => k.id === keywordId);
  const keyword = kw ? kw.keyword : keywordId;
  const maxResults = parseInt(process.argv[3]) || (kw ? kw.maxResults : 2000);

  const results = await scrape(keyword, maxResults);

  // Save results
  const outFile = path.join(resultsDir, `${keywordId}.json`);
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf8');
  console.log(`💾 Saved to data/results/${keywordId}.json`);

  // Update keyword lastScrapedAt
  if (kw) {
    kw.lastScrapedAt = new Date().toISOString();
    saveKeywords(keywords);
    console.log('📝 Updated keyword config');
  }

  console.log('\n🎉 All done! Refresh your browser to see results.\n');
})().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
