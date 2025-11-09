/**
 * Backtesting Service
 *
 * Tests screening profiles against historical data to evaluate performance
 */

const AlpacaService = require('./alpacaService');
const DataService = require('./dataService');

class BacktestService {
  constructor() {
    this.cache = new Map();
    this.priceCache = new Map(); // Cache for historical prices
    this.useRealData = false; // Will be set based on API availability
  }

  /**
   * Initialize backtest service and check data availability
   */
  async initialize() {
    try {
      // Check if Alpha Vantage API is configured for real historical data
      this.useRealData = !!process.env.ALPHA_VANTAGE_API_KEY;
      if (this.useRealData) {
        console.log('✓ Alpha Vantage API key detected - using REAL historical data');
      } else {
        console.log('⚠ No Alpha Vantage API key - using SIMULATED data');
      }
    } catch (error) {
      console.warn('Error checking API availability:', error);
      this.useRealData = false;
    }
  }

  /**
   * Run backtest for a screening profile
   * @param {Object} profile - Screening profile to test
   * @param {Date} startDate - Backtest start date
   * @param {Date} endDate - Backtest end date
   * @param {number} initialCapital - Starting capital
   * @param {number} positionSize - Amount per trade
   * @returns {Object} Backtest results with performance metrics
   */
  async runBacktest(profile, startDate, endDate, initialCapital = 10000, positionSize = 1000) {
    await this.initialize();

    console.log(`\nRunning backtest for "${profile.name}"`);
    console.log(`Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log(`Initial Capital: $${initialCapital}, Position Size: $${positionSize}`);
    console.log(`Data Mode: ${this.useRealData ? 'REAL (Alpha Vantage)' : 'SIMULATED (Random)'}\n`);

    const trades = [];
    let capital = initialCapital;
    let positions = [];

    // Iterate through time period (weekly scans for performance)
    const currentDate = new Date(startDate);
    const scanInterval = 7; // Days between scans

    while (currentDate <= endDate) {
      console.log(`Scanning ${currentDate.toISOString().split('T')[0]}...`);

      // Close any positions that hit stop-loss or take-profit
      positions = await this.updatePositions(positions, currentDate, trades);

      // Check if we have capital for new positions
      if (capital >= positionSize && positions.length < 10) {
        // Get scan matches for this date
        const matches = await this.scanOnDate(profile, currentDate);

        if (matches.length > 0) {
          // Take first match as trade
          const signal = matches[0];
          const quantity = Math.floor(positionSize / signal.price);

          if (quantity > 0) {
            const position = {
              symbol: signal.symbol,
              entryDate: new Date(currentDate),
              entryPrice: signal.price,
              quantity: quantity,
              cost: quantity * signal.price,
              stopLoss: signal.price * 0.95, // 5% stop-loss
              takeProfit: signal.price * 1.15, // 15% take-profit
            };

            positions.push(position);
            capital -= position.cost;

            console.log(`  ✓ BUY ${quantity} ${signal.symbol} @ $${signal.price.toFixed(2)}`);
          }
        }
      }

      // Advance date
      currentDate.setDate(currentDate.getDate() + scanInterval);
    }

    // Close all remaining positions at end date
    for (const position of positions) {
      const exitPrice = await this.getPriceOnDate(position.symbol, endDate);
      const pl = (exitPrice - position.entryPrice) * position.quantity;

      trades.push({
        symbol: position.symbol,
        entryDate: position.entryDate,
        exitDate: endDate,
        entryPrice: position.entryPrice,
        exitPrice: exitPrice,
        quantity: position.quantity,
        profitLoss: pl,
        profitLossPercent: ((exitPrice - position.entryPrice) / position.entryPrice) * 100,
        holdingDays: Math.floor((endDate - position.entryDate) / (1000 * 60 * 60 * 24)),
      });

      capital += exitPrice * position.quantity;
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(trades, initialCapital, capital);

    console.log('\n=== Backtest Results ===');
    console.log(`Data Source: ${this.useRealData ? 'REAL (Alpha Vantage)' : 'SIMULATED (Random)'}`);
    console.log(`Total Trades: ${metrics.totalTrades}`);
    console.log(`Win Rate: ${metrics.winRate.toFixed(2)}%`);
    console.log(`Total P/L: $${metrics.totalProfitLoss.toFixed(2)}`);
    console.log(`Return: ${metrics.returnPercent.toFixed(2)}%`);
    console.log(`Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}`);
    console.log(`Max Drawdown: ${metrics.maxDrawdown.toFixed(2)}%`);

    return {
      profile: profile.name,
      startDate,
      endDate,
      initialCapital,
      finalCapital: capital,
      trades,
      metrics,
      dataSource: this.useRealData ? 'real' : 'simulated',
    };
  }

  /**
   * Get historical price data for a symbol
   * Caches data to minimize API calls
   */
  async getHistoricalPrices(symbol) {
    const cacheKey = symbol;

    if (this.priceCache.has(cacheKey)) {
      return this.priceCache.get(cacheKey);
    }

    if (this.useRealData) {
      try {
        // Fetch real historical data from Alpha Vantage
        const prices = await DataService.getHistoricalPrices(symbol, 'full');
        this.priceCache.set(cacheKey, prices);
        return prices;
      } catch (error) {
        console.warn(`Failed to fetch real data for ${symbol}, falling back to simulation:`, error.message);
        // Fall back to simulated data on error
        return null;
      }
    }

    return null; // No real data available
  }

  /**
   * Get price on a specific date (or closest available date)
   */
  async getPriceOnDate(symbol, targetDate) {
    const prices = await this.getHistoricalPrices(symbol);

    if (prices && prices.length > 0) {
      // Find closest date
      const targetTime = targetDate.getTime();
      let closestPrice = prices[0];
      let minDiff = Math.abs(new Date(prices[0].date).getTime() - targetTime);

      for (const price of prices) {
        const diff = Math.abs(new Date(price.date).getTime() - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestPrice = price;
        }
      }

      return closestPrice.close;
    }

    // Fallback to simulated price
    return 100 + Math.random() * 300;
  }

  /**
   * Scan for matches on a specific historical date
   */
  async scanOnDate(profile, date) {
    // Get symbols to scan from profile's watchlist
    const symbols = this.getSymbolsFromProfile(profile);
    const matches = [];

    for (const symbol of symbols.slice(0, 5)) { // Limit to 5 stocks to reduce API calls
      const price = await this.getPriceOnDate(symbol, date);

      if (price) {
        // Simple filtering - in real implementation would apply full profile criteria
        // For now, 30% probability of match to simulate hit rate
        if (Math.random() < 0.3) {
          matches.push({
            symbol,
            price,
            volume: 1000000 + Math.random() * 10000000,
          });
        }
      }
    }

    return matches;
  }

  /**
   * Get symbols from profile
   */
  getSymbolsFromProfile(profile) {
    // Default symbols if profile doesn't specify
    return ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'AMD', 'NFLX', 'DIS'];
  }

  /**
   * Update open positions and close if stop-loss/take-profit hit
   */
  async updatePositions(positions, currentDate, trades) {
    const remaining = [];

    for (const position of positions) {
      // Get real or simulated price for this date
      const currentPrice = await this.getPriceOnDate(position.symbol, currentDate);

      // Check stop-loss
      if (currentPrice <= position.stopLoss) {
        const pl = (position.stopLoss - position.entryPrice) * position.quantity;
        trades.push({
          symbol: position.symbol,
          entryDate: position.entryDate,
          exitDate: new Date(currentDate),
          entryPrice: position.entryPrice,
          exitPrice: position.stopLoss,
          quantity: position.quantity,
          profitLoss: pl,
          profitLossPercent: ((position.stopLoss - position.entryPrice) / position.entryPrice) * 100,
          reason: 'stop_loss',
          holdingDays: Math.floor((currentDate - position.entryDate) / (1000 * 60 * 60 * 24)),
        });
        console.log(`  🛑 STOP-LOSS: ${position.symbol} @ $${position.stopLoss.toFixed(2)} (${pl.toFixed(2)})`);
        continue;
      }

      // Check take-profit
      if (currentPrice >= position.takeProfit) {
        const pl = (position.takeProfit - position.entryPrice) * position.quantity;
        trades.push({
          symbol: position.symbol,
          entryDate: position.entryDate,
          exitDate: new Date(currentDate),
          entryPrice: position.entryPrice,
          exitPrice: position.takeProfit,
          quantity: position.quantity,
          profitLoss: pl,
          profitLossPercent: ((position.takeProfit - position.entryPrice) / position.entryPrice) * 100,
          reason: 'take_profit',
          holdingDays: Math.floor((currentDate - position.entryDate) / (1000 * 60 * 60 * 24)),
        });
        console.log(`  ✅ TAKE-PROFIT: ${position.symbol} @ $${position.takeProfit.toFixed(2)} (+${pl.toFixed(2)})`);
        continue;
      }

      // Position still open
      remaining.push(position);
    }

    return remaining;
  }

  /**
   * Calculate performance metrics from trades
   */
  calculateMetrics(trades, initialCapital, finalCapital) {
    const totalTrades = trades.length;

    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalProfitLoss: 0,
        returnPercent: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        avgHoldingDays: 0,
      };
    }

    const winningTrades = trades.filter((t) => t.profitLoss > 0);
    const losingTrades = trades.filter((t) => t.profitLoss <= 0);

    const totalProfitLoss = trades.reduce((sum, t) => sum + t.profitLoss, 0);
    const totalWins = winningTrades.reduce((sum, t) => sum + t.profitLoss, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.profitLoss, 0));

    const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    // Calculate Sharpe Ratio (simplified)
    const returns = trades.map((t) => t.profitLossPercent);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev !== 0 ? avgReturn / stdDev : 0;

    // Calculate Max Drawdown
    let peak = initialCapital;
    let maxDrawdown = 0;
    let runningCapital = initialCapital;

    for (const trade of trades) {
      runningCapital += trade.profitLoss;
      if (runningCapital > peak) {
        peak = runningCapital;
      }
      const drawdown = ((peak - runningCapital) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    const avgHoldingDays =
      trades.reduce((sum, t) => sum + t.holdingDays, 0) / totalTrades;

    return {
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / totalTrades) * 100,
      totalProfitLoss,
      returnPercent: ((finalCapital - initialCapital) / initialCapital) * 100,
      avgWin,
      avgLoss,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      avgHoldingDays,
    };
  }
}

module.exports = new BacktestService();
