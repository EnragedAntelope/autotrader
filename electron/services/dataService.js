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
   * Get historical daily prices from Alpha Vantage
   * @param {string} symbol - Stock symbol
   * @param {string} outputsize - 'compact' (last 100 days) or 'full' (20+ years)
   * @returns {Promise<Array>} Array of {date, open, high, low, close, volume}
   */
  async getHistoricalPrices(symbol, outputsize = 'compact') {
    if (!this.alphaVantageKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    if (!this.rateLimiter) {
      throw new Error('DataService not initialized - call initialize(db) first');
    }

    return this.rateLimiter.executeRequest('alphaVantage', async () => {
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputsize}&apikey=${this.alphaVantageKey}`;
      const response = await axios.get(url);

      if (response.data.Note) {
        throw new Error('Alpha Vantage rate limit exceeded');
      }

      if (response.data.Error) {
        throw new Error(`Alpha Vantage Error: ${response.data.Error}`);
      }

      if (response.data['Information']) {
        throw new Error(`Alpha Vantage: ${response.data['Information']}`);
      }

      const timeSeries = response.data['Time Series (Daily)'];
      if (!timeSeries) {
        throw new Error('No historical data available');
      }

      // Convert to array format
      const prices = [];
      for (const [date, values] of Object.entries(timeSeries)) {
        prices.push({
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'])
        });
      }

      // Sort by date descending (most recent first)
      prices.sort((a, b) => new Date(b.date) - new Date(a.date));

      return prices;
    });
  }

  /**
   * Get income statement data from Alpha Vantage
   * @param {string} symbol - Stock symbol
   * @returns {Promise<Object>} Income statement data (annual and quarterly)
   */
  async getIncomeStatement(symbol) {
    if (!this.alphaVantageKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    if (!this.rateLimiter) {
      throw new Error('DataService not initialized - call initialize(db) first');
    }

    return this.rateLimiter.executeRequest('alphaVantage', async () => {
      const url = `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${this.alphaVantageKey}`;
      const response = await axios.get(url);

      if (response.data.Note) {
        throw new Error('Alpha Vantage rate limit exceeded');
      }

      if (response.data.Error) {
        throw new Error(`Alpha Vantage Error: ${response.data.Error}`);
      }

      return {
        symbol,
        annualReports: response.data.annualReports || [],
        quarterlyReports: response.data.quarterlyReports || []
      };
    });
  }

  /**
   * Get balance sheet data from Alpha Vantage
   * @param {string} symbol - Stock symbol
   * @returns {Promise<Object>} Balance sheet data (annual and quarterly)
   */
  async getBalanceSheet(symbol) {
    if (!this.alphaVantageKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    if (!this.rateLimiter) {
      throw new Error('DataService not initialized - call initialize(db) first');
    }

    return this.rateLimiter.executeRequest('alphaVantage', async () => {
      const url = `https://www.alphavantage.co/query?function=BALANCE_SHEET&symbol=${symbol}&apikey=${this.alphaVantageKey}`;
      const response = await axios.get(url);

      if (response.data.Note) {
        throw new Error('Alpha Vantage rate limit exceeded');
      }

      if (response.data.Error) {
        throw new Error(`Alpha Vantage Error: ${response.data.Error}`);
      }

      return {
        symbol,
        annualReports: response.data.annualReports || [],
        quarterlyReports: response.data.quarterlyReports || []
      };
    });
  }

  /**
   * Get cash flow data from Alpha Vantage
   * @param {string} symbol - Stock symbol
   * @returns {Promise<Object>} Cash flow data (annual and quarterly)
   */
  async getCashFlow(symbol) {
    if (!this.alphaVantageKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    if (!this.rateLimiter) {
      throw new Error('DataService not initialized - call initialize(db) first');
    }

    return this.rateLimiter.executeRequest('alphaVantage', async () => {
      const url = `https://www.alphavantage.co/query?function=CASH_FLOW&symbol=${symbol}&apikey=${this.alphaVantageKey}`;
      const response = await axios.get(url);

      if (response.data.Note) {
        throw new Error('Alpha Vantage rate limit exceeded');
      }

      if (response.data.Error) {
        throw new Error(`Alpha Vantage Error: ${response.data.Error}`);
      }

      return {
        symbol,
        annualReports: response.data.annualReports || [],
        quarterlyReports: response.data.quarterlyReports || []
      };
    });
  }

  /**
   * Calculate advanced fundamental metrics from financial statements
   * @param {string} symbol - Stock symbol
   * @returns {Promise<Object>} Calculated ratios (ROE, ROA, Current Ratio, etc.)
   */
  async getAdvancedFundamentals(symbol) {
    try {
      const [incomeStatement, balanceSheet] = await Promise.all([
        this.getIncomeStatement(symbol),
        this.getBalanceSheet(symbol)
      ]);

      // Get most recent annual reports
      const latestIncome = incomeStatement.annualReports[0] || {};
      const latestBalance = balanceSheet.annualReports[0] || {};

      // Calculate ratios
      const netIncome = parseFloat(latestIncome.netIncome) || 0;
      const totalAssets = parseFloat(latestBalance.totalAssets) || 0;
      const shareholderEquity = parseFloat(latestBalance.totalShareholderEquity) || 0;
      const currentAssets = parseFloat(latestBalance.totalCurrentAssets) || 0;
      const currentLiabilities = parseFloat(latestBalance.totalCurrentLiabilities) || 0;
      const totalDebt = parseFloat(latestBalance.shortLongTermDebtTotal) || parseFloat(latestBalance.longTermDebt) || 0;
      const inventory = parseFloat(latestBalance.inventory) || 0;

      return {
        symbol,
        // Return on Equity (ROE)
        roe: shareholderEquity !== 0 ? ((netIncome / shareholderEquity) * 100) : 0,
        // Return on Assets (ROA)
        roa: totalAssets !== 0 ? ((netIncome / totalAssets) * 100) : 0,
        // Current Ratio
        currentRatio: currentLiabilities !== 0 ? (currentAssets / currentLiabilities) : 0,
        // Quick Ratio (Acid Test)
        quickRatio: currentLiabilities !== 0 ? ((currentAssets - inventory) / currentLiabilities) : 0,
        // Debt to Equity
        debtToEquity: shareholderEquity !== 0 ? (totalDebt / shareholderEquity) : 0,
        // Raw values for reference
        netIncome,
        totalAssets,
        shareholderEquity,
        currentAssets,
        currentLiabilities,
        totalDebt
      };
    } catch (error) {
      console.error(`Error calculating advanced fundamentals for ${symbol}:`, error);
      // Return zeros if calculation fails
      return {
        symbol,
        roe: 0,
        roa: 0,
        currentRatio: 0,
        quickRatio: 0,
        debtToEquity: 0
      };
    }
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
