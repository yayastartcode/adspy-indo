# 🇮🇩 AdSpy Indo

**Winning Digital Product Intelligence Tool** untuk market Indonesia.

Scrape Facebook Ads Library → Analyze data → Detect winning products.

## Quick Start

### 1. Install Dependencies

```bash
# Backend
cd server
npm install
npx playwright install chromium

# Frontend
cd ../frontend
npm install
```

### 2. Run

```bash
# Terminal 1: Start backend
cd server
npm start

# Terminal 2: Start frontend
cd frontend
npm run dev
```

- **Backend API:** http://localhost:3001
- **Dashboard:** http://localhost:5173

### 3. Usage

1. Open dashboard di browser
2. Add keywords di sidebar (atau pakai default)
3. Klik **"Scrape Now"** untuk mulai scraping
4. Tunggu sampai selesai
5. Lihat winning products dengan scoring!

## Features

- 🔍 **Keyword-based scraping** dari Facebook Ads Library
- 📊 **Winning score algorithm** (duration + position + ad count)
- 🏆 **Decision matrix** (Confirmed Winner → Too Early)
- 📈 **Sort & filter** (score, duration, position, ads, price)
- 🌙 **Dark mode**
- 📱 **Responsive design**

## Scoring Algorithm

| Parameter | Max Points | Logic |
|-----------|-----------|-------|
| Duration | 40 | ≥30d=40, ≥14d=30, ≥7d=15 |
| Position | 35 | Top20=35, Top50=25, Top100=15 |
| Total Ads | 25 | ≥10=25, ≥5=20, ≥3=10 |

## Decision Matrix

| Score | Label |
|-------|-------|
| 80-100 | 🔥 CONFIRMED WINNER |
| 65-79 | ✅ HIGH CONFIDENCE |
| 50-64 | 🟡 WORTH WATCHING |
| 35-49 | ⚡ RISING FAST |
| 0-34 | ⚪ TOO EARLY |

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS v4
- **Backend:** Node.js + Express
- **Database:** JSON files (no SQL needed!)
- **Scraper:** Playwright

## Data Storage

All data stored as JSON files in `data/`:
```
data/
  keywords.json          → keyword configs
  results/
    ebook.json           → scraped ads
    template.json
  snapshots/
    2026-04-22.json      → daily summaries
```
