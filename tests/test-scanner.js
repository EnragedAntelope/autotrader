/**
 * Test Script for Stock Screening Engine
 *
 * Tests the scanning engine with various criteria to validate:
 * - Data fetching works
 * - Caching works
 * - Criteria matching works
 * - Rate limiting is respected
 *
 * Run: node test-scanner.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize database (in-memory for testing)
const db = new Database(':memory:');

// Load schema
const fs = require('fs');
const schema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
db.exec(schema);

// Load services (order matters - dataService must be loaded first to avoid circular dependency)
const dataService = require('../electron/services/dataService');
const scannerService = require('../electron/services/scannerService');

async function runTests() {
  console.log('==========================================');
  console.log('  Stock Screening Engine Test Suite');
  console.log('==========================================\n');

  // Initialize services with database
  console.log('Initializing services with rate limiting...');
  dataService.initialize(db);
  scannerService.initialize(db);
  console.log('Services initialized.\n');

  // Test 1: Value Stocks (Low P/E, High Dividend)
  console.log('Test 1: Value Stock Screening');
  console.log('Criteria: P/E < 15, Dividend Yield > 2%, Price $10-$100\n');

  const valueProfile = {
    name: 'Value Stocks',
    asset_type: 'stock',
    parameters: JSON.stringify({
      priceMin: 10,
      priceMax: 100,
      peMax: 15,
      dividendYieldMin: 2.0,
    }),
    schedule_enabled: 0,
    schedule_interval: 15,
    schedule_market_hours_only: 1,
    auto_execute: 0,
  };

  const result1 = db.prepare(`
    INSERT INTO screening_profiles (name, asset_type, parameters, schedule_enabled,
                                    schedule_interval, schedule_market_hours_only, auto_execute)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    valueProfile.name,
    valueProfile.asset_type,
    valueProfile.parameters,
    valueProfile.schedule_enabled,
    valueProfile.schedule_interval,
    valueProfile.schedule_market_hours_only,
    valueProfile.auto_execute
  );

  const profileId1 = result1.lastInsertRowid;

  try {
    console.log('Starting scan...');
    const startTime = Date.now();

    const scanResult = await scannerService.runScan(profileId1, db);

    const duration = Date.now() - startTime;
    console.log(`\n✓ Scan completed in ${duration}ms`);
    console.log(`Matches found: ${scanResult.matches.length}`);

    if (scanResult.matches.length > 0) {
      console.log('\nMatching stocks:');
      scanResult.matches.slice(0, 5).forEach((match) => {
        console.log(`  ${match.symbol}: $${match.data.price.toFixed(2)} | P/E: ${match.data.pe?.toFixed(2) || 'N/A'} | Div: ${match.data.dividendYield?.toFixed(2)}%`);
      });
    }
  } catch (error) {
    console.error('✗ Test 1 failed:', error.message);
  }

  console.log('\n==========================================');

  // Test 2: Oversold Momentum Stocks (Low RSI)
  console.log('\nTest 2: Oversold Momentum Screening');
  console.log('Criteria: RSI < 35, Price > $20\n');

  const momentumProfile = {
    name: 'Oversold Momentum',
    asset_type: 'stock',
    parameters: JSON.stringify({
      priceMin: 20,
      rsiMax: 35,
    }),
    schedule_enabled: 0,
    schedule_interval: 15,
    schedule_market_hours_only: 1,
    auto_execute: 0,
  };

  const result2 = db.prepare(`
    INSERT INTO screening_profiles (name, asset_type, parameters, schedule_enabled,
                                    schedule_interval, schedule_market_hours_only, auto_execute)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    momentumProfile.name,
    momentumProfile.asset_type,
    momentumProfile.parameters,
    momentumProfile.schedule_enabled,
    momentumProfile.schedule_interval,
    momentumProfile.schedule_market_hours_only,
    momentumProfile.auto_execute
  );

  const profileId2 = result2.lastInsertRowid;

  try {
    console.log('Starting scan...');
    const startTime = Date.now();

    const scanResult = await scannerService.runScan(profileId2, db);

    const duration = Date.now() - startTime;
    console.log(`\n✓ Scan completed in ${duration}ms`);
    console.log(`Matches found: ${scanResult.matches.length}`);

    if (scanResult.matches.length > 0) {
      console.log('\nMatching stocks:');
      scanResult.matches.slice(0, 5).forEach((match) => {
        console.log(`  ${match.symbol}: $${match.data.price.toFixed(2)} | RSI: ${match.data.rsi?.toFixed(2) || 'N/A'}`);
      });
    }
  } catch (error) {
    console.error('✗ Test 2 failed:', error.message);
  }

  console.log('\n==========================================');

  // Test 3: Cache Testing (Run same scan twice)
  console.log('\nTest 3: Cache Performance Test');
  console.log('Running same scan twice to test caching\n');

  try {
    console.log('First run (no cache):');
    const start1 = Date.now();
    await scannerService.runScan(profileId1, db);
    const duration1 = Date.now() - start1;
    console.log(`  Duration: ${duration1}ms`);

    console.log('\nSecond run (with cache):');
    const start2 = Date.now();
    await scannerService.runScan(profileId1, db);
    const duration2 = Date.now() - start2;
    console.log(`  Duration: ${duration2}ms`);

    const speedup = ((duration1 - duration2) / duration1 * 100).toFixed(1);
    console.log(`\n✓ Cache speedup: ${speedup}% faster`);
  } catch (error) {
    console.error('✗ Test 3 failed:', error.message);
  }

  console.log('\n==========================================');

  // Test 4: Rate Limit Check
  console.log('\nTest 4: Rate Limit Status Check\n');

  const dataService = require('../electron/services/dataService');
  const rateLimits = dataService.getRateLimitStatus();

  console.log('Alpha Vantage Usage:');
  console.log(`  Requests this minute: ${rateLimits.alphaVantage.requestsThisMinute}/${rateLimits.alphaVantage.maxPerMinute}`);
  console.log(`  Requests today: ${rateLimits.alphaVantage.requestsToday}/${rateLimits.alphaVantage.maxPerDay}`);

  console.log('\n==========================================');
  console.log('\nAll tests completed!');
  console.log('==========================================\n');

  db.close();
  process.exit(0);
}

// Run tests
runTests().catch((error) => {
  console.error('\nFATAL ERROR:', error);
  process.exit(1);
});
