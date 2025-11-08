# API Coverage and Limitations

## Overview

This document provides comprehensive information about:
- Screener capabilities and limitations
- Alpha Vantage API datapoint coverage
- Alpaca API datapoint coverage
- Free vs paid tier features
- Data validation implementation

Last updated: 2025-11-08

---

## Screener Stock Universe

### Current Capabilities ✅

The screener operates on a **watchlist-based system**:

- **13 predefined watchlists** available (~60-150 stocks each):
  - All Major Stocks (60 stocks, default, multi-sector)
  - Tech Giants
  - Dividend Aristocrats
  - Financial Sector
  - Healthcare Leaders
  - Energy & Commodities
  - Cloud & SaaS
  - Consumer Staples
  - E-commerce & Retail
  - Semiconductors
  - EV & Clean Energy

- **Sector filtering** within watchlists (as a screening parameter):
  - Technology, Healthcare, Financials
  - Consumer Cyclical, Consumer Defensive
  - Industrials, Energy, Utilities
  - Real Estate, Materials, Communication Services

- **Custom watchlists** can be created manually through the UI

### Current Limitations ❌

**Cannot automatically scan:**
- All US stocks (NYSE, NASDAQ complete universe)
- S&P 500 companies dynamically
- Russell 2000 index
- Full sector/industry universes without manual watchlist creation

**Workarounds:**
1. Use "All Major Stocks" watchlist + sector filter for broad coverage
2. Manually add stocks to custom watchlists via WatchlistManager
3. Use external scripts to populate database with larger stock universes

**Code References:**
- Watchlist definitions: `electron/main.js:111-200`
- Sector parameters: `src/constants/parameterDefinitions.ts:349-370`
- Scanner logic: `electron/services/scannerService.js:938-970`

---

## Alpha Vantage API Coverage

### Currently Implemented ✅

**7 Screening Parameters** (from OVERVIEW endpoint):
1. **Market Cap** - `minMarketCap`, `maxMarketCap`
2. **P/E Ratio** - `minPERatio`, `maxPERatio`
3. **P/B Ratio** - `minPBRatio`, `maxPBRatio`
4. **Dividend Yield** - `minDividendYield`, `maxDividendYield`
5. **Beta** - `minBeta`, `maxBeta`
6. **Sector** - Filter dropdown
7. **Country** - Filter dropdown

**Additional Data Fetched But Not Used:**
- EPS (Earnings Per Share)
- 52-Week High/Low
- Industry
- Description

**File Location:** `electron/services/dataService.js:64-87`

### Broken Parameters ⚠️

These are **defined in the UI** but **data is never fetched** (will not work):

1. `minCurrentRatio` / `maxCurrentRatio` - Requires BALANCE_SHEET endpoint
2. `minQuickRatio` - Requires BALANCE_SHEET endpoint
3. `maxDebtToEquity` - Requires BALANCE_SHEET endpoint
4. `minROE` - Requires INCOME_STATEMENT endpoint
5. `minROA` - Requires INCOME_STATEMENT endpoint

**Impact:** Users can select these parameters, but they will be ignored during screening.

### Missing Major Datapoints ❌

**From OVERVIEW endpoint** (easy to add):
- PEG Ratio (growth-adjusted valuation)
- Profit Margin
- Operating Margin TTM
- Return on Equity TTM
- Return on Assets TTM
- Revenue Per Share TTM
- Book Value
- Shares Outstanding
- Analyst Target Price

**From INCOME_STATEMENT endpoint** (requires additional API calls):
- Net Income
- Total Revenue
- EBITDA
- Operating Income
- Revenue Growth YoY
- Earnings Growth YoY

**From BALANCE_SHEET endpoint:**
- Current Assets/Liabilities (for Current Ratio)
- Total Assets
- Total Debt
- Shareholders' Equity

**From CASH_FLOW endpoint:**
- Operating Cash Flow
- Free Cash Flow
- Capital Expenditures

**Technical Indicators** (50+ available):
- Currently only RSI is calculated locally
- Alpha Vantage offers: MACD, Stochastic, ADX, CCI, ATR, Bollinger Bands, VWAP, and 40+ more

### Rate Limits

**Free Tier:**
- 5 requests/minute
- 25 requests/day
- Cost: $0

**Premium Plan:**
- 75 requests/minute
- 500 requests/day
- Cost: $49.99/month

**Premium+ Plan:**
- 600+ requests/day
- Cost: $249.99/month

**Enterprise:**
- Custom limits
- Cost: $499.99+/month

**Configured In:** `src/components/Settings.tsx:271-282`

---

## Alpaca API Coverage

### Stock Data ✅ **Fully Implemented**

**Real-time Market Data:**
- Latest quotes (price, size, timestamp)
- Daily OHLCV bars
- Historical bars (configurable timeframe)
- Market clock/hours

**Account & Positions:**
- Cash, buying power, portfolio value, equity
- All open positions with P&L
- Pattern day trader status
- Trading blocks

**Asset Information:**
- Asset details (exchange, tradability, marginability, shortability)
- Asset search by symbol/name

**Order Management:**
- Market, Limit, Stop, Stop-Limit, Trailing Stop orders
- Order status tracking
- Cancel orders

**File Location:** `electron/services/alpacaService.js:111-362`

### Options Data ✅ **Fully Implemented**

**Options Contracts:**
- Contract lists by underlying symbol
- Strike prices and expirations
- Call/Put type filtering

**Options Quotes & Greeks:**
- Bid/Ask prices
- Delta, Gamma, Theta, Vega
- Implied Volatility
- Open Interest
- Volume

**File Location:** `electron/services/alpacaService.js:414-562`

### Missing Alpaca Features ❌

**Real-time Data Feeds** (requires paid upgrade):
- Tick-by-tick data (every trade)
- Live quote updates (bid/ask streaming)
- Minute-level bars
- WebSocket streaming connections

**Advanced Options Analytics:**
- Historical Greeks (trends over time)
- Options spreads analysis
- Volatility smile
- Put-call ratios

**Alternative Data:**
- Corporate actions (splits, dividends)
- Earnings calendar
- IPO data
- News/sentiment
- Insider transactions
- Institutional holdings

**Other Asset Classes:**
- Cryptocurrency (Bitcoin, Ethereum, etc.)
- Forex (currency pairs)
- Commodities

### Rate Limits & Pricing

**Paper Trading (Free):**
- 200 requests/minute
- Unlimited daily
- Cost: $0
- Paper trading only

**Starter Plan:**
- 10,000 requests/minute
- Unlimited daily
- Cost: $9/month
- **Live trading enabled**

**Unlimited Data Plan:**
- 10,000 requests/minute
- Unlimited daily
- Cost: $99/month
- Enhanced data feeds

**Current Default:** 10,000/min (assumes Starter plan)
**Configured In:** `src/components/Settings.tsx:247`, `electron/utils/rateLimiter.js`

**Documentation:** `README.md:392-555`, `docs/RATE_LIMITING.md`

---

## Paper vs Live Trading Separation

### Confidence Level: 95% ✅

**Separation is properly maintained at:**

1. **API Level** - Separate credentials for paper/live Alpaca accounts
2. **Database Level** - All tables include `trading_mode` column with constraints
3. **Business Logic** - All queries filter by mode, risk limits per-mode

**Database Tables with Mode Separation:**
- `positions_tracker` - `UNIQUE(symbol, trading_mode)`
- `daily_stats` - `PRIMARY KEY (date, trading_mode)`
- `trade_history` - `trading_mode` column
- `closed_positions` - `trading_mode` column

**Recent Fix Applied:**
- Auto-refresh account data and positions when switching modes
- Prevents stale balance display (UX improvement)

**File References:**
- Mode configuration: `electron/services/alpacaService.js`
- Trade execution: `electron/services/tradeService.js`
- Settings UI: `src/components/Settings.tsx:95-117`
- Database schema: `database/schema.sql`

---

## Backtesting Limitations

### Current Status: 100% SIMULATED ⚠️

**Critical Information:**
- Backtesting uses **random simulated data** only
- Does NOT use real historical data from any API
- Uses `Math.random()` for all price movements
- Hardcoded parameters: 7-day scans, 30% hit rate, 5% stop-loss, 15% take-profit

**User Warning Added:**
- Prominent "SIMULATED BACKTESTING MODE" banner on backtesting page
- Explains paid Alpha Vantage key requirement for real data
- Similar visual treatment to PAPER trading indicator

**To Enable Real Backtesting:**
1. Implement Alpaca historical bars API calls
2. Add Alpha Vantage historical fundamentals
3. Update `electron/services/backtestService.js` to fetch real data

**File References:**
- Backend service: `electron/services/backtestService.js`
- Frontend UI: `src/components/Backtesting.tsx:146-166`

---

## API Response Validation

### New Validation Utilities Added ✅

**File:** `electron/utils/apiValidator.js`

**Validation Functions:**

1. **Price Validation** - `validatePrice(price, fieldName, allowNull)`
   - Must be positive and finite
   - No NaN or Infinity values

2. **Volume Validation** - `validateVolume(volume, fieldName, allowNull)`
   - Non-negative integers only
   - Prevents fractional volumes

3. **Timestamp Validation** - `validateTimestamp(timestamp, fieldName)`
   - Handles Unix timestamps and ISO strings
   - Ensures valid date/time

4. **Alpaca Quote Validation** - `validateAlpacaQuote(quote)`
   - Validates price, size, timestamp structure
   - Ensures all required fields exist

5. **Alpaca Bar Validation** - `validateAlpacaBar(bar)`
   - Validates OHLCV data
   - Checks price relationships (high >= low, etc.)

6. **Greeks Validation** - `validateGreeks(greeks)`
   - Delta range: -1 to 1
   - Gamma, Vega: non-negative
   - Theta: any value

7. **Alpha Vantage Validation** - `validateAlphaVantageFundamentals(data)`
   - Detects API errors and rate limits
   - Validates numeric fields
   - Provides fallback values for missing data
   - Logs warnings for missing expected fields

8. **Account Info Validation** - `validateAccountInfo(account)`
   - Ensures all monetary values are valid
   - Prevents negative balances

**Safe Validation Wrapper:**
```javascript
safeValidate(validator, data, context)
```
- Catches validation errors
- Logs detailed error messages
- Returns null on validation failure
- Prevents app crashes from bad API data

**Usage Example:**
```javascript
const { validateAlpacaQuote, safeValidate } = require('./utils/apiValidator');

// With error handling
const quote = safeValidate(validateAlpacaQuote, rawQuote, 'AAPL quote');
if (!quote) {
  // Handle invalid data
}

// Direct validation (throws on error)
try {
  const quote = validateAlpacaQuote(rawQuote);
} catch (error) {
  console.error('Invalid quote:', error.message);
}
```

**Integration Points:**
- To be integrated into `electron/services/alpacaService.js`
- To be integrated into `electron/services/dataService.js`
- To be integrated into `electron/services/scannerService.js`

---

## Recommendations

### High Priority

1. **Integrate API Validation**
   - Apply validation to all Alpaca API responses
   - Apply validation to all Alpha Vantage responses
   - Use safeValidate wrapper for graceful error handling

2. **Fix Broken Parameters**
   - Either implement BALANCE_SHEET/INCOME_STATEMENT API calls
   - OR remove broken parameters from UI (Current Ratio, ROE, ROA, Debt-to-Equity, Quick Ratio)

3. **Implement Real Backtesting**
   - Use Alpaca historical bars for price data
   - Consider implementing Alpha Vantage historical fundamentals

### Medium Priority

4. **Add Missing Alpha Vantage Fields**
   - Extract additional OVERVIEW fields (PEG ratio, Profit Margin, etc.)
   - Low effort, high value

5. **Document Free vs Paid Features**
   - Add UI indicators for which features require paid API tiers
   - Provide tier recommendations based on usage

6. **Expand Stock Universe**
   - Add S&P 500 watchlist
   - Implement dynamic index tracking
   - Consider third-party stock list APIs

### Low Priority

7. **Add Advanced Technical Indicators**
   - Implement Bollinger Bands, MACD calculations
   - Consider using Alpha Vantage technical indicator endpoints

8. **Implement Update Checker**
   - Check GitHub releases for new versions
   - Notify users of available updates

---

## Support & Resources

**Configuration Files:**
- Settings UI: `src/components/Settings.tsx`
- Rate limiting: `electron/utils/rateLimiter.js`
- Parameter definitions: `src/constants/parameterDefinitions.ts`

**Documentation:**
- Main README: `README.md`
- Rate limiting guide: `docs/RATE_LIMITING.md`
- Database schema: `database/schema.sql`

**External API Documentation:**
- Alpaca API: https://alpaca.markets/docs/
- Alpha Vantage: https://www.alphavantage.co/documentation/

**Report Issues:**
- GitHub Issues: https://github.com/EnragedAntelope/autotrader/issues
