const alpacaService = require('./alpacaService');

/**
 * Trade Service - Handles order execution and position management
 * Includes risk checks and order validation
 */

class TradeService {
  /**
   * Execute a trade with risk checks
   */
  async executeTrade(tradeParams, db) {
    const {
      profile_id,
      symbol,
      quantity,
      side,
      order_type = 'market',
      limit_price,
      stop_price,
      trail_percent,
    } = tradeParams;

    try {
      // Step 1: Get risk settings
      const riskSettings = db.prepare('SELECT * FROM risk_settings WHERE id = 1').get();

      if (!riskSettings || !riskSettings.enabled) {
        throw new Error('Risk management is not configured');
      }

      // Step 2: Validate order parameters
      this.validateOrderParams(tradeParams);

      // Step 3: Get current price estimate
      const quote = await alpacaService.getQuote(symbol);
      const estimatedPrice = limit_price || quote.price;
      const estimatedCost = estimatedPrice * quantity;

      // Step 4: Run risk checks
      const riskCheck = await this.performRiskChecks({
        symbol,
        side,
        estimatedCost,
        riskSettings,
        db,
      });

      if (!riskCheck.passed) {
        // Log rejected trade
        db.prepare(`
          INSERT INTO trade_history (profile_id, symbol, side, quantity, order_type, status, rejection_reason)
          VALUES (?, ?, ?, ?, ?, 'rejected', ?)
        `).run(profile_id, symbol, side, quantity, order_type, riskCheck.reason);

        return {
          success: false,
          rejected: true,
          reason: riskCheck.reason,
        };
      }

      // Step 5: Submit order to Alpaca
      const orderResult = await alpacaService.submitOrder({
        symbol,
        qty: quantity,
        side,
        type: order_type,
        limit_price,
        stop_price,
        trail_percent,
      });

      // Step 6: Log trade in database
      db.prepare(`
        INSERT INTO trade_history (profile_id, symbol, side, quantity, order_type, limit_price, status, order_id)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(profile_id, symbol, side, quantity, order_type, limit_price, orderResult.id);

      // Step 7: Update daily stats
      const today = new Date().toISOString().split('T')[0];
      db.prepare(`
        INSERT INTO daily_stats (date, orders_placed)
        VALUES (?, 1)
        ON CONFLICT(date) DO UPDATE SET orders_placed = orders_placed + 1
      `).run(today);

      // Step 8: Create notification
      db.prepare(`
        INSERT INTO notifications (type, title, message, related_profile_id, related_symbol)
        VALUES ('success', 'Order Submitted', ?, ?, ?)
      `).run(
        `${side.toUpperCase()} order for ${quantity} shares of ${symbol} submitted`,
        profile_id,
        symbol
      );

      console.log(`Trade executed successfully: ${side} ${quantity} ${symbol}`);

      return {
        success: true,
        order: orderResult,
        estimatedCost,
      };
    } catch (error) {
      console.error('Error executing trade:', error);

      // Log failed trade
      db.prepare(`
        INSERT INTO trade_history (profile_id, symbol, side, quantity, order_type, status, rejection_reason)
        VALUES (?, ?, ?, ?, ?, 'rejected', ?)
      `).run(profile_id, symbol, side, quantity, order_type, error.message);

      // Create error notification
      db.prepare(`
        INSERT INTO notifications (type, title, message, related_symbol)
        VALUES ('error', 'Trade Error', ?, ?)
      `).run(`Failed to execute ${side} order for ${symbol}: ${error.message}`, symbol);

      throw error;
    }
  }

  /**
   * Validate order parameters
   */
  validateOrderParams(params) {
    const { symbol, quantity, side, order_type, limit_price, stop_price } = params;

    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol');
    }

    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
      throw new Error('Quantity must be a positive integer');
    }

    if (!['buy', 'sell'].includes(side)) {
      throw new Error('Side must be "buy" or "sell"');
    }

    if (!['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'].includes(order_type)) {
      throw new Error('Invalid order type');
    }

    if (order_type === 'limit' && (!limit_price || limit_price <= 0)) {
      throw new Error('Limit orders require a valid limit price');
    }

    if (order_type === 'stop' && (!stop_price || stop_price <= 0)) {
      throw new Error('Stop orders require a valid stop price');
    }

    if (order_type === 'stop_limit' && (!limit_price || !stop_price)) {
      throw new Error('Stop-limit orders require both limit and stop prices');
    }
  }

  /**
   * Perform risk checks before executing trade
   */
  async performRiskChecks({ symbol, side, estimatedCost, riskSettings, db }) {
    // Only check for buy orders
    if (side !== 'buy') {
      return { passed: true };
    }

    // Check 1: Transaction limit
    if (estimatedCost > riskSettings.max_transaction_amount) {
      return {
        passed: false,
        reason: `Transaction amount ($${estimatedCost.toFixed(2)}) exceeds maximum allowed ($${riskSettings.max_transaction_amount})`,
      };
    }

    // Check 2: Daily spend limit
    const today = new Date().toISOString().split('T')[0];
    const dailyStats = db.prepare('SELECT total_spent FROM daily_stats WHERE date = ?').get(today);
    const todaySpent = dailyStats ? dailyStats.total_spent : 0;

    if (todaySpent + estimatedCost > riskSettings.daily_spend_limit) {
      return {
        passed: false,
        reason: `Would exceed daily spend limit. Today: $${todaySpent.toFixed(2)}, Limit: $${riskSettings.daily_spend_limit}`,
      };
    }

    // Check 3: Weekly spend limit
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weeklySpentResult = db
      .prepare('SELECT SUM(total_spent) as total FROM daily_stats WHERE date >= ?')
      .get(weekAgo);
    const weeklySpent = weeklySpentResult ? weeklySpentResult.total || 0 : 0;

    if (weeklySpent + estimatedCost > riskSettings.weekly_spend_limit) {
      return {
        passed: false,
        reason: `Would exceed weekly spend limit. This week: $${weeklySpent.toFixed(2)}, Limit: $${riskSettings.weekly_spend_limit}`,
      };
    }

    // Check 4: Maximum positions
    const positionsCount = db
      .prepare('SELECT COUNT(*) as count FROM positions_tracker')
      .get().count;

    if (positionsCount >= riskSettings.max_positions) {
      // Check if we already have this position (adding to existing)
      const existingPosition = db
        .prepare('SELECT * FROM positions_tracker WHERE symbol = ?')
        .get(symbol);

      if (!existingPosition) {
        return {
          passed: false,
          reason: `Maximum positions (${riskSettings.max_positions}) already held. Close a position before opening a new one.`,
        };
      }
    }

    // Check 5: Duplicate position check (if not allowed)
    if (!riskSettings.allow_duplicate_positions) {
      const existingPosition = db
        .prepare('SELECT * FROM positions_tracker WHERE symbol = ?')
        .get(symbol);

      if (existingPosition) {
        return {
          passed: false,
          reason: `Already have a position in ${symbol}. Duplicate positions are not allowed.`,
        };
      }
    }

    // Check 6: Account buying power
    try {
      const account = await alpacaService.getAccountInfo();
      if (estimatedCost > account.buying_power) {
        return {
          passed: false,
          reason: `Insufficient buying power. Available: $${account.buying_power.toFixed(2)}, Required: $${estimatedCost.toFixed(2)}`,
        };
      }
    } catch (error) {
      console.error('Error checking account buying power:', error);
      // Don't block trade if we can't check account - let Alpaca reject it
    }

    return { passed: true };
  }

  /**
   * Update position tracking after trade execution
   * This should be called periodically to sync with Alpaca
   */
  async syncPositions(db) {
    try {
      const alpacaPositions = await alpacaService.getPositions();

      // Clear existing positions and rebuild from Alpaca
      db.prepare('DELETE FROM positions_tracker').run();

      const riskSettings = db.prepare('SELECT * FROM risk_settings WHERE id = 1').get();

      for (const pos of alpacaPositions) {
        const unrealizedPl = parseFloat(pos.unrealized_pl);
        const unrealizedPlPercent = parseFloat(pos.unrealized_plpc) * 100;

        db.prepare(`
          INSERT INTO positions_tracker (symbol, quantity, avg_cost, current_value, current_price,
                                          unrealized_pl, unrealized_pl_percent,
                                          stop_loss_percent, take_profit_percent, last_updated)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          pos.symbol,
          pos.qty,
          pos.avg_entry_price,
          pos.market_value,
          pos.current_price,
          unrealizedPl,
          unrealizedPlPercent,
          riskSettings.stop_loss_default,
          riskSettings.take_profit_default
        );
      }

      console.log(`Synced ${alpacaPositions.length} positions`);
    } catch (error) {
      console.error('Error syncing positions:', error);
      throw error;
    }
  }

  /**
   * Monitor positions for stop-loss and take-profit triggers
   */
  async monitorPositions(db) {
    try {
      const positions = db.prepare('SELECT * FROM positions_tracker').all();

      for (const position of positions) {
        // Get current price
        const quote = await alpacaService.getQuote(position.symbol);
        const currentPrice = quote.price;
        const avgCost = position.avg_cost;

        // Calculate current P/L percent
        const plPercent = ((currentPrice - avgCost) / avgCost) * 100;

        // Check stop-loss
        if (position.stop_loss_percent && plPercent <= -position.stop_loss_percent) {
          console.log(`Stop-loss triggered for ${position.symbol} at ${plPercent.toFixed(2)}%`);
          await this.closePositionWithReason(position.symbol, position.quantity, 'stop_loss', db);
          continue;
        }

        // Check take-profit
        if (position.take_profit_percent && plPercent >= position.take_profit_percent) {
          console.log(`Take-profit triggered for ${position.symbol} at ${plPercent.toFixed(2)}%`);
          await this.closePositionWithReason(position.symbol, position.quantity, 'take_profit', db);
          continue;
        }

        // Update current values
        db.prepare(`
          UPDATE positions_tracker
          SET current_price = ?, current_value = ?, unrealized_pl = ?, unrealized_pl_percent = ?, last_updated = datetime('now')
          WHERE symbol = ?
        `).run(
          currentPrice,
          currentPrice * position.quantity,
          (currentPrice - avgCost) * position.quantity,
          plPercent,
          position.symbol
        );
      }
    } catch (error) {
      console.error('Error monitoring positions:', error);
    }
  }

  /**
   * Close a position with a specific reason
   */
  async closePositionWithReason(symbol, quantity, reason, db) {
    try {
      // Close position via Alpaca
      await alpacaService.closePosition(symbol);

      // Create notification
      db.prepare(`
        INSERT INTO notifications (type, title, message, related_symbol)
        VALUES ('info', 'Position Closed', ?, ?)
      `).run(`${symbol} position closed: ${reason}`, symbol);

      console.log(`Closed position ${symbol} due to ${reason}`);
    } catch (error) {
      console.error(`Error closing position ${symbol}:`, error);
    }
  }
}

module.exports = new TradeService();
