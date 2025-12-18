/**
 * Test 4: Replicas Consistency Test
 * 
 * This test verifies:
 * - Data synchronization between Catalog Replica 1 and Replica 2
 * - On purchase, all Replicas are updated
 * - All replicas have the same data
 */

const http = require('http');

const CATALOG_REPLICA_1 = 'http://localhost:3001';
const CATALOG_REPLICA_2 = 'http://localhost:3011';
const CLIENT_URL = 'http://localhost:3000';
const TEST_BOOK_ID = 2;

function makeGetRequest(url, path) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
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

function makePostRequest(url, path) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
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

async function runTest() {
  console.log('============================================================');
  console.log('Test 4: Replicas Consistency');
  console.log('============================================================\n');
  
  // Step 1: Check initial state of both replicas
  console.log('Step 1: Checking initial state of both replicas...');
  console.log('------------------------------------------------------------');
  
  const initial1 = await makeGetRequest(CATALOG_REPLICA_1, `/info/${TEST_BOOK_ID}`);
  const initial2 = await makeGetRequest(CATALOG_REPLICA_2, `/info/${TEST_BOOK_ID}`);
  
  console.log('Catalog Replica 1:');
  console.log(`  Book: ${initial1.body.title}`);
  console.log(`  Quantity: ${initial1.body.quantity}`);
  console.log(`  Price: ${initial1.body.price}\n`);
  
  console.log('Catalog Replica 2:');
  console.log(`  Book: ${initial2.body.title}`);
  console.log(`  Quantity: ${initial2.body.quantity}`);
  console.log(`  Price: ${initial2.body.price}\n`);
  
  if (initial1.body.quantity === initial2.body.quantity) {
    console.log('[PASS] Both replicas are in sync BEFORE purchase\n');
  } else {
    console.log('[FAIL] Replicas are NOT in sync BEFORE purchase!\n');
  }
  
  const quantityBefore = initial1.body.quantity;
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Step 2: Purchase a book
  console.log('Step 2: Purchasing book (this should update ALL replicas)...');
  console.log('------------------------------------------------------------');
  
  const purchaseResult = await makePostRequest(CLIENT_URL, `/purchase/${TEST_BOOK_ID}`);
  
  if (purchaseResult.statusCode === 200) {
    console.log('[PASS] Purchase successful!');
    console.log(`       Order: ${purchaseResult.body.order?.title}`);
    console.log(`       Price: ${purchaseResult.body.order?.price}\n`);
  } else {
    console.log('[FAIL] Purchase failed!');
    console.log(`       Status: ${purchaseResult.statusCode}\n`);
  }
  
  // Wait for replicas to sync
  console.log('Waiting for replicas to sync...\n');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 3: Check state after purchase
  console.log('Step 3: Checking state AFTER purchase...');
  console.log('------------------------------------------------------------');
  
  const final1 = await makeGetRequest(CATALOG_REPLICA_1, `/info/${TEST_BOOK_ID}`);
  const final2 = await makeGetRequest(CATALOG_REPLICA_2, `/info/${TEST_BOOK_ID}`);
  
  console.log('Catalog Replica 1:');
  console.log(`  Quantity: ${final1.body.quantity}`);
  
  console.log('Catalog Replica 2:');
  console.log(`  Quantity: ${final2.body.quantity}\n`);
  
  // Results
  console.log('============================================================');
  console.log('RESULTS:');
  console.log('============================================================');
  console.log(`Quantity BEFORE purchase:`);
  console.log(`  Replica 1: ${quantityBefore}`);
  console.log(`  Replica 2: ${quantityBefore}`);
  console.log('');
  console.log(`Quantity AFTER purchase:`);
  console.log(`  Replica 1: ${final1.body.quantity}`);
  console.log(`  Replica 2: ${final2.body.quantity}`);
  console.log('');
  console.log(`Change:`);
  console.log(`  Replica 1: -${quantityBefore - final1.body.quantity}`);
  console.log(`  Replica 2: -${quantityBefore - final2.body.quantity}\n`);
  
  // Verification
  console.log('============================================================');
  console.log('VERIFICATION:');
  console.log('============================================================');
  
  let allPassed = true;
  
  // Check if both replicas have same quantity
  if (final1.body.quantity === final2.body.quantity) {
    console.log('[PASS] Test 1: Both replicas have SAME quantity');
  } else {
    console.log('[FAIL] Test 1: Replicas have DIFFERENT quantities');
    console.log(`       Replica 1: ${final1.body.quantity}`);
    console.log(`       Replica 2: ${final2.body.quantity}`);
    allPassed = false;
  }
  
  // Check if quantity decreased by 1
  if (quantityBefore - final1.body.quantity === 1) {
    console.log('[PASS] Test 2: Quantity decreased by 1');
  } else {
    console.log('[FAIL] Test 2: Quantity should decrease by 1');
    allPassed = false;
  }
  
  // Check if both replicas updated
  if (quantityBefore - final1.body.quantity === 1 && 
      quantityBefore - final2.body.quantity === 1) {
    console.log('[PASS] Test 3: BOTH replicas were updated');
  } else {
    console.log('[FAIL] Test 3: Not all replicas were updated');
    allPassed = false;
  }
  
  console.log('');
  if (allPassed) {
    console.log('SUCCESS: ALL TESTS PASSED! Replicas are in sync!');
  } else {
    console.log('FAILED: SOME TESTS FAILED! Replicas are NOT in sync!');
  }
  console.log('============================================================\n');
  
  // Explanation
  console.log('EXPLANATION:');
  console.log('============================================================');
  console.log('Replicas Consistency = Data synchronization across replicas');
  console.log('');
  console.log('Why we need consistency:');
  console.log('  - We have 2 copies of Catalog Service');
  console.log('  - On purchase, both copies must be updated');
  console.log('  - Otherwise data will be different between replicas');
  console.log('');
  console.log('How it works:');
  console.log('  1. User purchases a book');
  console.log('  2. Order service receives the request');
  console.log('  3. Order service sends update to ALL Catalog Replicas');
  console.log('  4. Each replica updates its data');
  console.log('  5. Result: All replicas have the same data');
  console.log('');
  console.log('Implementation:');
  console.log('  - Using Promise.all() to update all replicas');
  console.log('  - Order service has list of all Catalog replicas');
  console.log('  - Sends update request to each one');
  console.log('============================================================\n');
}

runTest().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
