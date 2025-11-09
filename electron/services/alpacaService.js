const Alpaca = require('@alpacahq/alpaca-trade-api');

/**
 * Alpaca Trading API Service
 * Handles all interactions with Alpaca API for account info, market data, and trading
 */

class AlpacaService {
  constructor() {
    this.mode = process.env.TRADING_MODE || 'paper';
    this.initializeClient();
  }

  initializeClient() {
    const isPaper = this.mode === 'paper';

    // Select appropriate API keys based on mode
    const apiKey = isPaper
      ? process.env.ALPACA_PAPER_API_KEY
      : process.env.ALPACA_LIVE_API_KEY;

    const apiSecret = isPaper
      ? process.env.ALPACA_PAPER_SECRET_KEY
      : process.env.ALPACA_LIVE_SECRET_KEY;

    if (!apiKey || !apiSecret) {
      throw new Error(
        `Missing Alpaca API credentials for ${this.mode} mode. Please check your .env file.`
      );
    }

    this.client = new Alpaca({
      keyId: apiKey,
      secretKey: apiSecret,
      paper: isPaper,
      usePolygon: false, // Use Alpaca data feed
    });

    console.log(`Alpaca client initialized in ${this.mode} mode`);
  }

  switchMode(newMode) {
    if (newMode !== this.mode) {
      this.mode = newMode;
      this.initializeClient();
      console.log(`Switched to ${newMode} mode`);
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo() {
    try {
      const account = await this.client.getAccount();
      return {
        id: account.id,
        cash: parseFloat(account.cash),
        buying_power: parseFloat(account.buying_power),
        portfolio_value: parseFloat(account.portfolio_value),
        equity: parseFloat(account.equity),
        last_equity: parseFloat(account.last_equity),
        pattern_day_trader: account.pattern_day_trader,
        trading_blocked: account.trading_blocked,
        account_blocked: account.account_blocked,
        status: account.status,
        currency: account.currency,
        daytrade_count: account.daytrade_count,
        mode: this.mode,
      };
    } catch (error) {
      console.error('Error fetching account info:', error);
      throw new Error(`Failed to get account info: ${error.message}`);
    }
  }

  /**
   * Check if market is open
   */
  async isMarketOpen() {
    try {
      const clock = await this.client.getClock();
      return clock.is_open;
    } catch (error) {
      console.error('Error checking market status:', error);
      return false;
    }
  }

  /**
   * Get market clock info
   */
  async getMarketClock() {
    try {
      const clock = await this.client.getClock();
      return {
        is_open: clock.is_open,
        timestamp: clock.timestamp,
        next_open: clock.next_open,
        next_close: clock.next_close,
      };
    } catch (error) {
      console.error('Error getting market clock:', error);
      throw error;
    }
  }

  /**
   * Get latest quote for a symbol
   * Returns null when markets are closed instead of throwing (scanner will use bar close price)
   */
  async getQuote(symbol) {
    try {
      const quote = await this.client.getLatestTrade(symbol);
      return {
        symbol,
        price: quote.p,
        size: quote.s,
        timestamp: quote.t,
      };
    } catch (error) {
      // When markets are closed, trade data may not be available
      // Return null so scanner can fall back to bar close price
      console.log(`No recent trade data for ${symbol} (market may be closed)`);
      return null;
    }
  }

  /**
   * Get latest bar data (OHLCV)
   * Handles both paid (SIP) and free (IEX) tier subscriptions
   * Looks back multiple bars to handle closed markets (weekends, holidays)
   */
  async getLatestBar(symbol) {
    try {
      // First, try the paid tier method (SIP with date range)
      // This works best but requires paid subscription
      try {
        const end = new Date();
        const start = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

        const bars = await this.client.getBarsV2(symbol, {
          start: start.toISOString().split('T')[0], // Format as YYYY-MM-DD
          end: end.toISOString().split('T')[0],
          limit: 1,
          timeframe: '1Day',
        });

        const barArray = [];
        for await (let bar of bars) {
          barArray.push(bar);
        }

        if (barArray.length > 0) {
          const latestBar = barArray[0];
          return {
            symbol,
            open: latestBar.OpenPrice,
            high: latestBar.HighPrice,
            low: latestBar.LowPrice,
            close: latestBar.ClosePrice,
            volume: latestBar.Volume,
            timestamp: latestBar.Timestamp,
          };
        }
      } catch (sipError) {
        // If we get 403, user has free tier - fall through to IEX method
        if (!sipError.message || !sipError.message.includes('403')) {
          throw sipError; // Re-throw if not a subscription error
        }
        // Continue to free tier fallback below
      }

      // Free tier fallback: Use IEX feed with higher limit
      // Get last 10 bars to ensure we have data even when markets closed
      const bars = await this.client.getBarsV2(symbol, {
        limit: 10,
        timeframe: '1Day',
        feed: 'iex', // Free tier IEX data
      });

      const barArray = [];
      for await (let bar of bars) {
        barArray.push(bar);
      }

      if (barArray.length === 0) {
        throw new Error(`No bar data found for ${symbol} (tried both SIP and IEX feeds)`);
      }

      // Return the most recent bar (first in array, sorted descending)
      const latestBar = barArray[0];
      return {
        symbol,
        open: latestBar.OpenPrice,
        high: latestBar.HighPrice,
        low: latestBar.LowPrice,
        close: latestBar.ClosePrice,
        volume: latestBar.Volume,
        timestamp: latestBar.Timestamp,
      };
    } catch (error) {
      console.error(`Error getting bar data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get historical bars
   * Handles both paid (SIP) and free (IEX) tier subscriptions
   */
  async getHistoricalBars(symbol, options = {}) {
    try {
      const {
        start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        end = new Date().toISOString(),
        timeframe = '1Day',
        limit = 100,
      } = options;

      // Try paid tier first (with date range)
      try {
        const bars = await this.client.getBarsV2(symbol, {
          start,
          end,
          timeframe,
          limit,
        });

        const barArray = [];
        for await (let bar of bars) {
          barArray.push({
            timestamp: bar.Timestamp,
            open: bar.OpenPrice,
            high: bar.HighPrice,
            low: bar.LowPrice,
            close: bar.ClosePrice,
            volume: bar.Volume,
          });
        }

        if (barArray.length > 0) {
          return barArray;
        }
      } catch (sipError) {
        // If 403, fall through to IEX
        if (!sipError.message || !sipError.message.includes('403')) {
          throw sipError;
        }
      }

      // Free tier fallback: Use IEX feed with limit only (no date range)
      const bars = await this.client.getBarsV2(symbol, {
        timeframe,
        limit,
        feed: 'iex',
      });

      const barArray = [];
      for await (let bar of bars) {
        barArray.push({
          timestamp: bar.Timestamp,
          open: bar.OpenPrice,
          high: bar.HighPrice,
          low: bar.LowPrice,
          close: bar.ClosePrice,
          volume: bar.Volume,
        });
      }

      return barArray;
    } catch (error) {
      console.error(`Error getting historical bars for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Submit an order
   */
  async submitOrder(orderParams) {
    try {
      const {
        symbol,
        qty,
        side,
        type = 'market',
        time_in_force = 'day',
        limit_price,
        stop_price,
        trail_percent,
      } = orderParams;

      const order = {
        symbol,
        qty,
        side,
        type,
        time_in_force,
      };

      // Add price parameters based on order type
      if (type === 'limit' && limit_price) {
        order.limit_price = limit_price;
      }

      if (type === 'stop' && stop_price) {
        order.stop_price = stop_price;
      }

      if (type === 'stop_limit' && limit_price && stop_price) {
        order.limit_price = limit_price;
        order.stop_price = stop_price;
      }

      if (type === 'trailing_stop' && trail_percent) {
        order.trail_percent = trail_percent;
      }

      const result = await this.client.createOrder(order);

      return {
        id: result.id,
        client_order_id: result.client_order_id,
        symbol: result.symbol,
        qty: result.qty,
        side: result.side,
        type: result.type,
        status: result.status,
        filled_qty: result.filled_qty,
        filled_avg_price: result.filled_avg_price,
        submitted_at: result.submitted_at,
        limit_price: result.limit_price,
        stop_price: result.stop_price,
      };
    } catch (error) {
      console.error('Error submitting order:', error);
      throw new Error(`Order submission failed: ${error.message}`);
    }
  }

  /**
   * Get order status
   */
  async getOrder(orderId) {
    try {
      const order = await this.client.getOrder(orderId);
      return {
        id: order.id,
        status: order.status,
        filled_qty: order.filled_qty,
        filled_avg_price: order.filled_avg_price,
        symbol: order.symbol,
        qty: order.qty,
        side: order.side,
      };
    } catch (error) {
      console.error(`Error getting order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId) {
    try {
      await this.client.cancelOrder(orderId);
      return { success: true, orderId };
    } catch (error) {
      console.error(`Error cancelling order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get all open positions
   */
  async getPositions() {
    try {
      const positions = await this.client.getPositions();
      return positions.map((pos) => ({
        symbol: pos.symbol,
        qty: parseInt(pos.qty),
        avg_entry_price: parseFloat(pos.avg_entry_price),
        current_price: parseFloat(pos.current_price),
        market_value: parseFloat(pos.market_value),
        cost_basis: parseFloat(pos.cost_basis),
        unrealized_pl: parseFloat(pos.unrealized_pl),
        unrealized_plpc: parseFloat(pos.unrealized_plpc),
        side: pos.side,
      }));
    } catch (error) {
      console.error('Error getting positions:', error);
      throw error;
    }
  }

  /**
   * Get single position
   */
  async getPosition(symbol) {
    try {
      const pos = await this.client.getPosition(symbol);
      return {
        symbol: pos.symbol,
        qty: parseInt(pos.qty),
        avg_entry_price: parseFloat(pos.avg_entry_price),
        current_price: parseFloat(pos.current_price),
        market_value: parseFloat(pos.market_value),
        cost_basis: parseFloat(pos.cost_basis),
        unrealized_pl: parseFloat(pos.unrealized_pl),
        unrealized_plpc: parseFloat(pos.unrealized_plpc),
        side: pos.side,
      };
    } catch (error) {
      // Position doesn't exist - not necessarily an error
      if (error.message && error.message.includes('position does not exist')) {
        return null;
      }
      console.error(`Error getting position for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Close a position
   */
  async closePosition(symbol, qty = null) {
    try {
      const result = await this.client.closePosition(symbol, { qty });
      return {
        success: true,
        symbol,
        order_id: result.id,
      };
    } catch (error) {
      console.error(`Error closing position for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get asset information
   */
  async getAsset(symbol) {
    try {
      const asset = await this.client.getAsset(symbol);
      return {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        exchange: asset.exchange,
        status: asset.status,
        tradable: asset.tradable,
        marginable: asset.marginable,
        shortable: asset.shortable,
        easy_to_borrow: asset.easy_to_borrow,
        fractionable: asset.fractionable,
      };
    } catch (error) {
      console.error(`Error getting asset info for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get all active tradable assets
   * Returns complete list of stocks available for trading
   */
  async getAllAssets() {
    try {
      const assets = await this.client.getAssets({ status: 'active' });
      return assets.map((asset) => ({
        symbol: asset.symbol,
        name: asset.name,
        exchange: asset.exchange,
        class: asset.class,
        status: asset.status,
        tradable: asset.tradable,
        marginable: asset.marginable,
        shortable: asset.shortable,
        easy_to_borrow: asset.easy_to_borrow,
        fractionable: asset.fractionable,
      }));
    } catch (error) {
      console.error('Error getting all assets:', error);
      throw error;
    }
  }

  /**
   * Search for assets
   */
  async searchAssets(query) {
    try {
      const assets = await this.client.getAssets({ status: 'active' });
      // Filter assets that match the query
      return assets
        .filter(
          (asset) =>
            asset.tradable &&
            (asset.symbol.toLowerCase().includes(query.toLowerCase()) ||
              asset.name.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 20) // Limit results
        .map((asset) => ({
          symbol: asset.symbol,
          name: asset.name,
          exchange: asset.exchange,
        }));
    } catch (error) {
      console.error('Error searching assets:', error);
      throw error;
    }
  }

  /**
   * Get option contracts for an underlying symbol
   * @param {string} underlying - The underlying symbol (e.g., 'AAPL')
   * @param {Object} filters - Optional filters
   * @param {string} filters.type - 'call' or 'put'
   * @param {Date} filters.expiration_date_gte - Min expiration date
   * @param {Date} filters.expiration_date_lte - Max expiration date
   * @param {number} filters.strike_price_gte - Min strike price
   * @param {number} filters.strike_price_lte - Max strike price
   */
  async getOptionContracts(underlying, filters = {}) {
    try {
      // Alpaca options API endpoint
      // Format: GET /v2/options/contracts?underlying_symbols=AAPL&type=call
      const params = {
        underlying_symbols: underlying,
        status: 'active',
        ...filters,
      };

      // Note: The @alpacahq/alpaca-trade-api package may not have direct option methods yet
      // We'll use the REST API directly via axios
      const axios = require('axios');
      const baseUrl = this.mode === 'paper'
        ? 'https://paper-api.alpaca.markets'
        : 'https://api.alpaca.markets';

      const apiKey = this.mode === 'paper'
        ? process.env.ALPACA_PAPER_API_KEY
        : process.env.ALPACA_LIVE_API_KEY;

      const apiSecret = this.mode === 'paper'
        ? process.env.ALPACA_PAPER_SECRET_KEY
        : process.env.ALPACA_LIVE_SECRET_KEY;

      const response = await axios.get(`${baseUrl}/v2/options/contracts`, {
        params,
        headers: {
          'APCA-API-KEY-ID': apiKey,
          'APCA-API-SECRET-KEY': apiSecret,
        },
      });

      return response.data.option_contracts || [];
    } catch (error) {
      console.error(`Error getting option contracts for ${underlying}:`, error);
      // If options API not available, return empty array
      if (error.response && error.response.status === 404) {
        console.warn('Options API not available for this account');
        return [];
      }
      throw error;
    }
  }

  /**
   * Get option chain with Greeks for a specific underlying
   * @param {string} underlying - The underlying symbol
   * @param {Object} options - Query options
   * @param {Date} options.expiration - Specific expiration date
   */
  async getOptionChain(underlying, options = {}) {
    try {
      const axios = require('axios');
      const baseUrl = this.mode === 'paper'
        ? 'https://data.alpaca.markets'
        : 'https://data.alpaca.markets';

      const apiKey = this.mode === 'paper'
        ? process.env.ALPACA_PAPER_API_KEY
        : process.env.ALPACA_LIVE_API_KEY;

      const apiSecret = this.mode === 'paper'
        ? process.env.ALPACA_PAPER_SECRET_KEY
        : process.env.ALPACA_LIVE_SECRET_KEY;

      const params = {
        underlying_symbol: underlying,
        ...options,
      };

      const response = await axios.get(`${baseUrl}/v1beta1/options/snapshots/${underlying}`, {
        params,
        headers: {
          'APCA-API-KEY-ID': apiKey,
          'APCA-API-SECRET-KEY': apiSecret,
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Error getting option chain for ${underlying}:`, error);
      if (error.response && error.response.status === 404) {
        console.warn('Option chain data not available for this account/symbol');
        return null;
      }
      throw error;
    }
  }

  /**
   * Get latest option quote with Greeks
   * @param {string} optionSymbol - The option contract symbol
   */
  async getOptionQuote(optionSymbol) {
    try {
      const axios = require('axios');
      const baseUrl = 'https://data.alpaca.markets';

      const apiKey = this.mode === 'paper'
        ? process.env.ALPACA_PAPER_API_KEY
        : process.env.ALPACA_LIVE_API_KEY;

      const apiSecret = this.mode === 'paper'
        ? process.env.ALPACA_PAPER_SECRET_KEY
        : process.env.ALPACA_LIVE_SECRET_KEY;

      const response = await axios.get(`${baseUrl}/v1beta1/options/snapshots/${optionSymbol}`, {
        headers: {
          'APCA-API-KEY-ID': apiKey,
          'APCA-API-SECRET-KEY': apiSecret,
        },
      });

      const snapshot = response.data.snapshot;
      return {
        symbol: optionSymbol,
        latest_trade: snapshot.latestTrade,
        latest_quote: snapshot.latestQuote,
        greeks: snapshot.greeks,
        implied_volatility: snapshot.impliedVolatility,
      };
    } catch (error) {
      // Handle 400 (invalid symbol) and 404 (not found) gracefully - these are expected
      // when option contracts don't have snapshot data available
      if (error.response && (error.response.status === 400 || error.response.status === 404)) {
        // Silently return null - not all option contracts have snapshot data
        return null;
      }
      // Handle 429 (rate limit) gracefully
      if (error.response && error.response.status === 429) {
        console.warn(`Rate limit hit for ${optionSymbol}, skipping...`);
        return null;
      }
      // Only log unexpected errors
      console.error(`Error getting option quote for ${optionSymbol}:`, error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new AlpacaService();
