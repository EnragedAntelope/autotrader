const alpacaService = require('./alpacaService');
const axios = require('axios');
const RateLimiter = require('../utils/rateLimiter');

/**
 * Data Service - Aggregates market data from multiple sources
 * Handles rate limiting and caching
 */

class DataService {
  constructor() {
    this.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    this.rateLimiter = null; // Will be initialized with database
  }

  /**
   * Initialize the data service with database connection
   * This allows us to load rate limit configuration from database
   */
  initialize(db) {
    this.rateLimiter = new RateLimiter(db);
    console.log('DataService initialized with rate limiter');
  }

  /**
   * Get comprehensive market data for a symbol
   */
  async getMarketData(symbol) {
    try {
      // Get real-time data from Alpaca
      const [quote, bar, asset] = await Promise.all([
        alpacaService.getQuote(symbol).catch(() => null),
        alpacaService.getLatestBar(symbol).catch(() => null),
        alpacaService.getAsset(symbol).catch(() => null),
      ]);

      return {
        symbol,
        quote,
        bar,
        asset,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Error getting market data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get fundamental data from Alpha Vantage (with rate limiting)
   */
  async getFundamentals(symbol) {
    if (!this.alphaVantageKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    if (!this.rateLimiter) {
      throw new Error('DataService not initialized - call initialize(db) first');
    }

    // Use rate limiter to execute request
    return this.rateLimiter.executeRequest('alphaVantage', async () => {
      const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${this.alphaVantageKey}`;
      const response = await axios.get(url);

      if (response.data.Note) {
        throw new Error('Alpha Vantage rate limit exceeded');
      }

      const data = response.data;
      return {
        symbol,
        marketCap: parseFloat(data.MarketCapitalization) || 0,
        pe: parseFloat(data.PERatio) || 0,
        pb: parseFloat(data.PriceToBookRatio) || 0,
        eps: parseFloat(data.EPS) || 0,
        dividendYield: parseFloat(data.DividendYield) || 0,
        beta: parseFloat(data.Beta) || 0,
        week52High: parseFloat(data['52WeekHigh']) || 0,
        week52Low: parseFloat(data['52WeekLow']) || 0,
        sector: data.Sector || '',
        industry: data.Industry || '',
        description: data.Description || '',
      };
    });
  }

  /**
   * Get rate limit status for all providers
   */
  getRateLimitStatus() {
    if (!this.rateLimiter) {
      return {
        alpaca: { error: 'Not initialized' },
        alphaVantage: { error: 'Not initialized' },
      };
    }
    return this.rateLimiter.getStatus();
  }

  /**
   * Update rate limit configuration
   * @param {string} provider - 'alpaca' or 'alphaVantage'
   * @param {Object} settings - { maxPerMinute, maxPerDay }
   */
  updateRateLimits(provider, settings) {
    if (!this.rateLimiter) {
      throw new Error('DataService not initialized');
    }
    return this.rateLimiter.saveConfiguration(provider, settings);
  }

  /**
   * Calculate technical indicators
   * This is a placeholder - implement actual calculations in Phase 3
   */
  async getTechnicalIndicators(symbol) {
    // TODO: Implement RSI, MACD, SMA, Bollinger Bands calculations
    // For now, return placeholder data
    return {
      symbol,
      rsi: 50,
      macd: { value: 0, signal: 0, histogram: 0 },
      sma20: 0,
      sma50: 0,
      sma200: 0,
      bollingerBands: { upper: 0, middle: 0, lower: 0 },
    };
  }
}

module.exports = new DataService();
