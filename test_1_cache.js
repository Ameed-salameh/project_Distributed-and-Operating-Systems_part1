/**
 * Test 1: Cache Performance Test
 * 
 * هذا الاختبار يقيس:
 * - السرعة بدون Cache (أول طلب)
 * - السرعة مع Cache (ثاني طلب)
 * - الفرق في السرعة (Speedup)
 */

const http = require('http');

const CLIENT_URL = 'http://localhost:3000';
const TEST_BOOK_ID = 1;

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
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
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        try {
          const parsed = JSON.parse(data);
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

async function runTest() {
  console.log('============================================================');
  console.log('Test 1: Cache Performance');
  console.log('============================================================\n');
  
  // Step 1: Clear cache
  console.log('Step 1: Clearing cache...');
  await invalidateCache(`info:${TEST_BOOK_ID}`);
  console.log('   Cache cleared\n');
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Step 2: First request (WITHOUT cache)
  console.log('Step 2: First request (Cache Miss - goes to server)');
  const result1 = await makeRequest(`/info/${TEST_BOOK_ID}`);
  console.log(`   Response Time: ${result1.responseTime}ms`);
  console.log(`   fromCache: ${result1.body.fromCache}`);
  console.log(`   Book: ${result1.body.title}`);
  console.log(`   Quantity: ${result1.body.quantity}\n`);
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Step 3: Second request (WITH cache)
  console.log('Step 3: Second request (Cache Hit - from memory)');
  const result2 = await makeRequest(`/info/${TEST_BOOK_ID}`);
  console.log(`   Response Time: ${result2.responseTime}ms`);
  console.log(`   fromCache: ${result2.body.fromCache}`);
  console.log(`   Book: ${result2.body.title}`);
  console.log(`   Quantity: ${result2.body.quantity}\n`);
  
  // Step 4: Calculate speedup
  console.log('============================================================');
  console.log('RESULTS:');
  console.log('============================================================');
  console.log(`Without Cache: ${result1.responseTime}ms`);
  console.log(`With Cache:    ${result2.responseTime}ms`);
  
  if (result2.responseTime > 0) {
    const speedup = (result1.responseTime / result2.responseTime).toFixed(2);
    const improvement = (((result1.responseTime - result2.responseTime) / result1.responseTime) * 100).toFixed(2);
    console.log(`Speedup:       ${speedup}x faster!`);
    console.log(`Improvement:   ${improvement}%`);
  }
  
  console.log('\nTest completed!');
  console.log('============================================================\n');
  
  // Verify
  if (result1.body.fromCache === false && result2.body.fromCache === true) {
    console.log('[PASS] Cache is working correctly!');
  } else {
    console.log('[FAIL] Cache is NOT working correctly!');
  }
}

runTest().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
