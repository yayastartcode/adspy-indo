<?php
// API Router - AdSpy Indo
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataDir = __DIR__ . '/../data';
$resultsDir = $dataDir . '/results';
$snapshotsDir = $dataDir . '/snapshots';
$keywordsFile = $dataDir . '/keywords.json';

// Ensure directories exist
if (!is_dir($resultsDir)) mkdir($resultsDir, 0777, true);
if (!is_dir($snapshotsDir)) mkdir($snapshotsDir, 0777, true);

// Helper functions
function readJSON($file) {
    if (!file_exists($file)) return null;
    $content = file_get_contents($file);
    return json_decode($content, true);
}

function writeJSON($file, $data) {
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function getKeywords() {
    global $keywordsFile;
    return readJSON($keywordsFile) ?: [];
}

function saveKeywords($keywords) {
    global $keywordsFile;
    writeJSON($keywordsFile, $keywords);
}

// Scoring functions
function calculateWinningScore($duration, $position, $totalAds) {
    $score = 0;
    
    // Duration (0-40)
    if ($duration >= 30) $score += 40;
    elseif ($duration >= 14) $score += 30;
    elseif ($duration >= 7) $score += 15;
    
    // Position (0-35)
    if ($position <= 20) $score += 35;
    elseif ($position <= 50) $score += 25;
    elseif ($position <= 100) $score += 15;
    
    // Total Ads (0-25)
    if ($totalAds >= 10) $score += 25;
    elseif ($totalAds >= 5) $score += 20;
    elseif ($totalAds >= 3) $score += 10;
    
    return min($score, 100);
}

function getDecisionLabel($score) {
    if ($score >= 80) return ['label' => 'CONFIRMED WINNER', 'emoji' => '🔥', 'color' => 'red'];
    if ($score >= 65) return ['label' => 'HIGH CONFIDENCE', 'emoji' => '✅', 'color' => 'green'];
    if ($score >= 50) return ['label' => 'WORTH WATCHING', 'emoji' => '🟡', 'color' => 'yellow'];
    if ($score >= 35) return ['label' => 'RISING FAST', 'emoji' => '⚡', 'color' => 'orange'];
    return ['label' => 'TOO EARLY', 'emoji' => '⚪', 'color' => 'gray'];
}

function daysBetween($dateStr) {
    if (!$dateStr) return 0;
    try {
        $date = new DateTime($dateStr);
        $now = new DateTime();
        return $now->diff($date)->days;
    } catch (Exception $e) {
        return 0;
    }
}

function analyzeResults($keywordId) {
    global $resultsDir;
    $file = $resultsDir . '/' . $keywordId . '.json';
    $data = readJSON($file);
    
    if (!$data || !isset($data['ads']) || count($data['ads']) === 0) {
        return [
            'keyword' => $keywordId,
            'totalAds' => 0,
            'totalAdvertisers' => 0,
            'products' => [],
            'scrapedAt' => null,
            'summary' => ['confirmedWinners' => 0, 'highConfidence' => 0, 'worthWatching' => 0, 'risingFast' => 0, 'tooEarly' => 0],
        ];
    }
    
    $ads = $data['ads'];
    $byAdvertiser = [];
    
    foreach ($ads as $ad) {
        $name = $ad['advertiserName'] ?? 'Unknown';
        if (!isset($byAdvertiser[$name])) {
            $byAdvertiser[$name] = [
                'advertiserName' => $name,
                'ads' => [],
                'totalAds' => 0,
                'bestPosition' => 9999,
                'longestDuration' => 0,
                'prices' => [],
                'niches' => [],
                'productTypes' => [],
            ];
        }
        
        $group = &$byAdvertiser[$name];
        $group['ads'][] = $ad;
        $group['totalAds'] = max($group['totalAds'], $ad['totalAdsIndicator'] ?? 1);
        if ($group['totalAds'] < count($group['ads'])) $group['totalAds'] = count($group['ads']);
        $group['bestPosition'] = min($group['bestPosition'], $ad['searchPosition'] ?? 9999);
        
        $duration = daysBetween($ad['startDate'] ?? null);
        $group['longestDuration'] = max($group['longestDuration'], $duration);
        
        if (!empty($ad['extractedPrice'])) $group['prices'][] = $ad['extractedPrice'];
        if (!empty($ad['niche'])) $group['niches'][] = $ad['niche'];
        if (!empty($ad['productType'])) $group['productTypes'][] = $ad['productType'];
    }
    
    $products = [];
    foreach ($byAdvertiser as $group) {
        $score = calculateWinningScore($group['longestDuration'], $group['bestPosition'], $group['totalAds']);
        $decision = getDecisionLabel($score);
        
        // Most common values
        $commonPrice = !empty($group['prices']) ? array_count_values($group['prices']) : [];
        arsort($commonPrice);
        $topPrice = !empty($commonPrice) ? array_key_first($commonPrice) : null;
        
        $commonNiche = !empty($group['niches']) ? array_count_values($group['niches']) : [];
        arsort($commonNiche);
        $topNiche = !empty($commonNiche) ? array_key_first($commonNiche) : 'other';
        
        $commonType = !empty($group['productTypes']) ? array_count_values($group['productTypes']) : [];
        arsort($commonType);
        $topType = !empty($commonType) ? array_key_first($commonType) : 'other';
        
        $sampleAds = array_slice($group['ads'], 0, 5);
        $sampleAds = array_map(function($ad) {
            return [
                'id' => $ad['id'] ?? '',
                'adText' => substr($ad['adText'] ?? '', 0, 500),
                'imageUrl' => $ad['imageUrl'] ?? null,
                'startDate' => $ad['startDate'] ?? null,
                'searchPosition' => $ad['searchPosition'] ?? null,
                'extractedPrice' => $ad['extractedPrice'] ?? null,
            ];
        }, $sampleAds);
        
        $products[] = [
            'advertiserName' => $group['advertiserName'],
            'score' => $score,
            'decision' => $decision,
            'totalAds' => $group['totalAds'],
            'bestPosition' => $group['bestPosition'],
            'longestDuration' => $group['longestDuration'],
            'commonPrice' => $topPrice ? (int)$topPrice : null,
            'allPrices' => array_values(array_unique($group['prices'])),
            'niche' => $topNiche,
            'productType' => $topType,
            'sampleAds' => $sampleAds,
            'scoreBreakdown' => [
                'duration' => $group['longestDuration'] >= 30 ? 40 : ($group['longestDuration'] >= 14 ? 30 : ($group['longestDuration'] >= 7 ? 15 : 0)),
                'position' => $group['bestPosition'] <= 20 ? 35 : ($group['bestPosition'] <= 50 ? 25 : ($group['bestPosition'] <= 100 ? 15 : 0)),
                'adCount' => $group['totalAds'] >= 10 ? 25 : ($group['totalAds'] >= 5 ? 20 : ($group['totalAds'] >= 3 ? 10 : 0)),
            ],
        ];
    }
    
    // Sort by score
    usort($products, function($a, $b) { return $b['score'] - $a['score']; });
    
    $summary = [
        'confirmedWinners' => count(array_filter($products, fn($p) => $p['score'] >= 80)),
        'highConfidence' => count(array_filter($products, fn($p) => $p['score'] >= 65 && $p['score'] < 80)),
        'worthWatching' => count(array_filter($products, fn($p) => $p['score'] >= 50 && $p['score'] < 65)),
        'risingFast' => count(array_filter($products, fn($p) => $p['score'] >= 35 && $p['score'] < 50)),
        'tooEarly' => count(array_filter($products, fn($p) => $p['score'] < 35)),
    ];
    
    return [
        'keyword' => $keywordId,
        'totalAds' => count($ads),
        'totalAdvertisers' => count($products),
        'scrapedAt' => $data['scrapedAt'] ?? null,
        'products' => $products,
        'summary' => $summary,
    ];
}

// Router
$uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Remove query string and base path
$path = parse_url($uri, PHP_URL_PATH);
$path = preg_replace('#^.*/api/#', '', $path);
$path = rtrim($path, '/');

// Route: GET keywords
if ($method === 'GET' && $path === 'keywords') {
    echo json_encode(getKeywords());
    exit;
}

// Route: POST keywords
if ($method === 'POST' && $path === 'keywords') {
    $input = json_decode(file_get_contents('php://input'), true);
    $keyword = $input['keyword'] ?? '';
    $maxResults = $input['maxResults'] ?? 2000;
    
    if (empty($keyword)) {
        http_response_code(400);
        echo json_encode(['error' => 'Keyword is required']);
        exit;
    }
    
    $id = strtolower(preg_replace('/\s+/', '-', $keyword));
    $keywords = getKeywords();
    
    foreach ($keywords as $kw) {
        if ($kw['id'] === $id) {
            http_response_code(409);
            echo json_encode(['error' => 'Keyword already exists']);
            exit;
        }
    }
    
    $newKeyword = [
        'id' => $id,
        'keyword' => $keyword,
        'maxResults' => (int)$maxResults,
        'isActive' => true,
        'lastScrapedAt' => null,
    ];
    $keywords[] = $newKeyword;
    saveKeywords($keywords);
    
    http_response_code(201);
    echo json_encode($newKeyword);
    exit;
}

// Route: PUT keywords/:id
if ($method === 'PUT' && preg_match('#^keywords/(.+)$#', $path, $m)) {
    $id = $m[1];
    $input = json_decode(file_get_contents('php://input'), true);
    $keywords = getKeywords();
    
    $found = false;
    foreach ($keywords as &$kw) {
        if ($kw['id'] === $id) {
            $kw = array_merge($kw, $input);
            $found = true;
            break;
        }
    }
    
    if (!$found) {
        http_response_code(404);
        echo json_encode(['error' => 'Keyword not found']);
        exit;
    }
    
    saveKeywords($keywords);
    echo json_encode($kw);
    exit;
}

// Route: DELETE keywords/:id
if ($method === 'DELETE' && preg_match('#^keywords/(.+)$#', $path, $m)) {
    $id = $m[1];
    $keywords = getKeywords();
    $filtered = array_values(array_filter($keywords, fn($kw) => $kw['id'] !== $id));
    
    if (count($filtered) === count($keywords)) {
        http_response_code(404);
        echo json_encode(['error' => 'Keyword not found']);
        exit;
    }
    
    saveKeywords($filtered);
    
    // Delete results file
    global $resultsDir;
    $resultsFile = $resultsDir . '/' . $id . '.json';
    if (file_exists($resultsFile)) unlink($resultsFile);
    
    echo json_encode(['success' => true]);
    exit;
}

// Route: GET results/:keyword
if ($method === 'GET' && preg_match('#^results/([^/]+)$#', $path, $m)) {
    $keywordId = $m[1];
    $sort = $_GET['sort'] ?? 'score';
    $order = $_GET['order'] ?? 'desc';
    $minScore = $_GET['minScore'] ?? null;
    
    $results = analyzeResults($keywordId);
    
    // Filter
    if ($minScore !== null) {
        $results['products'] = array_values(array_filter($results['products'], fn($p) => $p['score'] >= (int)$minScore));
    }
    
    // Sort
    $sortKey = [
        'score' => 'score',
        'duration' => 'longestDuration',
        'position' => 'bestPosition',
        'ads' => 'totalAds',
        'price' => 'commonPrice',
    ][$sort] ?? 'score';
    
    usort($results['products'], function($a, $b) use ($sortKey, $order) {
        $aVal = $a[$sortKey] ?? 0;
        $bVal = $b[$sortKey] ?? 0;
        if ($sortKey === 'bestPosition') {
            return $order === 'desc' ? $aVal - $bVal : $bVal - $aVal;
        }
        return $order === 'desc' ? $bVal - $aVal : $aVal - $bVal;
    });
    
    echo json_encode($results);
    exit;
}

// Route: GET results/:keyword/detail/:advertiser
if ($method === 'GET' && preg_match('#^results/([^/]+)/detail/(.+)$#', $path, $m)) {
    $keywordId = $m[1];
    $advertiserName = urldecode($m[2]);
    
    $file = $resultsDir . '/' . $keywordId . '.json';
    $data = readJSON($file);
    
    if (!$data || !isset($data['ads'])) {
        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
        exit;
    }
    
    $ads = array_filter($data['ads'], fn($a) => ($a['advertiserName'] ?? '') === $advertiserName);
    $ads = array_values($ads);
    
    if (empty($ads)) {
        http_response_code(404);
        echo json_encode(['error' => 'Advertiser not found']);
        exit;
    }
    
    $totalAds = max(count($ads), max(array_map(fn($a) => $a['totalAdsIndicator'] ?? 1, $ads)));
    $bestPosition = min(array_map(fn($a) => $a['searchPosition'] ?? 9999, $ads));
    $longestDuration = max(array_map(fn($a) => daysBetween($a['startDate'] ?? null), $ads));
    $prices = array_values(array_unique(array_filter(array_map(fn($a) => $a['extractedPrice'] ?? null, $ads))));
    $niches = array_values(array_unique(array_filter(array_map(fn($a) => $a['niche'] ?? null, $ads))));
    $productTypes = array_values(array_unique(array_filter(array_map(fn($a) => $a['productType'] ?? null, $ads))));
    
    $score = calculateWinningScore($longestDuration, $bestPosition, $totalAds);
    $decision = getDecisionLabel($score);
    
    echo json_encode([
        'advertiserName' => $advertiserName,
        'score' => $score,
        'decision' => $decision,
        'totalAds' => $totalAds,
        'bestPosition' => $bestPosition,
        'longestDuration' => $longestDuration,
        'prices' => $prices,
        'niches' => $niches,
        'productTypes' => $productTypes,
        'scoreBreakdown' => [
            'duration' => $longestDuration >= 30 ? 40 : ($longestDuration >= 14 ? 30 : ($longestDuration >= 7 ? 15 : 0)),
            'position' => $bestPosition <= 20 ? 35 : ($bestPosition <= 50 ? 25 : ($bestPosition <= 100 ? 15 : 0)),
            'adCount' => $totalAds >= 10 ? 25 : ($totalAds >= 5 ? 20 : ($totalAds >= 3 ? 10 : 0)),
        ],
        'winningAngles' => [],
        'ads' => array_map(function($ad) {
            return [
                'id' => $ad['id'] ?? '',
                'adText' => substr($ad['adText'] ?? '', 0, 500),
                'imageUrl' => $ad['imageUrl'] ?? null,
                'startDate' => $ad['startDate'] ?? null,
                'searchPosition' => $ad['searchPosition'] ?? null,
                'extractedPrice' => $ad['extractedPrice'] ?? null,
                'platforms' => $ad['platforms'] ?? ['Facebook'],
                'totalAdsIndicator' => $ad['totalAdsIndicator'] ?? 1,
            ];
        }, $ads),
    ]);
    exit;
}

// Route: GET overview
if ($method === 'GET' && $path === 'overview') {
    $keywords = getKeywords();
    $keywordResults = [];
    $allProducts = [];
    
    foreach ($keywords as $kw) {
        $analysis = analyzeResults($kw['id']);
        $keywordResults[] = [
            'keyword' => $kw['keyword'],
            'keywordId' => $kw['id'],
            'totalAds' => $analysis['totalAds'],
            'totalAdvertisers' => $analysis['totalAdvertisers'],
            'scrapedAt' => $analysis['scrapedAt'],
            'summary' => $analysis['summary'],
        ];
        
        foreach ($analysis['products'] as $p) {
            $p['keyword'] = $kw['keyword'];
            $p['keywordId'] = $kw['id'];
            $allProducts[] = $p;
        }
    }
    
    usort($allProducts, fn($a, $b) => $b['score'] - $a['score']);
    
    echo json_encode([
        'keywords' => $keywordResults,
        'hottestProducts' => array_slice($allProducts, 0, 10),
        'crossKeywordProducts' => [],
        'totalAdsScraped' => array_sum(array_column($keywordResults, 'totalAds')),
        'totalAdvertisers' => array_sum(array_column($keywordResults, 'totalAdvertisers')),
    ]);
    exit;
}

// 404
http_response_code(404);
echo json_encode(['error' => 'Not found', 'path' => $path]);
