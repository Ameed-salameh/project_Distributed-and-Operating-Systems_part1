/**
 * Test 2: Cache Invalidation Test
 * 
 * This test verifies:
 * - Automatic cache deletion after purchase
 * - Data updates (quantity decreases)
 * - Next request fetches fresh data (not from cache)
 */

const http = require('http');

const CLIENT_URL = 'http://localhost:3000';
const TEST_BOOK_ID = 1;

function makeGetRequest(path) {
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

function makePostRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(CLIENT_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: path,
      method: 'POST',
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

async function runTest() {
  console.log('============================================================');
  console.log('Test 2: Cache Invalidation');
  console.log('============================================================\n');
  
  // Step 1: Clear cache first
  console.log('Step 1: Preparing test (clearing cache)...');
  await invalidateCache(`info:${TEST_BOOK_ID}`);
  console.log('   Ready\n');
  
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Step 2: First request (saves to cache)
  console.log('Step 2: First request - Get book info');
  const result1 = await makeGetRequest(`/info/${TEST_BOOK_ID}`);
  console.log(`   fromCache: ${result1.body.fromCache} (NOT from cache - first time)`);
  console.log(`   Book: ${result1.body.title}`);
  console.log(`   Quantity BEFORE purchase: ${result1.body.quantity}\n`);
  
  const quantityBefore = result1.body.quantity;
  
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Step 3: Second request (from cache)
  console.log('Step 3: Second request - Same book (should be from cache)');
  const result2 = await makeGetRequest(`/info/${TEST_BOOK_ID}`);
  console.log(`   fromCache: ${result2.body.fromCache} (from cache - fast!)`);
  console.log(`   Quantity: ${result2.body.quantity} (same as before)\n`);
  
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Step 4: Purchase book (this will INVALIDATE cache automatically!)
  console.log('Step 4: Purchase book (this triggers CACHE INVALIDATION!)');
  console.log('   Sending purchase request...');
  const purchaseResult = await makePostRequest(`/purchase/${TEST_BOOK_ID}`);
  console.log(`   Purchase successful!`);
  console.log(`   Order ID: ${purchaseResult.body.order?.id}`);
  console.log(`   Note: Cache was automatically invalidated by the server!\n`);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Step 5: Third request (cache was invalidated - should be fresh data)
  console.log('Step 5: Third request - Check if cache was invalidated');
  const result3 = await makeGetRequest(`/info/${TEST_BOOK_ID}`);
  console.log(`   fromCache: ${result3.body.fromCache} (NOT from cache - was invalidated!)`);
  console.log(`   Quantity AFTER purchase: ${result3.body.quantity}\n`);
  
  const quantityAfter = result3.body.quantity;
  
  // Results
  console.log('============================================================');
  console.log('RESULTS:');
  console.log('============================================================');
  console.log(`Request 1: fromCache = ${result1.body.fromCache} (first time, saves to cache)`);
  console.log(`Request 2: fromCache = ${result2.body.fromCache} (from cache, fast!)`);
  console.log(`Purchase:  Cache INVALIDATED automatically`);
  console.log(`Request 3: fromCache = ${result3.body.fromCache} (cache was cleared, fresh data!)`);
  console.log('');
  console.log(`Quantity before: ${quantityBefore}`);
  console.log(`Quantity after:  ${quantityAfter}`);
  console.log(`Difference:      ${quantityBefore - quantityAfter} (should be 1)\n`);
  
  // Verify
  console.log('============================================================');
  console.log('VERIFICATION:');
  console.log('============================================================');
  
  let allPassed = true;
  
  if (result1.body.fromCache === false) {
    console.log('[PASS] Test 1: First request NOT from cache');
  } else {
    console.log('[FAIL] Test 1: First request should NOT be from cache');
    allPassed = false;
  }
  
  if (result2.body.fromCache === true) {
    console.log('[PASS] Test 2: Second request FROM cache');
  } else {
    console.log('[FAIL] Test 2: Second request should be FROM cache');
    allPassed = false;
  }
  
  if (result3.body.fromCache === false) {
    console.log('[PASS] Test 3: Third request NOT from cache (invalidation worked!)');
  } else {
    console.log('[FAIL] Test 3: Third request should NOT be from cache (invalidation failed!)');
    allPassed = false;
  }
  
  if (quantityBefore - quantityAfter === 1) {
    console.log('[PASS] Test 4: Quantity decreased by 1');
  } else {
    console.log('[FAIL] Test 4: Quantity should decrease by 1');
    allPassed = false;
  }
  
  console.log('');
  if (allPassed) {
    console.log('SUCCESS: ALL TESTS PASSED! Cache Invalidation is working correctly!');
  } else {
    console.log('FAILED: SOME TESTS FAILED! Check the implementation.');
  }
  console.log('============================================================\n');
  
  // Explanation
  console.log('EXPLANATION:');
  console.log('------------------------------------------------------------');
  console.log('Cache Invalidation = Deleting stale data from cache');
  console.log('');
  console.log('Why invalidate?');
  console.log('  - After purchase, quantity changes in database');
  console.log('  - Cache contains old data (old quantity)');
  console.log('  - Need to delete cache so next request gets fresh data');
  console.log('');
  console.log('How it works:');
  console.log('  1. Order service processes purchase');
  console.log('  2. Order service updates all Catalog replicas');
  console.log('  3. Catalog service sends invalidation to Front-End');
  console.log('  4. Front-End deletes the cache entry');
  console.log('  5. Next request fetches fresh data from server');
  console.log('============================================================\n');
}

runTest().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
