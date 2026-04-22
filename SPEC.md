# SPEC.md - AdSpy Indo 🇮🇩

## Overview
**Winning Digital Product Intelligence Tool** untuk market Indonesia.
Scrape Facebook Ads Library, analyze data, dan generate actionable insights untuk mendeteksi produk digital yang sedang winning.

## Problem
- Digital product creators ga tau produk apa yang lagi laku
- Manual research di Facebook Ads Library makan waktu berjam-jam
- Ga ada tool yang fokus ke market Indonesia
- Data mentah tanpa analysis = useless

## Solution
Lightweight local tool: klik tombol scrape → data masuk → auto analysis → lihat winning products.

## Core Parameters (The Holy Trinity)
1. **Ad Duration** - Lama iklan running (lama = profitable)
2. **Impression Position** - Urutan di sort by impression (tinggi = budget besar)
3. **Total Ads Count** - Jumlah ads per advertiser (banyak = scaling)

## Tech Stack (Simple!)
- **Frontend:** React + Vite + Tailwind CSS v4
- **Backend:** Node.js + Express
- **Database:** JSON files (no SQL!)
- **Scraper:** Playwright (manual trigger via button)
- **Run:** Localhost (bisa di XAMPP environment)

## File-Based Database Structure
```
data/
  keywords.json          → keyword configs
  results/
    ebook.json           → scraped ads for "ebook"
    template.json        → scraped ads for "template"
    panduan.json         → scraped ads for "panduan"
  snapshots/
    2026-04-22.json      → daily snapshot summary
```

## Features (MVP)

### 1. Keyword Management
- Add/edit/delete keywords
- Set max results per keyword
- Toggle active/paused

### 2. Manual Scraping
- Tombol "Scrape Now" per keyword
- Progress indicator (loading/percentage)
- Stop button kalau mau cancel

### 3. Winning Product Detection
- Scoring: duration + position + ad count
- Decision matrix badges
- Sort & filter options

### 4. Dashboard
- Keyword tabs
- Winning products list per keyword
- Product detail view
- Cross-keyword overview

## Scoring Algorithm
```
Duration (0-40 points):
  >= 30 days = 40
  >= 14 days = 30
  >= 7 days  = 15

Position (0-35 points):
  Top 20  = 35
  Top 50  = 25
  Top 100 = 15

Total Ads (0-25 points):
  >= 10 ads = 25
  >= 5 ads  = 20
  >= 3 ads  = 10

Max Score: 100
```

## Decision Matrix
```
Score 80-100 = 🔥 CONFIRMED WINNER
Score 65-79  = ✅ HIGH CONFIDENCE
Score 50-64  = 🟡 WORTH WATCHING
Score 35-49  = ⚡ RISING FAST
Score 0-34   = ⚪ TOO EARLY
```

## Non-Goals
- Automated daily scraping (manual only)
- Cloud deployment (local only)
- SQL database (JSON files only)
- Multi-user auth
- Mobile app
