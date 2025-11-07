/**
 * Position Monitor Service
 *
 * Monitors active positions and automatically executes stop-loss and take-profit orders
 * when thresholds are reached.
 */

const AlpacaService = require('./alpacaService');

class PositionMonitorService {
  constructor() {
    this.isRunning = false;
    this.monitorInterval = null;
    this.db = null;
    this.checkIntervalMs = 60000; // Check every 60 seconds
  }

  /**
   * Start the position monitoring service
   */
  start(database) {
    if (this.isRunning) {
      console.log('Position monitor is already running');
      return;
    }

    this.db = database;
    this.isRunning = true;

    console.log('Starting position monitor service...');

    // Run initial check immediately
    this.checkPositions();

    // Set up periodic checking
    this.monitorInterval = setInterval(() => {
      this.checkPositions();
    }, this.checkIntervalMs);

    console.log(`Position monitor started (checking every ${this.checkIntervalMs / 1000}s)`);
  }

  /**
   * Stop the position monitoring service
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping position monitor service...');

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    this.isRunning = false;
    console.log('Position monitor stopped');
  }

  /**
   * Check all active positions for stop-loss and take-profit triggers
   */
  async checkPositions() {
    if (!this.db) {
      console.error('Database not initialized for position monitor');
      return;
    }

    try {
      // Get all active positions for current trading mode
      const tradingMode = process.env.TRADING_MODE || 'paper';
      const positions = this.db.prepare('SELECT * FROM positions_tracker WHERE trading_mode = ?').all(tradingMode);

      if (positions.length === 0) {
        return; // No positions to monitor
      }

      console.log(`Checking ${positions.length} active position(s)...`);

      for (const position of positions) {
        await this.checkPosition(position);
      }

      console.log('Position check complete');
    } catch (error) {
      console.error('Error checking positions:', error);
    }
  }

  /**
   * Check a single position for stop-loss/take-profit triggers
   */
  async checkPosition(position) {
    try {
      // Get current market price
      const quote = await AlpacaService.getQuote(position.symbol);

      if (!quote || !quote.ap) {
        console.warn(`No quote data available for ${position.symbol}`);
        return;
      }

      const currentPrice = quote.ap; // Ask price
      const avgCost = position.avg_cost;

      // Calculate current P/L
      const currentValue = currentPrice * position.quantity;
      const costBasis = avgCost * position.quantity;
      const unrealizedPL = currentValue - costBasis;
      const unrealizedPLPercent = ((currentPrice - avgCost) / avgCost) * 100;

      // Update position data in database
      const tradingMode = process.env.TRADING_MODE || 'paper';
      this.db.prepare(`
        UPDATE positions_tracker
        SET current_price = ?,
            current_value = ?,
            unrealized_pl = ?,
            unrealized_pl_percent = ?,
            last_updated = datetime('now')
        WHERE id = ? AND trading_mode = ?
      `).run(
        currentPrice,
        currentValue,
        unrealizedPL,
        unrealizedPLPercent,
        position.id,
        tradingMode
      );

      // Check stop-loss trigger
      if (position.stop_loss_percent && unrealizedPLPercent <= -Math.abs(position.stop_loss_percent)) {
        console.log(`🛑 STOP-LOSS TRIGGERED for ${position.symbol}!`);
        console.log(`   Current P/L: ${unrealizedPLPercent.toFixed(2)}% (threshold: -${position.stop_loss_percent}%)`);

        await this.executeAutoSell(position, currentPrice, 'stop_loss');
        return;
      }

      // Check take-profit trigger
      if (position.take_profit_percent && unrealizedPLPercent >= position.take_profit_percent) {
        console.log(`✅ TAKE-PROFIT TRIGGERED for ${position.symbol}!`);
        console.log(`   Current P/L: ${unrealizedPLPercent.toFixed(2)}% (threshold: +${position.take_profit_percent}%)`);

        await this.executeAutoSell(position, currentPrice, 'take_profit');
        return;
      }

      // Log position status (only for positions with configured thresholds)
      if (position.stop_loss_percent || position.take_profit_percent) {
        console.log(`📊 ${position.symbol}: ${unrealizedPLPercent >= 0 ? '+' : ''}${unrealizedPLPercent.toFixed(2)}% P/L @ $${currentPrice.toFixed(2)}`);
      }
    } catch (error) {
      console.error(`Error checking position for ${position.symbol}:`, error.message);
    }
  }

  /**
   * Execute automatic sell order when stop-loss or take-profit is triggered
   */
  async executeAutoSell(position, currentPrice, reason) {
    try {
      console.log(`Executing automatic sell order for ${position.symbol} (${reason})...`);

      // Place market sell order with Alpaca
      const order = await AlpacaService.placeOrder({
        symbol: position.symbol,
        qty: position.quantity,
        side: 'sell',
        type: 'market',
        time_in_force: 'day',
      });

      console.log(`✓ Sell order placed: ${order.id}`);

      // Calculate realized P/L
      const avgOpenPrice = position.avg_cost;
      const avgClosePrice = currentPrice;
      const realizedPL = (avgClosePrice - avgOpenPrice) * position.quantity;
      const realizedPLPercent = ((avgClosePrice - avgOpenPrice) / avgOpenPrice) * 100;

      // Move position to closed_positions table
      const tradingMode = process.env.TRADING_MODE || 'paper';
      this.db.prepare(`
        INSERT INTO closed_positions (
          symbol, quantity, avg_open_price, avg_close_price,
          realized_pl, realized_pl_percent, holding_period_days,
          opened_at, closed_at, close_reason, trading_mode
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
      `).run(
        position.symbol,
        position.quantity,
        avgOpenPrice,
        avgClosePrice,
        realizedPL,
        realizedPLPercent,
        this.calculateHoldingDays(position.opened_at),
        position.opened_at,
        reason,
        tradingMode
      );

      // Remove from active positions
      this.db.prepare('DELETE FROM positions_tracker WHERE id = ? AND trading_mode = ?').run(position.id, tradingMode);

      // Record trade in trade_history
      this.db.prepare(`
        INSERT INTO trade_history (
          symbol, side, quantity, order_type, filled_price,
          status, order_id, trading_mode, executed_at, filled_at
        )
        VALUES (?, 'sell', ?, 'market', ?, 'filled', ?, ?, datetime('now'), datetime('now'))
      `).run(
        position.symbol,
        position.quantity,
        currentPrice,
        order.id,
        tradingMode
      );

      // Update daily stats
      const today = new Date().toISOString().split('T')[0];
      this.db.prepare(`
        INSERT INTO daily_stats (date, trading_mode, positions_closed, realized_pl)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(date, trading_mode) DO UPDATE SET
          positions_closed = positions_closed + 1,
          realized_pl = realized_pl + excluded.realized_pl
      `).run(today, tradingMode, realizedPL);

      console.log(`✓ Position closed: ${position.symbol} - P/L: $${realizedPL.toFixed(2)} (${realizedPLPercent.toFixed(2)}%)`);

      // Create notification
      this.createNotification(
        reason === 'stop_loss' ? 'warning' : 'success',
        reason === 'stop_loss' ? 'Stop-Loss Executed' : 'Take-Profit Executed',
        `Automatically sold ${position.quantity} shares of ${position.symbol} at $${currentPrice.toFixed(2)}. ` +
        `Realized P/L: $${realizedPL.toFixed(2)} (${realizedPLPercent >= 0 ? '+' : ''}${realizedPLPercent.toFixed(2)}%)`,
        position.symbol
      );

    } catch (error) {
      console.error(`Failed to execute auto-sell for ${position.symbol}:`, error.message);

      // Create error notification
      this.createNotification(
        'error',
        'Auto-Sell Failed',
        `Failed to execute automatic sell order for ${position.symbol}: ${error.message}`,
        position.symbol
      );
    }
  }

  /**
   * Calculate holding period in days
   */
  calculateHoldingDays(openedAt) {
    const opened = new Date(openedAt);
    const now = new Date();
    const diffTime = Math.abs(now - opened);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Create a notification in the database
   */
  createNotification(type, title, message, symbol = null) {
    if (!this.db) return;

    try {
      this.db.prepare(`
        INSERT INTO notifications (type, title, message, related_symbol, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(type, title, message, symbol);
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      running: this.isRunning,
      checkInterval: this.checkIntervalMs,
    };
  }

  /**
   * Update check interval (in seconds)
   */
  setCheckInterval(seconds) {
    if (seconds < 10) {
      throw new Error('Check interval must be at least 10 seconds');
    }

    this.checkIntervalMs = seconds * 1000;

    // Restart monitoring if running
    if (this.isRunning) {
      const db = this.db;
      this.stop();
      this.start(db);
    }

    console.log(`Position monitor check interval updated to ${seconds}s`);
  }
}

// Export singleton instance
module.exports = new PositionMonitorService();
