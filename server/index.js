// Express API Server
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const scraper = require('./scraper');
const analysis = require('./analysis');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Ensure data directories exist
db.ensureDirs();

// ============ KEYWORD ENDPOINTS ============

// List all keywords
app.get('/api/keywords', (req, res) => {
  const keywords = db.getKeywords();
  res.json(keywords);
});

// Add keyword
app.post('/api/keywords', (req, res) => {
  const { keyword, maxResults = 2000 } = req.body;
  if (!keyword) return res.status(400).json({ error: 'Keyword is required' });

  const id = keyword.toLowerCase().replace(/\s+/g, '-');
  const existing = db.getKeywordById(id);
  if (existing) return res.status(409).json({ error: 'Keyword already exists' });

  const newKeyword = {
    id,
    keyword,
    maxResults,
    isActive: true,
    lastScrapedAt: null,
  };
  db.addKeyword(newKeyword);
  res.status(201).json(newKeyword);
});

// Update keyword
app.put('/api/keywords/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const updated = db.updateKeyword(id, updates);
  if (!updated) return res.status(404).json({ error: 'Keyword not found' });
  res.json(updated);
});

// Delete keyword
app.delete('/api/keywords/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteKeyword(id);
  if (!deleted) return res.status(404).json({ error: 'Keyword not found' });
  res.json({ success: true });
});

// ============ SCRAPING ENDPOINTS ============

// Start scraping (manual trigger)
app.post('/api/scrape/:keyword', async (req, res) => {
  const { keyword } = req.params;
  const kw = db.getKeywordById(keyword);
  if (!kw) return res.status(404).json({ error: 'Keyword not found' });

  // Check if already scraping
  const status = scraper.getScrapeStatus(keyword);
  if (status && status.running) {
    return res.status(409).json({ error: 'Already scraping this keyword' });
  }

  res.json({ message: `Started scraping "${kw.keyword}"`, keyword: kw.keyword });

  // Run scraping in background
  try {
    const results = await scraper.scrapeAdsLibrary(kw.keyword, kw.maxResults, (progress) => {
      // Progress is tracked in scraper module
    });

    // Save results
    db.saveResults(keyword, results);

    // Update keyword lastScrapedAt
    db.updateKeyword(keyword, { lastScrapedAt: new Date().toISOString() });

    console.log(`Scraping "${kw.keyword}" completed: ${results.totalCollected} ads`);
  } catch (err) {
    console.error(`Scraping "${kw.keyword}" failed:`, err.message);
  }
});

// Get scraping status
app.get('/api/scrape/:keyword/status', (req, res) => {
  const { keyword } = req.params;
  const status = scraper.getScrapeStatus(keyword);
  if (!status) return res.json({ running: false, status: 'idle' });
  res.json(status);
});

// Stop scraping
app.post('/api/scrape/:keyword/stop', (req, res) => {
  const { keyword } = req.params;
  const stopped = scraper.stopScraping(keyword);
  if (!stopped) return res.status(404).json({ error: 'No active scraping session' });
  res.json({ success: true, message: 'Scraping stopped' });
});

// ============ RESULTS ENDPOINTS ============

// Get analyzed results for a keyword
app.get('/api/results/:keyword', (req, res) => {
  const { keyword } = req.params;
  const { sort = 'score', order = 'desc', minScore, niche, productType } = req.query;

  const results = analysis.analyzeKeywordResults(keyword);

  // Apply filters
  let products = results.products;
  if (minScore) products = products.filter(p => p.score >= parseInt(minScore));
  if (niche) products = products.filter(p => p.niche === niche);
  if (productType) products = products.filter(p => p.productType === productType);

  // Apply sorting
  const sortKey = {
    score: 'score',
    duration: 'longestDuration',
    position: 'bestPosition',
    ads: 'totalAds',
    price: 'commonPrice',
  }[sort] || 'score';

  products.sort((a, b) => {
    const aVal = a[sortKey] || 0;
    const bVal = b[sortKey] || 0;
    // Position: lower is better, so reverse for desc
    if (sortKey === 'bestPosition') {
      return order === 'desc' ? aVal - bVal : bVal - aVal;
    }
    return order === 'desc' ? bVal - aVal : aVal - bVal;
  });

  res.json({ ...results, products });
});

// Get advertiser detail
app.get('/api/results/:keyword/detail/:advertiser', (req, res) => {
  const { keyword, advertiser } = req.params;
  const detail = analysis.getAdvertiserDetail(keyword, decodeURIComponent(advertiser));
  if (!detail) return res.status(404).json({ error: 'Advertiser not found' });
  res.json(detail);
});

// ============ OVERVIEW ENDPOINT ============

app.get('/api/overview', (req, res) => {
  const overview = analysis.generateOverview();
  res.json(overview);
});

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log(`\n🚀 AdSpy Indo API running at http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:5173\n`);
});
