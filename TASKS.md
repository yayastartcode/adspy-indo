# TASKS.md - AdSpy Indo 🇮🇩

## Phase 1: MVP

### 1. Project Setup
- [x] Create SPEC.md
- [x] Create TASKS.md
- [x] Init Node.js project
- [x] Setup project structure
- [x] Install dependencies (express, playwright, cors)

### 2. File-Based Database
- [x] Create `data/` folder structure
- [x] `data/keywords.json` - keyword configs
- [x] `data/results/` - per-keyword JSON files
- [x] Helper functions: read/write JSON files
- [x] Auto-create folders if not exist

### 3. Scraper Engine
- [x] Playwright setup with stealth mode
- [x] Facebook Ads Library page navigator
  - [x] URL builder (keyword + country: Indonesia)
  - [x] Handle popups/cookie banners
- [x] Infinite scroll with position tracking
  - [x] Stop at configurable max_results
  - [x] Progress callback (for frontend progress bar)
- [x] Ad data extractor
  - [x] Advertiser name
  - [x] Ad text
  - [x] Image URL
  - [x] Start date
  - [x] Platform (FB/IG)
  - [x] Total ads indicator (if shown)
- [x] Intelligence extractor
  - [x] Price extraction (Rp format)
  - [x] Product type classification
  - [x] Niche detection
- [x] Save results to JSON file
- [x] Anti-detection (random delays, user agent rotation)

### 4. Analysis Engine
- [x] Winning score calculator (duration + position + ads)
- [x] Decision matrix labeling
- [x] Product grouping (by advertiser/similar product)
- [x] Common price point extraction
- [x] Winning angle extraction (common phrases)
- [x] Trend comparison (if previous data exists)

### 5. Backend API (Express)
- [x] `GET /api/keywords` - List keywords
- [x] `POST /api/keywords` - Add keyword
- [x] `PUT /api/keywords/:id` - Update keyword
- [x] `DELETE /api/keywords/:id` - Delete keyword
- [x] `POST /api/scrape/:keyword` - Start scraping (manual trigger)
- [x] `GET /api/scrape/:keyword/status` - Scraping progress
- [x] `POST /api/scrape/:keyword/stop` - Stop scraping
- [x] `GET /api/results/:keyword` - Get results with scores
- [x] `GET /api/results/:keyword/detail/:advertiser` - Detail view
- [x] `GET /api/overview` - Cross-keyword summary

### 6. Frontend Dashboard
- [x] Vite + React + Tailwind v4 setup
- [x] Keyword Management
  - [x] Add/edit/delete keywords
  - [x] Max results setting
  - [x] "Scrape Now" button with progress bar
  - [x] Stop button
- [x] Results View (per keyword tab)
  - [x] Winning products list with score bars
  - [x] Sort: score / duration / position / ads / price
  - [x] Filter: score threshold
  - [x] Decision matrix badges
- [x] Product Detail View
  - [x] Score breakdown
  - [x] Price points
  - [x] Advertisers list
  - [x] Winning angles
  - [x] Sample ads
- [x] Overview Page
  - [x] Cross-keyword comparison
  - [x] Hottest products overall
- [x] Dark mode
- [x] Responsive (mobile-friendly)

### 7. Testing & Polish
- [ ] Test scraper with real Facebook data
- [ ] Validate scoring with known products
- [ ] Error handling improvements
- [ ] Loading states & empty states
- [x] README with setup instructions

---

## Progress
- **Started:** 22 April 2026
- **Current Task:** Testing & Polish
- **Status:** ✅ MVP Built!
