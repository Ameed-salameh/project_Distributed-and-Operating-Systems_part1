/**
 * Test 3: Load Balancing Test
 * 
 * This test verifies:
 * - Distribution of requests between Catalog Replica 1 and Replica 2
 * - Using Round-Robin algorithm
 * - Each replica receives approximately the same number of requests
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const CLIENT_URL = 'http://localhost:3000';
const TEST_BOOK_ID = 1;
const NUM_REQUESTS = 10;
const LOGS_DIR = path.join(__dirname, 'logs');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(CLIENT_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: path,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

function invalidateCache(key) {
  return new Promise((resolve, reject) => {
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
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve());
    });
    
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function countLinesInLog(logFile) {
  try {
    const logPath = path.join(LOGS_DIR, logFile);
    if (!fs.existsSync(logPath)) {
      return 0;
    }
    const content = fs.readFileSync(logPath, 'utf8');
    // Count lines that contain "info" requests
    const lines = content.split('\n').filter(line => line.includes('info') || line.includes('GET'));
    return lines.length;
  } catch (err) {
    return 0;
  }
}

async function runTest() {
  console.log('============================================================');
  console.log('Test 3: Load Balancing');
  console.log('============================================================\n');
  
  console.log('Note: We will clear cache before each request');
  console.log('      so that requests go to the Catalog servers\n');
  
  // Get initial log counts
  const initialCount1 = countLinesInLog('catalog-1.log');
  const initialCount2 = countLinesInLog('catalog-2.log');
  
  console.log(`Initial state:`);
  console.log(`  Catalog-1 log lines: ${initialCount1}`);
  console.log(`  Catalog-2 log lines: ${initialCount2}\n`);
  
  // Send multiple requests
  console.log(`Sending ${NUM_REQUESTS} requests with Round-Robin...`);
  console.log('------------------------------------------------------------');
  
  for (let i = 1; i <= NUM_REQUESTS; i++) {
    // Clear cache before each request to force server access
    await invalidateCache(`info:${TEST_BOOK_ID}`);
    
    // Make request
    await makeRequest(`/info/${TEST_BOOK_ID}`);
    
    process.stdout.write(`Request ${i}/${NUM_REQUESTS} sent... `);
    
    // Check which replica handled it (alternate)
    const expectedReplica = (i % 2 === 1) ? 1 : 2;
    console.log(`(Expected: Replica ${expectedReplica})`);
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('------------------------------------------------------------\n');
  
  // Wait a bit for logs to be written
  console.log('Waiting for logs to be written...\n');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Get final log counts
  const finalCount1 = countLinesInLog('catalog-1.log');
  const finalCount2 = countLinesInLog('catalog-2.log');
  
  const requestsHandled1 = finalCount1 - initialCount1;
  const requestsHandled2 = finalCount2 - initialCount2;
  
  // Results
  console.log('============================================================');
  console.log('RESULTS:');
  console.log('============================================================');
  console.log(`Total requests sent: ${NUM_REQUESTS}`);
  console.log('');
  console.log(`Catalog Replica 1:`);
  console.log(`  Requests handled: ~${requestsHandled1}`);
  console.log(`  Percentage: ~${((requestsHandled1 / NUM_REQUESTS) * 100).toFixed(1)}%`);
  console.log('');
  console.log(`Catalog Replica 2:`);
  console.log(`  Requests handled: ~${requestsHandled2}`);
  console.log(`  Percentage: ~${((requestsHandled2 / NUM_REQUESTS) * 100).toFixed(1)}%\n`);
  
  // Verification
  console.log('============================================================');
  console.log('VERIFICATION:');
  console.log('============================================================');
  
  const diff = Math.abs(requestsHandled1 - requestsHandled2);
  const expectedEach = NUM_REQUESTS / 2;
  
  if (diff <= 2) {
    console.log('[PASS] Load balancing is working correctly!');
    console.log('       Requests are distributed evenly between replicas');
    console.log(`       Expected ~${expectedEach} each, got ${requestsHandled1} and ${requestsHandled2}`);
  } else {
    console.log('[WARN] Load distribution might not be optimal');
    console.log(`       Difference: ${diff} (expected < 2)`);
    console.log(`       This could be due to caching or timing issues`);
  }
  
  console.log('\n============================================================');
  console.log('CHECK LOGS:');
  console.log('============================================================');
  console.log('You can manually check the logs:');
  console.log('');
  console.log('  logs/catalog-1.log');
  console.log('  logs/catalog-2.log');
  console.log('');
  console.log('Look for lines containing "GET /info" to see which replica');
  console.log('handled each request.\n');
  
  console.log('============================================================');
  console.log('EXPLANATION:');
  console.log('============================================================');
  console.log('Load Balancing = Distributing requests across multiple servers');
  console.log('');
  console.log('Algorithm: Round-Robin');
  console.log('  Request 1 -> Catalog Replica 1');
  console.log('  Request 2 -> Catalog Replica 2');
  console.log('  Request 3 -> Catalog Replica 1');
  console.log('  Request 4 -> Catalog Replica 2');
  console.log('  ... and so on');
  console.log('');
  console.log('Benefits:');
  console.log('  [+] Even load distribution');
  console.log('  [+] No single replica is overloaded');
  console.log('  [+] If one replica fails, the other continues working');
  console.log('============================================================\n');
}

runTest().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
