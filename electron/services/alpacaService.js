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
      console.error(`Error getting quote for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get latest bar data (OHLCV)
   */
  async getLatestBar(symbol) {
    try {
      const bars = await this.client.getBarsV2(symbol, {
        limit: 1,
        timeframe: '1Day',
      });

      const barArray = [];
      for await (let bar of bars) {
        barArray.push(bar);
      }

      if (barArray.length === 0) {
        throw new Error(`No bar data found for ${symbol}`);
      }

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
   */
  async getHistoricalBars(symbol, options = {}) {
    try {
      const {
        start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        end = new Date().toISOString(),
        timeframe = '1Day',
        limit = 100,
      } = options;

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
}

// Export singleton instance
module.exports = new AlpacaService();
