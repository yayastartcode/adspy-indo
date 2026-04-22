// File-based database helper
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const RESULTS_DIR = path.join(DATA_DIR, 'results');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');
const KEYWORDS_FILE = path.join(DATA_DIR, 'keywords.json');

// Ensure directories exist
function ensureDirs() {
  [DATA_DIR, RESULTS_DIR, SNAPSHOTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  if (!fs.existsSync(KEYWORDS_FILE)) {
    fs.writeFileSync(KEYWORDS_FILE, '[]', 'utf8');
  }
}

// Read JSON file
function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return null;
  }
}

// Write JSON file
function writeJSON(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Keywords CRUD
function getKeywords() {
  return readJSON(KEYWORDS_FILE) || [];
}

function saveKeywords(keywords) {
  writeJSON(KEYWORDS_FILE, keywords);
}

function getKeywordById(id) {
  const keywords = getKeywords();
  return keywords.find(k => k.id === id);
}

function addKeyword(keyword) {
  const keywords = getKeywords();
  keywords.push(keyword);
  saveKeywords(keywords);
  return keyword;
}

function updateKeyword(id, updates) {
  const keywords = getKeywords();
  const index = keywords.findIndex(k => k.id === id);
  if (index === -1) return null;
  keywords[index] = { ...keywords[index], ...updates };
  saveKeywords(keywords);
  return keywords[index];
}

function deleteKeyword(id) {
  const keywords = getKeywords();
  const filtered = keywords.filter(k => k.id !== id);
  if (filtered.length === keywords.length) return false;
  saveKeywords(filtered);
  // Also delete results file
  const resultsFile = path.join(RESULTS_DIR, `${id}.json`);
  if (fs.existsSync(resultsFile)) fs.unlinkSync(resultsFile);
  return true;
}

// Results CRUD
function getResults(keywordId) {
  const filePath = path.join(RESULTS_DIR, `${keywordId}.json`);
  return readJSON(filePath) || { keyword: keywordId, ads: [], scrapedAt: null };
}

function saveResults(keywordId, data) {
  const filePath = path.join(RESULTS_DIR, `${keywordId}.json`);
  writeJSON(filePath, data);
}

// Snapshots
function saveSnapshot(date, data) {
  const filePath = path.join(SNAPSHOTS_DIR, `${date}.json`);
  writeJSON(filePath, data);
}

function getSnapshot(date) {
  const filePath = path.join(SNAPSHOTS_DIR, `${date}.json`);
  return readJSON(filePath);
}

function listSnapshots() {
  if (!fs.existsSync(SNAPSHOTS_DIR)) return [];
  return fs.readdirSync(SNAPSHOTS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .sort()
    .reverse();
}

module.exports = {
  ensureDirs,
  readJSON,
  writeJSON,
  getKeywords,
  saveKeywords,
  getKeywordById,
  addKeyword,
  updateKeyword,
  deleteKeyword,
  getResults,
  saveResults,
  saveSnapshot,
  getSnapshot,
  listSnapshots,
  DATA_DIR,
  RESULTS_DIR,
  SNAPSHOTS_DIR,
};
