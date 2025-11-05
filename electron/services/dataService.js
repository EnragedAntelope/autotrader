const alpacaService = require('./alpacaService');
const axios = require('axios');

/**
 * Data Service - Aggregates market data from multiple sources
 * Handles rate limiting and caching
 */

class DataService {
  constructor() {
    this.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    this.requestQueue = [];
    this.rateLimits = {
      alphaVantage: {
        requests: 0,
        resetTime: Date.now() + 60000, // Reset every minute
        maxPerMinute: 5,
        maxPerDay: 25,
        dailyRequests: 0,
        dailyResetTime: Date.now() + 86400000, // 24 hours
      },
    };
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

    // Check rate limits
    this.checkAlphaVantageRateLimit();

    try {
      const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${this.alphaVantageKey}`;
      const response = await axios.get(url);

      this.incrementAlphaVantageRequests();

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
    } catch (error) {
      console.error(`Error getting fundamentals for ${symbol}:`, error);
      throw error;
    }
  }

  checkAlphaVantageRateLimit() {
    const now = Date.now();
    const limits = this.rateLimits.alphaVantage;

    // Reset minute counter
    if (now > limits.resetTime) {
      limits.requests = 0;
      limits.resetTime = now + 60000;
    }

    // Reset daily counter
    if (now > limits.dailyResetTime) {
      limits.dailyRequests = 0;
      limits.dailyResetTime = now + 86400000;
    }

    // Check limits
    if (limits.requests >= limits.maxPerMinute) {
      throw new Error('Alpha Vantage rate limit: Max requests per minute exceeded');
    }

    if (limits.dailyRequests >= limits.maxPerDay) {
      throw new Error('Alpha Vantage rate limit: Max requests per day exceeded');
    }
  }

  incrementAlphaVantageRequests() {
    this.rateLimits.alphaVantage.requests++;
    this.rateLimits.alphaVantage.dailyRequests++;
  }

  getRateLimitStatus() {
    return {
      alphaVantage: {
        requestsThisMinute: this.rateLimits.alphaVantage.requests,
        requestsToday: this.rateLimits.alphaVantage.dailyRequests,
        maxPerMinute: this.rateLimits.alphaVantage.maxPerMinute,
        maxPerDay: this.rateLimits.alphaVantage.maxPerDay,
      },
    };
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
