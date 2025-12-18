/**
 * LAB 2 - Performance Evaluation Script
 * 
 * This script tests:
 * 1. Response Time (with vs without cache)
 * 2. Cache Hit/Miss Ratio
 * 3. Cache Invalidation Cost
 */

const http = require('http');

// Configuration
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const TEST_BOOK_ID = 1;
const TEST_TOPIC = 'distributed systems';
const NUM_REQUESTS = 100;

// Statistics
const stats = {
  withCache: [],
  withoutCache: [],
  invalidationTimes: [],
  cacheStats: null
};

/**
 * Make HTTP request and measure time
 */
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ statusCode: res.statusCode, body: parsed, responseTime });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: data, responseTime });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * Make POST request with body
 */
function makePostRequest(options, body) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ statusCode: res.statusCode, body: parsed, responseTime });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: data, responseTime });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  const url = new URL(CLIENT_URL);
  const options = {
    hostname: url.hostname,
    port: url.port || 80,
    path: '/cache/stats',
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  };
  const result = await makeRequest(options);
  return result.body;
}

/**
 * Invalidate cache for a specific key
 */
async function invalidateCache(key) {
  const url = new URL(CLIENT_URL);
  const body = JSON.stringify({ key });
  const options = {
    hostname: url.hostname,
    port: url.port || 80,
    path: '/invalidate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };
  const startTime = Date.now();
  await makePostRequest(options, body);
  return Date.now() - startTime;
}

/**
 * Test /info endpoint
 */
async function testInfo() {
  const url = new URL(CLIENT_URL);
  const options = {
    hostname: url.hostname,
    port: url.port || 80,
    path: `/info/${TEST_BOOK_ID}`,
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  };
  return await makeRequest(options);
}

/**
 * Test /search endpoint
 */
async function testSearch() {
  const url = new URL(CLIENT_URL);
  const options = {
    hostname: url.hostname,
    port: url.port || 80,
    path: `/search/${encodeURIComponent(TEST_TOPIC)}`,
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  };
  return await makeRequest(options);
}

/**
 * Calculate average
 */
function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate standard deviation
 */
function stdDev(arr) {
  const avg = average(arr);
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(average(squareDiffs));
}

/**
 * Main test function
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('LAB 2 - Performance Evaluation');
  console.log('='.repeat(60));
  console.log(`Client URL: ${CLIENT_URL}`);
  console.log(`Number of requests: ${NUM_REQUESTS}`);
  console.log('='.repeat(60));
  console.log();

  // ========== Test 1: Response Time WITHOUT Cache ==========
  console.log('[TEST 1] Response Time WITHOUT Cache');
  console.log('-'.repeat(60));
  
  // Clear cache first
  await invalidateCache(`info:${TEST_BOOK_ID}`);
  await invalidateCache(`search:${TEST_TOPIC}`);
  
  console.log('Testing /info endpoint (first request - cache miss)...');
  for (let i = 0; i < 5; i++) {
    await invalidateCache(`info:${TEST_BOOK_ID}`);
    const result = await testInfo();
    stats.withoutCache.push(result.responseTime);
    console.log(`  Request ${i + 1}: ${result.responseTime}ms`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log();

  // ========== Test 2: Response Time WITH Cache ==========
  console.log('[TEST 2] Response Time WITH Cache');
  console.log('-'.repeat(60));
  
  // Warm up cache
  await testInfo();
  
  console.log('Testing /info endpoint (cache hits)...');
  for (let i = 0; i < NUM_REQUESTS; i++) {
    const result = await testInfo();
    stats.withCache.push(result.responseTime);
    if (i < 5 || i >= NUM_REQUESTS - 5) {
      console.log(`  Request ${i + 1}: ${result.responseTime}ms (fromCache: ${result.body.fromCache})`);
    } else if (i === 5) {
      console.log('  ...');
    }
  }
  
  console.log();

  // ========== Test 3: Cache Invalidation Cost ==========
  console.log('[TEST 3] Cache Invalidation Cost');
  console.log('-'.repeat(60));
  
  for (let i = 0; i < 10; i++) {
    const time = await invalidateCache(`info:${TEST_BOOK_ID}`);
    stats.invalidationTimes.push(time);
    console.log(`  Invalidation ${i + 1}: ${time}ms`);
  }
  
  console.log();

  // ========== Test 4: Cache Statistics ==========
  console.log('[TEST 4] Cache Statistics');
  console.log('-'.repeat(60));
  
  stats.cacheStats = await getCacheStats();
  console.log('  Cache Hits:', stats.cacheStats.hits);
  console.log('  Cache Misses:', stats.cacheStats.misses);
  console.log('  Cache Hit Rate:', stats.cacheStats.hitRate);
  console.log('  Cache Invalidations:', stats.cacheStats.invalidations);
  console.log('  Cache Size:', stats.cacheStats.cacheSize);
  
  console.log();

  // ========== Summary ==========
  console.log('='.repeat(60));
  console.log('RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  const avgWithoutCache = average(stats.withoutCache);
  const avgWithCache = average(stats.withCache);
  const avgInvalidation = average(stats.invalidationTimes);
  
  const stdWithoutCache = stdDev(stats.withoutCache);
  const stdWithCache = stdDev(stats.withCache);
  
  const speedup = avgWithoutCache / avgWithCache;
  const improvement = ((avgWithoutCache - avgWithCache) / avgWithoutCache * 100).toFixed(2);
  
  console.log();
  console.log('Response Time WITHOUT Cache:');
  console.log(`  Average: ${avgWithoutCache.toFixed(2)}ms`);
  console.log(`  Std Dev: ${stdWithoutCache.toFixed(2)}ms`);
  console.log(`  Min: ${Math.min(...stats.withoutCache)}ms`);
  console.log(`  Max: ${Math.max(...stats.withoutCache)}ms`);
  
  console.log();
  console.log('Response Time WITH Cache:');
  console.log(`  Average: ${avgWithCache.toFixed(2)}ms`);
  console.log(`  Std Dev: ${stdWithCache.toFixed(2)}ms`);
  console.log(`  Min: ${Math.min(...stats.withCache)}ms`);
  console.log(`  Max: ${Math.max(...stats.withCache)}ms`);
  
  console.log();
  console.log('Cache Performance:');
  console.log(`  Speedup: ${speedup.toFixed(2)}x`);
  console.log(`  Improvement: ${improvement}%`);
  console.log(`  Cache Hit Rate: ${stats.cacheStats.hitRate}`);
  
  console.log();
  console.log('Cache Invalidation:');
  console.log(`  Average Time: ${avgInvalidation.toFixed(2)}ms`);
  console.log(`  Min: ${Math.min(...stats.invalidationTimes)}ms`);
  console.log(`  Max: ${Math.max(...stats.invalidationTimes)}ms`);
  
  console.log();
  console.log('='.repeat(60));
  console.log('[SUCCESS] Performance evaluation completed!');
  console.log('='.repeat(60));
}

// Run tests
runTests().catch(err => {
  console.error('[ERROR] Error running tests:', err.message);
  process.exit(1);
});
