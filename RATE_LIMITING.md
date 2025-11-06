# Rate Limiting Implementation

## Overview

This implementation adds comprehensive, configurable rate limiting for all API providers (Alpaca and Alpha Vantage) to prevent exceeding API quotas and ensure smooth operation.

## What Was Implemented

### 1. RateLimiter Utility Class
**Location**: `electron/utils/rateLimiter.js`

A sophisticated rate limiting engine that provides:

- **Configurable limits** - Load from database or use sensible defaults
- **Request queuing** - Automatically queues requests when limits are reached
- **Automatic throttling** - Waits and retries when rate limits are hit
- **Batch processing** - Execute multiple requests with automatic distribution over time
- **Priority support** - High-priority requests jump to front of queue
- **Status monitoring** - Real-time tracking of API usage

**Key Features**:
```javascript
// Execute a single rate-limited request
await rateLimiter.executeRequest('alpaca', () => alpacaService.getQuote('AAPL'));

// Execute batch with automatic throttling
await rateLimiter.executeBatch('alpaca', requestFunctions, {
  batchSize: 10,
  delayBetweenBatches: 1000
});

// Check current status
const status = rateLimiter.getStatus();
// Returns: { alpaca: { requestsThisMinute: 45, maxPerMinute: 10000, ... } }
```

### 2. Database Configuration
**Location**: `database/schema.sql`

Added default settings to `app_settings` table:

| Setting | Default Value | Notes |
|---------|--------------|-------|
| `alpaca_rate_limit_per_minute` | 10000 | Suitable for paid Alpaca plans |
| `alpaca_rate_limit_per_day` | null | No daily limit for Alpaca |
| `alpha_vantage_rate_limit_per_minute` | 5 | Free tier limit |
| `alpha_vantage_rate_limit_per_day` | 25 | Free tier limit |

**Users can configure these values** to match their API plan tier.

### 3. Service Integration

#### dataService.js
- Removed hardcoded rate limiting
- Integrated RateLimiter for all Alpha Vantage calls
- Added `initialize(db)` method to load configuration
- Added `updateRateLimits(provider, settings)` to change limits at runtime
- Updated `getRateLimitStatus()` to return comprehensive status for all providers

#### scannerService.js
- Added rate limiting to all Alpaca API calls:
  - `getQuote()` - Rate limited
  - `getLatestBar()` - Rate limited
  - `getHistoricalBars()` - Rate limited
- Automatic initialization with database connection
- Requests are queued and processed respecting limits

### 4. Test Updates
**Location**: `tests/test-scanner.js`

Updated test suite to:
- Initialize services with rate limiter before running tests
- Includes Test 4 that displays current rate limit status
- Shows requests made and remaining capacity

## Default Rate Limits

### Alpaca API (Paid Plan)
- **Per Minute**: 10,000 requests
- **Per Day**: No limit
- **Source**: Standard paid plan quota

### Alpha Vantage API (Free Tier)
- **Per Minute**: 5 requests
- **Per Day**: 25 requests
- **Source**: Free tier quota

## How It Works

### Request Flow

1. **Service calls API** through rate limiter:
   ```javascript
   await rateLimiter.executeRequest('alpaca', () => apiCall());
   ```

2. **Rate limiter checks limits**:
   - Current minute count vs. `maxPerMinute`
   - Current day count vs. `maxPerDay`

3. **If under limits**:
   - Execute request immediately
   - Increment counters
   - Return result

4. **If over limits**:
   - Add request to queue
   - Wait until next reset window
   - Process queue automatically
   - Return result when executed

### Automatic Reset

- **Minute counters** reset every 60 seconds
- **Daily counters** reset every 24 hours
- **Automatic** - no manual intervention needed

## Configuring Rate Limits

### Option 1: Database Settings (Recommended)

Update values in the database:

```javascript
// Example: Update to Premium Alpha Vantage limits
dataService.updateRateLimits('alphaVantage', {
  maxPerMinute: 75,    // Premium tier
  maxPerDay: 500       // Premium tier
});

// Example: Update to Free Alpaca limits
dataService.updateRateLimits('alpaca', {
  maxPerMinute: 200,   // Free tier
  maxPerDay: null      // No daily limit
});
```

### Option 2: Direct SQL

```sql
-- Update Alpaca limits for free tier
UPDATE app_settings SET value = '200' WHERE key = 'alpaca_rate_limit_per_minute';

-- Update Alpha Vantage for premium tier
UPDATE app_settings SET value = '75' WHERE key = 'alpha_vantage_rate_limit_per_minute';
UPDATE app_settings SET value = '500' WHERE key = 'alpha_vantage_rate_limit_per_day';
```

### Option 3: Settings UI (Future)

In Phase 3, we'll add a Settings UI where users can configure these values without touching code or database.

## Benefits

### 1. Never Exceed Quotas
Automatic throttling prevents hitting API limits and getting blocked.

### 2. Optimized Performance
Requests are batched and distributed to maximize throughput while staying under limits.

### 3. User Configurable
Match your actual API plan - free tier, paid tier, premium tier.

### 4. Transparent Monitoring
Real-time visibility into API usage via `getRateLimitStatus()`.

### 5. Graceful Degradation
When limits are reached, requests queue instead of failing.

## API Plan Comparison

### Alpaca

| Plan | Per Minute | Per Day | Monthly Cost |
|------|-----------|---------|--------------|
| Free | 200 | Unlimited | $0 |
| Starter | 10,000 | Unlimited | $9/month |
| Unlimited Data | 10,000 | Unlimited | $99/month |

**Default Setting**: 10,000/min (Starter/Unlimited plan)

### Alpha Vantage

| Plan | Per Minute | Per Day | Monthly Cost |
|------|-----------|---------|--------------|
| Free | 5 | 25 | $0 |
| Premium | 75 | 500 | $49.99/month |
| Enterprise | Custom | Custom | Contact sales |

**Default Setting**: 5/min, 25/day (Free plan)

## Testing Rate Limiting

### Before Running Tests

```bash
# Install dependencies
npm install

# Set up API keys in .env file
cp .env.example .env
# Edit .env and add your ALPACA_API_KEY, ALPACA_SECRET_KEY, ALPHA_VANTAGE_API_KEY
```

### Run Test Suite

```bash
node tests/test-scanner.js
```

### Expected Behavior

**Test 1 & 2** - Stock scanning with rate limiting:
- Each symbol requires 2-3 Alpaca API calls (quote, bar, historical)
- With 60 symbols, that's ~180 API calls
- With 10,000/min limit, all requests complete in seconds
- With lower limits, you'll see throttling messages

**Test 3** - Cache performance:
- First run: Makes API calls, respects rate limits
- Second run: Uses cache, minimal API calls

**Test 4** - Rate limit status:
- Shows current usage for Alpaca and Alpha Vantage
- Displays remaining capacity

### Sample Output

```
==========================================
  Stock Screening Engine Test Suite
==========================================

Initializing services with rate limiting...
Rate limits loaded from database: {
  alpaca: { perMinute: 10000, perDay: null },
  alphaVantage: { perMinute: 5, perDay: 25 }
}
Services initialized.

Test 1: Value Stock Screening
Criteria: P/E < 15, Dividend Yield > 2%, Price $10-$100

Starting scan...
Scanning 60 symbols...
✓ Match found: T
✓ Match found: VZ

✓ Scan completed in 3847ms
Matches found: 2

==========================================

Test 4: Rate Limit Status Check

Alpaca Usage:
  Requests this minute: 142/10000
  Requests today: 142

Alpha Vantage Usage:
  Requests this minute: 2/5
  Requests today: 2/25
```

## Troubleshooting

### "Rate limit exceeded" errors

**Cause**: Hit API quota for the current time window

**Solution**:
1. Check current limits: `dataService.getRateLimitStatus()`
2. Wait for reset window (shown in status)
3. Or increase limits in database if you have a higher-tier plan

### Slow scans with many symbols

**Cause**: Free tier rate limits are very restrictive (5/min for Alpha Vantage)

**Solution**:
1. Upgrade to paid API plan
2. Update rate limits in database to match your plan
3. Use caching (already implemented) to reduce API calls
4. Scan smaller watchlists

### Requests timing out

**Cause**: Request has been in queue longer than timeout (default 30s)

**Solution**:
1. Increase timeout when calling executeRequest:
   ```javascript
   rateLimiter.executeRequest('alpaca', requestFn, { timeout: 60000 })
   ```
2. Check if rate limits are too restrictive
3. Reduce watchlist size

## Future Enhancements

### Phase 3 Additions

1. **Settings UI** - Configure rate limits via Settings page
2. **Usage Dashboard** - Visual charts showing API usage over time
3. **Smart Batching** - Automatically adjust batch sizes based on limits
4. **Multiple Alpaca Accounts** - Pool rate limits across multiple API keys
5. **Predictive Throttling** - Slow down proactively to avoid hitting limits

## Files Modified

- ✅ `electron/utils/rateLimiter.js` - NEW - Core rate limiting engine
- ✅ `electron/services/dataService.js` - MODIFIED - Integrated rate limiter
- ✅ `electron/services/scannerService.js` - MODIFIED - Rate limited all Alpaca calls
- ✅ `database/schema.sql` - MODIFIED - Added default rate limit settings
- ✅ `tests/test-scanner.js` - MODIFIED - Initialize services before testing

## API Provider Documentation

- **Alpaca Rate Limits**: https://docs.alpaca.markets/docs/rate-limits
- **Alpha Vantage API Plans**: https://www.alphavantage.co/premium/

---

**Questions or Issues?**

Open an issue at: https://github.com/EnragedAntelope/autotrader/issues
