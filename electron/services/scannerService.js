const alpacaService = require('./alpacaService');
const RateLimiter = require('../utils/rateLimiter');

// Lazy load dataService to avoid circular dependency
let dataService = null;
function getDataService() {
  if (!dataService) {
    dataService = require('./dataService');
  }
  return dataService;
}

/**
 * Scanner Service - Executes screening logic
 * Core engine for finding stocks/options that match criteria
 */

class ScannerService {
  constructor() {
    this.rateLimiter = null;
  }

  /**
   * Initialize with database connection
   */
  initialize(db) {
    if (!this.rateLimiter) {
      this.rateLimiter = new RateLimiter(db);
      console.log('ScannerService initialized with rate limiter');
    }
  }

  /**
   * Run a scan based on a profile
   */
  async runScan(profileId, db) {
    const startTime = Date.now();

    // Initialize rate limiter if not already done
    this.initialize(db);

    try {
      // Get the profile
      const profile = db
        .prepare('SELECT * FROM screening_profiles WHERE id = ?')
        .get(profileId);

      if (!profile) {
        throw new Error(`Profile ${profileId} not found`);
      }

      const parameters = JSON.parse(profile.parameters);
      console.log(`Running scan for profile: ${profile.name}`);

      let matches = [];

      if (profile.asset_type === 'stock') {
        matches = await this.scanStocks(parameters, db);
      } else if (profile.asset_type === 'call_option' || profile.asset_type === 'put_option') {
        matches = await this.scanOptions(profile.asset_type, parameters, db);
      }

      // Log results
      const scanTimestamp = new Date().toISOString();
      for (const match of matches) {
        db.prepare(`
          INSERT INTO scan_results (profile_id, symbol, asset_type, scan_timestamp, parameters_snapshot, market_data_snapshot)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          profileId,
          match.symbol,
          profile.asset_type,
          scanTimestamp,
          JSON.stringify(parameters),
          JSON.stringify(match.data)
        );
      }

      // Update daily stats
      const today = new Date().toISOString().split('T')[0];
      db.prepare(`
        INSERT INTO daily_stats (date, scans_run, matches_found)
        VALUES (?, 1, ?)
        ON CONFLICT(date) DO UPDATE SET
          scans_run = scans_run + 1,
          matches_found = matches_found + ?
      `).run(today, matches.length, matches.length);

      const executionTime = Date.now() - startTime;

      // Log scheduler execution
      db.prepare(`
        INSERT INTO scheduler_log (profile_id, job_type, status, execution_time_ms, completed_at)
        VALUES (?, 'scan', 'completed', ?, datetime('now'))
      `).run(profileId, executionTime);

      console.log(`Scan completed: ${matches.length} matches found in ${executionTime}ms`);

      return {
        success: true,
        matches,
        executionTime,
        timestamp: scanTimestamp,
      };
    } catch (error) {
      console.error('Error running scan:', error);

      // Log failure
      db.prepare(`
        INSERT INTO scheduler_log (profile_id, job_type, status, error_message, completed_at)
        VALUES (?, 'scan', 'failed', ?, datetime('now'))
      `).run(profileId, error.message);

      throw error;
    }
  }

  /**
   * Scan for stocks matching criteria
   * Phase 2: Full implementation with all parameters
   */
  async scanStocks(parameters, db) {
    const symbols = await this.getWatchlist(db);
    const matches = [];

    console.log(`Scanning ${symbols.length} symbols with criteria:`, Object.keys(parameters));

    for (const symbol of symbols) {
      try {
        // Get stock data with caching
        const stockData = await this.getStockData(symbol, parameters, db);

        if (!stockData) {
          console.log(`Skipping ${symbol} - no data available`);
          continue;
        }

        // Check if stock matches all criteria
        if (this.matchesStockCriteria(stockData, parameters)) {
          matches.push({
            symbol,
            data: stockData,
          });
          console.log(`✓ Match found: ${symbol}`);
        }
      } catch (error) {
        console.error(`Error scanning ${symbol}:`, error.message);
        // Continue with next symbol
      }
    }

    return matches;
  }

  /**
   * Scan for options matching criteria
   * Phase 1: Stub - will be implemented in Phase 3
   */
  async scanOptions(assetType, parameters, db) {
    // TODO: Implement options screening logic in Phase 3
    console.log(`${assetType} scanning logic - to be implemented in Phase 3`);
    return [];
  }

  /**
   * Check if a stock matches the given parameters
   */
  matchesStockCriteria(stockData, parameters) {
    // Price checks
    if (parameters.priceMin && stockData.price < parameters.priceMin) return false;
    if (parameters.priceMax && stockData.price > parameters.priceMax) return false;

    // Volume checks
    if (parameters.volumeMin && stockData.volume < parameters.volumeMin) return false;
    if (parameters.volumeMax && stockData.volume > parameters.volumeMax) return false;

    // Fundamental checks
    if (parameters.peMin && stockData.pe < parameters.peMin) return false;
    if (parameters.peMax && stockData.pe > parameters.peMax) return false;

    if (parameters.marketCapMin && stockData.marketCap < parameters.marketCapMin) return false;
    if (parameters.marketCapMax && stockData.marketCap > parameters.marketCapMax) return false;

    // Technical indicator checks
    if (parameters.rsiMin && stockData.rsi < parameters.rsiMin) return false;
    if (parameters.rsiMax && stockData.rsi > parameters.rsiMax) return false;

    // Sector filter
    if (parameters.sectors && parameters.sectors.length > 0) {
      if (!parameters.sectors.includes(stockData.sector)) return false;
    }

    return true;
  }

  /**
   * Get comprehensive stock data for screening
   */
  async getStockData(symbol, parameters, db) {
    const needsFundamentals = this.requiresFundamentals(parameters);
    const needsTechnicals = this.requiresTechnicals(parameters);

    try {
      // 1. Get quote and bar data with rate limiting
      // Use Promise.all to fetch both in parallel but both are rate-limited
      const [quote, bar] = await Promise.all([
        this.rateLimiter.executeRequest('alpaca', () => alpacaService.getQuote(symbol)),
        this.rateLimiter.executeRequest('alpaca', () => alpacaService.getLatestBar(symbol)),
      ]);

      if (!quote || !bar) {
        return null;
      }

      const stockData = {
        symbol,
        price: quote.price,
        volume: bar.volume,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        dayChange: bar.close - bar.open,
        dayChangePercent: ((bar.close - bar.open) / bar.open) * 100,
      };

      // 2. Get fundamentals if needed (with caching)
      if (needsFundamentals) {
        const fundamentals = await this.getCachedFundamentals(symbol, db);
        if (fundamentals) {
          Object.assign(stockData, fundamentals);
        }
      }

      // 3. Get technical indicators if needed (uses rate-limited historical data)
      if (needsTechnicals) {
        const technicals = await this.getTechnicalIndicators(symbol, db);
        if (technicals) {
          Object.assign(stockData, technicals);
        }
      }

      return stockData;
    } catch (error) {
      console.error(`Error getting data for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Check if parameters require fundamental data
   */
  requiresFundamentals(parameters) {
    return !!(
      parameters.peMin ||
      parameters.peMax ||
      parameters.pbMin ||
      parameters.pbMax ||
      parameters.epsMin ||
      parameters.epsMax ||
      parameters.marketCapMin ||
      parameters.marketCapMax ||
      parameters.dividendYieldMin ||
      parameters.dividendYieldMax ||
      parameters.betaMin ||
      parameters.betaMax ||
      parameters.sectors ||
      parameters.debtToEquityMax ||
      parameters.currentRatioMin
    );
  }

  /**
   * Check if parameters require technical indicators
   */
  requiresTechnicals(parameters) {
    return !!(
      parameters.rsiMin ||
      parameters.rsiMax ||
      parameters.macdSignal ||
      parameters.sma20Above ||
      parameters.sma50Above ||
      parameters.sma200Above
    );
  }

  /**
   * Get cached fundamentals or fetch if not cached
   */
  async getCachedFundamentals(symbol, db) {
    // Check cache first (24 hour TTL for fundamentals)
    const cached = db
      .prepare(
        `SELECT data, cached_at FROM market_data_cache
         WHERE symbol = ? AND data_type = 'fundamentals'
         AND expires_at > datetime('now')`
      )
      .get(symbol);

    if (cached) {
      return JSON.parse(cached.data);
    }

    // Fetch fresh data
    try {
      const fundamentals = await getDataService().getFundamentals(symbol);

      // Cache for 24 hours
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      db.prepare(
        `INSERT OR REPLACE INTO market_data_cache (symbol, data_type, data, expires_at)
         VALUES (?, 'fundamentals', ?, ?)`
      ).run(symbol, JSON.stringify(fundamentals), expiresAt);

      return fundamentals;
    } catch (error) {
      console.error(`Error fetching fundamentals for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Get technical indicators (cached or calculated)
   */
  async getTechnicalIndicators(symbol, db) {
    // Check cache (1 hour TTL for technicals)
    const cached = db
      .prepare(
        `SELECT data FROM market_data_cache
         WHERE symbol = ? AND data_type = 'technical'
         AND expires_at > datetime('now')`
      )
      .get(symbol);

    if (cached) {
      return JSON.parse(cached.data);
    }

    // Calculate from historical data with rate limiting
    try {
      const bars = await this.rateLimiter.executeRequest('alpaca', () =>
        alpacaService.getHistoricalBars(symbol, {
          limit: 200, // Need 200 periods for SMA200
          timeframe: '1Day',
        })
      );

      if (!bars || bars.length < 14) {
        return null; // Not enough data
      }

      const technicals = this.calculateTechnicalIndicators(bars);

      // Cache for 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      db.prepare(
        `INSERT OR REPLACE INTO market_data_cache (symbol, data_type, data, expires_at)
         VALUES (?, 'technical', ?, ?)`
      ).run(symbol, JSON.stringify(technicals), expiresAt);

      return technicals;
    } catch (error) {
      console.error(`Error calculating technicals for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Calculate technical indicators from price bars
   */
  calculateTechnicalIndicators(bars) {
    const closes = bars.map((b) => b.close);

    return {
      rsi: this.calculateRSI(closes, 14),
      sma20: this.calculateSMA(closes, 20),
      sma50: this.calculateSMA(closes, 50),
      sma200: this.calculateSMA(closes, 200),
      macd: this.calculateMACD(closes),
    };
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  calculateRSI(closes, period = 14) {
    if (closes.length < period + 1) return null;

    let gains = 0;
    let losses = 0;

    // Calculate initial average gain/loss
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Smooth with remaining values
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
      }
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /**
   * Calculate Simple Moving Average
   */
  calculateSMA(closes, period) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  calculateMACD(closes) {
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);

    if (!ema12 || !ema26) return null;

    const macdLine = ema12 - ema26;
    // Signal line would need more data, simplified for now
    return {
      value: macdLine,
      signal: macdLine > 0 ? 'bullish' : 'bearish',
    };
  }

  /**
   * Calculate Exponential Moving Average
   */
  calculateEMA(closes, period) {
    if (closes.length < period) return null;

    const k = 2 / (period + 1);
    let ema = closes[0];

    for (let i = 1; i < closes.length; i++) {
      ema = closes[i] * k + ema * (1 - k);
    }

    return ema;
  }

  /**
   * Get a watchlist of symbols to scan
   * Checks database for custom watchlist, falls back to default
   */
  async getWatchlist(db) {
    // TODO: Implement custom watchlist feature in database
    // For Phase 2, using expanded default watchlist

    return [
      // Tech giants
      'AAPL',
      'MSFT',
      'GOOGL',
      'AMZN',
      'NVDA',
      'META',
      'TSLA',
      'NFLX',
      'ADBE',
      'CRM',
      'ORCL',
      'CSCO',
      'INTC',
      'AMD',
      'QCOM',
      // Financials
      'JPM',
      'BAC',
      'WFC',
      'GS',
      'MS',
      'C',
      'V',
      'MA',
      'PYPL',
      'AXP',
      // Healthcare
      'JNJ',
      'UNH',
      'PFE',
      'ABBV',
      'LLY',
      'TMO',
      'ABT',
      'DHR',
      'MRK',
      'BMY',
      // Consumer
      'WMT',
      'HD',
      'MCD',
      'NKE',
      'SBUX',
      'TGT',
      'LOW',
      'COST',
      'PG',
      'KO',
      'PEP',
      'PM',
      // Industrials
      'BA',
      'CAT',
      'GE',
      'UPS',
      'HON',
      'MMM',
      'LMT',
      'RTX',
      // Energy
      'XOM',
      'CVX',
      'COP',
      'SLB',
      'EOG',
    ];
  }
}

module.exports = new ScannerService();
