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

    // Also initialize dataService with the same database
    const dataServiceInstance = getDataService();
    if (dataServiceInstance && typeof dataServiceInstance.initialize === 'function') {
      dataServiceInstance.initialize(db);
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
        matches = await this.scanStocks(parameters, profile.watchlist_id, db);
      } else if (profile.asset_type === 'call_option' || profile.asset_type === 'put_option') {
        matches = await this.scanOptions(profile.asset_type, parameters, profile.watchlist_id, db);
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
      const tradingMode = process.env.TRADING_MODE || 'paper';
      db.prepare(`
        INSERT INTO daily_stats (date, trading_mode, scans_run, matches_found)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(date, trading_mode) DO UPDATE SET
          scans_run = scans_run + 1,
          matches_found = matches_found + ?
      `).run(today, tradingMode, matches.length, matches.length);

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
  async scanStocks(parameters, watchlistId, db) {
    const symbols = await this.getWatchlist(watchlistId, db);
    const matches = [];

    console.log(`Scanning ${symbols.length} symbols with criteria:`, Object.keys(parameters));

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const progress = `[${i + 1}/${symbols.length}]`;

      try {
        console.log(`${progress} Scanning ${symbol}...`);

        // Get stock data with caching
        const stockData = await this.getStockData(symbol, parameters, db);

        if (!stockData) {
          console.log(`${progress} Skipping ${symbol} - no data available`);
          continue;
        }

        // Check if stock matches all criteria
        if (this.matchesStockCriteria(stockData, parameters)) {
          matches.push({
            symbol,
            data: stockData,
          });
          console.log(`${progress} ✓ Match found: ${symbol}`);
        } else {
          console.log(`${progress} ✗ ${symbol} did not match criteria`);
        }
      } catch (error) {
        console.error(`${progress} Error scanning ${symbol}:`, error.message);
        // Continue with next symbol
      }
    }

    return matches;
  }

  /**
   * Scan for options matching criteria
   * Implemented in Phase 3
   */
  async scanOptions(assetType, parameters, watchlistId, db) {
    const underlyingSymbols = await this.getWatchlist(watchlistId, db);
    const matches = [];
    const optionType = assetType === 'call_option' ? 'call' : 'put';

    // Diagnostic counters
    let totalContracts = 0;
    let filteredByExpiration = 0;
    let checkedOptions = 0;
    let nullDataCount = 0;

    console.log(`Scanning ${underlyingSymbols.length} underlyings for ${optionType}s with criteria:`, Object.keys(parameters));
    console.log('Parameters:', JSON.stringify(parameters, null, 2));

    // Calculate expiration date range for API filtering
    const apiFilters = {
      type: optionType,
      status: 'active',
    };

    if (parameters.expirationMinDays || parameters.expirationMaxDays) {
      const now = new Date();
      if (parameters.expirationMinDays) {
        const minDate = new Date(now.getTime() + parameters.expirationMinDays * 24 * 60 * 60 * 1000);
        apiFilters.expiration_date_gte = minDate.toISOString().split('T')[0];
      }
      if (parameters.expirationMaxDays) {
        const maxDate = new Date(now.getTime() + parameters.expirationMaxDays * 24 * 60 * 60 * 1000);
        apiFilters.expiration_date_lte = maxDate.toISOString().split('T')[0];
      }
      console.log('API expiration filters:', apiFilters);
    }

    for (const underlying of underlyingSymbols) {
      try {
        // Get option contracts for this underlying with rate limiting
        const optionContracts = await this.rateLimiter.executeRequest('alpaca', () =>
          alpacaService.getOptionContracts(underlying, apiFilters)
        );

        if (!optionContracts || optionContracts.length === 0) {
          continue;
        }

        totalContracts += optionContracts.length;
        console.log(`Found ${optionContracts.length} ${optionType} contracts for ${underlying}`);

        // Filter contracts by expiration if specified
        const filtered = this.filterByExpiration(optionContracts, parameters);
        filteredByExpiration += filtered.length;

        // Get detailed data for each filtered contract
        for (const contract of filtered.slice(0, 5)) {
          // Limit to 5 per underlying to avoid rate limits (can be increased if you have unlimited data plan)
          try {
            const optionData = await this.getOptionData(contract.symbol, contract, parameters, db);

            if (!optionData) {
              nullDataCount++;
              continue;
            }

            checkedOptions++;

            // Log first few options for debugging
            if (checkedOptions <= 3) {
              console.log(`Sample option data #${checkedOptions}:`, {
                symbol: optionData.symbol,
                strike: optionData.strike_price,
                moneyness: optionData.moneyness,
                delta: optionData.delta,
                volume: optionData.volume,
                openInterest: optionData.open_interest,
                bid: optionData.bid,
                ask: optionData.ask
              });
            }

            // Check if option matches all criteria
            if (this.matchesOptionCriteria(optionData, parameters)) {
              matches.push({
                symbol: contract.symbol,
                data: optionData,
              });
              console.log(`✓ Match found: ${contract.symbol} (${underlying} ${contract.strike_price} ${contract.expiration_date})`);

              // Limit total matches to avoid overwhelming results
              if (matches.length >= 100) {
                console.log('Reached maximum matches (100), stopping scan');
                return matches;
              }
            }
          } catch (error) {
            console.error(`Error scanning option ${contract.symbol}:`, error.message);
            // Continue with next contract
          }
        }
      } catch (error) {
        console.error(`Error scanning options for ${underlying}:`, error.message);
        // Continue with next underlying
      }
    }

    // Print diagnostic summary
    console.log('\n=== Scan Diagnostics ===');
    console.log(`Total contracts found: ${totalContracts}`);
    console.log(`After expiration filter: ${filteredByExpiration}`);
    console.log(`Options checked: ${checkedOptions}`);
    console.log(`Options with null data: ${nullDataCount}`);
    console.log(`Matches: ${matches.length}`);
    console.log('========================\n');

    return matches;
  }

  /**
   * Filter option contracts by expiration date range
   */
  filterByExpiration(contracts, parameters) {
    if (!parameters.expirationMinDays && !parameters.expirationMaxDays) {
      return contracts;
    }

    const now = new Date();
    const minDate = parameters.expirationMinDays
      ? new Date(now.getTime() + parameters.expirationMinDays * 24 * 60 * 60 * 1000)
      : null;
    const maxDate = parameters.expirationMaxDays
      ? new Date(now.getTime() + parameters.expirationMaxDays * 24 * 60 * 60 * 1000)
      : null;

    console.log('Expiration filter:', {
      now: now.toISOString().split('T')[0],
      minDate: minDate ? minDate.toISOString().split('T')[0] : null,
      maxDate: maxDate ? maxDate.toISOString().split('T')[0] : null,
      totalContracts: contracts.length,
      sampleExpiration: contracts[0]?.expiration_date
    });

    let invalidDateCount = 0;
    let tooEarlyCount = 0;
    let tooLateCount = 0;

    const filtered = contracts.filter((contract) => {
      const expDate = new Date(contract.expiration_date);

      // Check for invalid date parsing
      if (isNaN(expDate.getTime())) {
        invalidDateCount++;
        return false;
      }

      if (minDate && expDate < minDate) {
        tooEarlyCount++;
        return false;
      }
      if (maxDate && expDate > maxDate) {
        tooLateCount++;
        return false;
      }

      return true;
    });

    console.log(`Expiration filter results:`, {
      input: contracts.length,
      output: filtered.length,
      invalidDates: invalidDateCount,
      tooEarly: tooEarlyCount,
      tooLate: tooLateCount
    });

    return filtered;
  }

  /**
   * Get comprehensive option data for screening
   */
  async getOptionData(optionSymbol, contract, parameters, db) {
    try {
      // Get option quote/snapshot with rate limiting
      const quote = await this.rateLimiter.executeRequest('alpaca', () =>
        alpacaService.getOptionQuote(optionSymbol)
      );

      if (!quote) {
        return null;
      }

      // Calculate days to expiration
      const now = new Date();
      const expDate = new Date(contract.expiration_date);
      const daysToExpiration = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));

      // Get underlying price to calculate moneyness
      const underlyingQuote = await this.rateLimiter.executeRequest('alpaca', () =>
        alpacaService.getQuote(contract.underlying_symbol)
      );

      const underlyingPrice = underlyingQuote ? underlyingQuote.price : null;

      // Calculate moneyness
      let moneyness = 'ATM';
      if (underlyingPrice && contract.strike_price) {
        if (contract.type === 'call') {
          if (underlyingPrice > contract.strike_price * 1.01) moneyness = 'ITM';
          else if (underlyingPrice < contract.strike_price * 0.99) moneyness = 'OTM';
        } else {
          // put
          if (underlyingPrice < contract.strike_price * 0.99) moneyness = 'ITM';
          else if (underlyingPrice > contract.strike_price * 1.01) moneyness = 'OTM';
        }
      }

      const optionData = {
        symbol: optionSymbol,
        underlying_symbol: contract.underlying_symbol,
        strike_price: contract.strike_price,
        expiration_date: contract.expiration_date,
        days_to_expiration: daysToExpiration,
        type: contract.type,
        moneyness,
        // Price data
        bid: quote.bid || 0,
        ask: quote.ask || 0,
        midpoint: quote.bid && quote.ask ? (quote.bid + quote.ask) / 2 : 0,
        bid_ask_spread: quote.bid && quote.ask ? quote.ask - quote.bid : 0,
        last_price: quote.last_price || 0,
        // Volume and interest
        volume: quote.volume || 0,
        open_interest: quote.open_interest || 0,
        volume_oi_ratio: quote.volume && quote.open_interest ? quote.volume / quote.open_interest : 0,
        // Greeks (if available)
        delta: quote.greeks?.delta || null,
        gamma: quote.greeks?.gamma || null,
        theta: quote.greeks?.theta || null,
        vega: quote.greeks?.vega || null,
        implied_volatility: quote.implied_volatility || null,
        // Market data snapshot for results display
        price: quote.last_price || (quote.bid && quote.ask ? (quote.bid + quote.ask) / 2 : 0),
        change: quote.change || 0,
        changePercent: quote.change_percent || 0,
      };

      return optionData;
    } catch (error) {
      console.error(`Error getting option data for ${optionSymbol}:`, error.message);
      return null;
    }
  }

  /**
   * Check if an option matches the given parameters
   */
  matchesOptionCriteria(optionData, parameters) {
    const debug = false; // Set to true to see detailed filtering (disabled - bugs fixed)
    if (debug) {
      console.log(`\n🔍 Checking ${optionData.symbol}:`, {
        strike: optionData.strike_price,
        moneyness: optionData.moneyness,
        delta: optionData.delta,
        volume: optionData.volume,
        openInterest: optionData.open_interest,
        bid: optionData.bid,
        ask: optionData.ask
      });
    }

    // Strike price checks
    if (parameters.strikeMin && optionData.strike_price < parameters.strikeMin) {
      if (debug) console.log(`❌ Failed: strike ${optionData.strike_price} < min ${parameters.strikeMin}`);
      return false;
    }
    if (parameters.strikeMax && optionData.strike_price > parameters.strikeMax) {
      if (debug) console.log(`❌ Failed: strike ${optionData.strike_price} > max ${parameters.strikeMax}`);
      return false;
    }

    // Expiration already filtered in filterByExpiration

    // Greeks checks
    if (parameters.deltaMin !== undefined && optionData.delta !== null) {
      if (optionData.delta < parameters.deltaMin) {
        if (debug) console.log(`❌ Failed: delta ${optionData.delta} < min ${parameters.deltaMin}`);
        return false;
      }
    }
    if (parameters.deltaMax !== undefined && optionData.delta !== null) {
      if (optionData.delta > parameters.deltaMax) {
        if (debug) console.log(`❌ Failed: delta ${optionData.delta} > max ${parameters.deltaMax}`);
        return false;
      }
    }

    if (parameters.gammaMin !== undefined && optionData.gamma !== null) {
      if (optionData.gamma < parameters.gammaMin) {
        if (debug) console.log(`❌ Failed: gamma ${optionData.gamma} < min ${parameters.gammaMin}`);
        return false;
      }
    }
    if (parameters.gammaMax !== undefined && optionData.gamma !== null) {
      if (optionData.gamma > parameters.gammaMax) {
        if (debug) console.log(`❌ Failed: gamma ${optionData.gamma} > max ${parameters.gammaMax}`);
        return false;
      }
    }

    if (parameters.thetaMin !== undefined && optionData.theta !== null) {
      if (optionData.theta < parameters.thetaMin) {
        if (debug) console.log(`❌ Failed: theta ${optionData.theta} < min ${parameters.thetaMin}`);
        return false;
      }
    }
    if (parameters.thetaMax !== undefined && optionData.theta !== null) {
      if (optionData.theta > parameters.thetaMax) {
        if (debug) console.log(`❌ Failed: theta ${optionData.theta} > max ${parameters.thetaMax}`);
        return false;
      }
    }

    if (parameters.vegaMin !== undefined && optionData.vega !== null) {
      if (optionData.vega < parameters.vegaMin) {
        if (debug) console.log(`❌ Failed: vega ${optionData.vega} < min ${parameters.vegaMin}`);
        return false;
      }
    }
    if (parameters.vegaMax !== undefined && optionData.vega !== null) {
      if (optionData.vega > parameters.vegaMax) {
        if (debug) console.log(`❌ Failed: vega ${optionData.vega} > max ${parameters.vegaMax}`);
        return false;
      }
    }

    // Pricing checks
    if (parameters.bidMin && optionData.bid < parameters.bidMin) {
      if (debug) console.log(`❌ Failed: bid ${optionData.bid} < min ${parameters.bidMin}`);
      return false;
    }
    if (parameters.bidMax && optionData.bid > parameters.bidMax) {
      if (debug) console.log(`❌ Failed: bid ${optionData.bid} > max ${parameters.bidMax}`);
      return false;
    }

    if (parameters.askMin && optionData.ask < parameters.askMin) {
      if (debug) console.log(`❌ Failed: ask ${optionData.ask} < min ${parameters.askMin}`);
      return false;
    }
    if (parameters.askMax && optionData.ask > parameters.askMax) {
      if (debug) console.log(`❌ Failed: ask ${optionData.ask} > max ${parameters.askMax}`);
      return false;
    }

    if (parameters.bidAskSpreadMax && optionData.bid_ask_spread > parameters.bidAskSpreadMax) {
      if (debug) console.log(`❌ Failed: spread ${optionData.bid_ask_spread} > max ${parameters.bidAskSpreadMax}`);
      return false;
    }

    if (parameters.premiumMin && optionData.midpoint < parameters.premiumMin) {
      if (debug) console.log(`❌ Failed: premium ${optionData.midpoint} < min ${parameters.premiumMin}`);
      return false;
    }
    if (parameters.premiumMax && optionData.midpoint > parameters.premiumMax) {
      if (debug) console.log(`❌ Failed: premium ${optionData.midpoint} > max ${parameters.premiumMax}`);
      return false;
    }

    // Volume and OI checks
    if (parameters.openInterestMin && optionData.open_interest < parameters.openInterestMin) {
      if (debug) console.log(`❌ Failed: OI ${optionData.open_interest} < min ${parameters.openInterestMin}`);
      return false;
    }
    if (parameters.volumeMin && optionData.volume < parameters.volumeMin) {
      if (debug) console.log(`❌ Failed: volume ${optionData.volume} < min ${parameters.volumeMin}`);
      return false;
    }
    if (parameters.volumeOIRatioMin && optionData.volume_oi_ratio < parameters.volumeOIRatioMin) {
      if (debug) console.log(`❌ Failed: vol/OI ratio ${optionData.volume_oi_ratio} < min ${parameters.volumeOIRatioMin}`);
      return false;
    }

    // Moneyness filter
    if (parameters.moneyness && parameters.moneyness !== 'any') {
      if (optionData.moneyness !== parameters.moneyness) {
        if (debug) console.log(`❌ Failed: moneyness ${optionData.moneyness} !== ${parameters.moneyness}`);
        return false;
      }
    }

    if (debug) console.log(`✅ MATCH! ${optionData.symbol}`);
    return true;
  }

  /**
   * Check if a stock matches the given parameters
   */
  matchesStockCriteria(stockData, parameters) {
    // Price checks (NEW parameter names: minPrice, maxPrice)
    if (parameters.minPrice && stockData.price < parameters.minPrice) return false;
    if (parameters.maxPrice && stockData.price > parameters.maxPrice) return false;

    // Volume checks (NEW: minVolume, maxVolume)
    if (parameters.minVolume && stockData.volume < parameters.minVolume) return false;
    if (parameters.maxVolume && stockData.volume > parameters.maxVolume) return false;

    // Market Cap checks (NEW: minMarketCap, maxMarketCap - in millions)
    if (parameters.minMarketCap && stockData.marketCap < parameters.minMarketCap * 1000000) return false;
    if (parameters.maxMarketCap && stockData.marketCap > parameters.maxMarketCap * 1000000) return false;

    // P/E Ratio checks (NEW: minPERatio, maxPERatio)
    if (parameters.minPERatio && (!stockData.pe || stockData.pe < parameters.minPERatio)) return false;
    if (parameters.maxPERatio && (!stockData.pe || stockData.pe > parameters.maxPERatio)) return false;

    // P/B Ratio checks (NEW: minPBRatio, maxPBRatio)
    if (parameters.minPBRatio && (!stockData.pb || stockData.pb < parameters.minPBRatio)) return false;
    if (parameters.maxPBRatio && (!stockData.pb || stockData.pb > parameters.maxPBRatio)) return false;

    // Current Ratio checks (NEW: minCurrentRatio, maxCurrentRatio)
    if (parameters.minCurrentRatio && (!stockData.currentRatio || stockData.currentRatio < parameters.minCurrentRatio)) return false;
    if (parameters.maxCurrentRatio && (!stockData.currentRatio || stockData.currentRatio > parameters.maxCurrentRatio)) return false;

    // Quick Ratio check (NEW: minQuickRatio)
    if (parameters.minQuickRatio && (!stockData.quickRatio || stockData.quickRatio < parameters.minQuickRatio)) return false;

    // Debt to Equity check (NEW: maxDebtToEquity)
    if (parameters.maxDebtToEquity && (!stockData.debtToEquity || stockData.debtToEquity > parameters.maxDebtToEquity)) return false;

    // ROE checks (NEW: minROE)
    if (parameters.minROE && (!stockData.roe || stockData.roe < parameters.minROE)) return false;

    // ROA checks (NEW: minROA)
    if (parameters.minROA && (!stockData.roa || stockData.roa < parameters.minROA)) return false;

    // Dividend Yield checks (NEW: minDividendYield, maxDividendYield)
    if (parameters.minDividendYield && (!stockData.dividendYield || stockData.dividendYield < parameters.minDividendYield)) return false;
    if (parameters.maxDividendYield && (!stockData.dividendYield || stockData.dividendYield > parameters.maxDividendYield)) return false;

    // Beta checks (NEW: minBeta, maxBeta)
    if (parameters.minBeta && (!stockData.beta || stockData.beta < parameters.minBeta)) return false;
    if (parameters.maxBeta && (!stockData.beta || stockData.beta > parameters.maxBeta)) return false;

    // RSI checks (NEW: minRSI, maxRSI)
    if (parameters.minRSI && (!stockData.rsi || stockData.rsi < parameters.minRSI)) return false;
    if (parameters.maxRSI && (!stockData.rsi || stockData.rsi > parameters.maxRSI)) return false;

    // Percent change checks (NEW: minPercentChange, maxPercentChange)
    if (parameters.minPercentChange && stockData.dayChangePercent < parameters.minPercentChange) return false;
    if (parameters.maxPercentChange && stockData.dayChangePercent > parameters.maxPercentChange) return false;

    // Country filter (NEW: country)
    if (parameters.country && stockData.country && stockData.country !== parameters.country) return false;

    // Sector filter (NEW: sector)
    if (parameters.sector && stockData.sector && stockData.sector !== parameters.sector) return false;

    // Legacy parameter support for backwards compatibility
    // OLD parameter names (keep for existing profiles)
    if (parameters.priceMin && stockData.price < parameters.priceMin) return false;
    if (parameters.priceMax && stockData.price > parameters.priceMax) return false;
    if (parameters.volumeMin && stockData.volume < parameters.volumeMin) return false;
    if (parameters.volumeMax && stockData.volume > parameters.volumeMax) return false;
    if (parameters.peMin && stockData.pe < parameters.peMin) return false;
    if (parameters.peMax && stockData.pe > parameters.peMax) return false;
    if (parameters.marketCapMin && stockData.marketCap < parameters.marketCapMin) return false;
    if (parameters.marketCapMax && stockData.marketCap > parameters.marketCapMax) return false;

    // All checks passed
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

      // Bar data is required, but quote can be null (when markets are closed)
      if (!bar) {
        return null;
      }

      const stockData = {
        symbol,
        price: (quote && quote.price) || bar.close, // Use quote price if available, otherwise use bar close
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
        const fundamentals = await this.getCachedFundamentals(symbol, db, parameters);
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
      // NEW parameter names
      parameters.minPERatio ||
      parameters.maxPERatio ||
      parameters.minPBRatio ||
      parameters.maxPBRatio ||
      parameters.minMarketCap ||
      parameters.maxMarketCap ||
      parameters.minDividendYield ||
      parameters.maxDividendYield ||
      parameters.minBeta ||
      parameters.maxBeta ||
      parameters.minCurrentRatio ||
      parameters.maxCurrentRatio ||
      parameters.minQuickRatio ||
      parameters.maxDebtToEquity ||
      parameters.minROE ||
      parameters.minROA ||
      parameters.country ||
      parameters.sector ||
      // Legacy parameter names (backwards compatibility)
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
   * Check if parameters require technical indicators (historical bars needed)
   * Note: minPercentChange/maxPercentChange are NOT included here because
   * daily % change can be calculated from the latest bar (free on Alpaca)
   * without needing historical SIP data
   */
  requiresTechnicals(parameters) {
    return !!(
      // NEW parameter names (only complex technicals requiring historical data)
      parameters.minRSI ||
      parameters.maxRSI ||
      // Legacy parameter names (backwards compatibility)
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
  async getCachedFundamentals(symbol, db, parameters = {}) {
    // Check if advanced fundamentals are needed (ROE, ROA, Current Ratio, etc.)
    const needsAdvanced = !!(
      parameters.minCurrentRatio ||
      parameters.maxCurrentRatio ||
      parameters.minQuickRatio ||
      parameters.maxDebtToEquity ||
      parameters.minROE ||
      parameters.minROA ||
      parameters.currentRatioMin // Legacy parameter
    );

    // Check cache first (24 hour TTL for fundamentals)
    const cacheType = needsAdvanced ? 'fundamentals_advanced' : 'fundamentals';
    const cached = db
      .prepare(
        `SELECT data, cached_at FROM market_data_cache
         WHERE symbol = ? AND data_type = ?
         AND expires_at > datetime('now')`
      )
      .get(symbol, cacheType);

    if (cached) {
      return JSON.parse(cached.data);
    }

    // Fetch fresh data
    try {
      let fundamentals;

      if (needsAdvanced) {
        // Fetch both basic and advanced fundamentals
        const [basic, advanced] = await Promise.all([
          getDataService().getFundamentals(symbol),
          getDataService().getAdvancedFundamentals(symbol)
        ]);

        // Merge both datasets
        fundamentals = { ...basic, ...advanced };
      } else {
        // Just fetch basic fundamentals
        fundamentals = await getDataService().getFundamentals(symbol);
      }

      // Cache for 24 hours
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      db.prepare(
        `INSERT OR REPLACE INTO market_data_cache (symbol, data_type, data, expires_at)
         VALUES (?, ?, ?, ?)`
      ).run(symbol, cacheType, JSON.stringify(fundamentals), expiresAt);

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
   * Uses custom watchlist from database, or default if not specified
   * Special watchlist ID "ALL_STOCKS" will fetch all tradable stocks from Alpaca
   */
  async getWatchlist(watchlistId, db) {
    try {
      // Special case: scan ALL stocks
      if (watchlistId === 'ALL_STOCKS') {
        console.log('Fetching ALL tradable stocks from Alpaca...');
        const allStocks = await this.getAllTradableStocks();
        console.log(`Found ${allStocks.length} tradable stocks`);
        return allStocks;
      }

      // If no watchlist specified, use the default watchlist
      let targetWatchlistId = watchlistId;

      if (!targetWatchlistId) {
        const defaultWatchlist = db.prepare('SELECT id FROM watchlists WHERE is_default = 1').get();
        if (defaultWatchlist) {
          targetWatchlistId = defaultWatchlist.id;
        } else {
          // Fallback: use first available watchlist
          const anyWatchlist = db.prepare('SELECT id FROM watchlists ORDER BY created_at ASC LIMIT 1').get();
          if (anyWatchlist) {
            targetWatchlistId = anyWatchlist.id;
          } else {
            console.warn('No watchlists found in database, returning empty array');
            return [];
          }
        }
      }

      // Get symbols from the watchlist
      const symbols = db.prepare('SELECT symbol FROM watchlist_symbols WHERE watchlist_id = ? ORDER BY symbol ASC').all(targetWatchlistId);

      // Check if this is a special watchlist
      if (symbols.length === 1 && symbols[0].symbol.startsWith('__SPECIAL__')) {
        const specialId = symbols[0].symbol.replace('__SPECIAL__', '').replace('__', '');
        console.log(`Detected special watchlist: ${specialId}`);
        return this.getWatchlist(specialId, db);  // Recursive call with special ID
      }

      const symbolArray = symbols.map(s => s.symbol);
      console.log(`Using watchlist ID ${targetWatchlistId} with ${symbolArray.length} symbols`);

      return symbolArray;
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      return [];
    }
  }

  /**
   * Get all tradable stocks from Alpaca
   * Returns array of stock symbols
   */
  async getAllTradableStocks() {
    try {
      const AlpacaService = require('./alpacaService');
      const assets = await AlpacaService.getAllAssets();

      // Filter for US stocks only (exclude crypto, forex, etc.)
      const stocks = assets
        .filter(asset =>
          asset.tradable &&
          asset.status === 'active' &&
          asset.class === 'us_equity' &&
          !asset.symbol.includes('/')  // Exclude forex pairs
        )
        .map(asset => asset.symbol)
        .sort();

      return stocks;
    } catch (error) {
      console.error('Error fetching all tradable stocks:', error);
      return [];
    }
  }
}

module.exports = new ScannerService();
