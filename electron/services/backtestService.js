/**
 * Backtesting Service
 *
 * Tests screening profiles against historical data to evaluate performance
 */

const AlpacaService = require('./alpacaService');

class BacktestService {
  constructor() {
    this.cache = new Map();
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
    console.log(`\nRunning backtest for "${profile.name}"`);
    console.log(`Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log(`Initial Capital: $${initialCapital}, Position Size: $${positionSize}\n`);

    const trades = [];
    let capital = initialCapital;
    let positions = [];

    // Iterate through time period (weekly scans for performance)
    const currentDate = new Date(startDate);
    const scanInterval = 7; // Days between scans

    while (currentDate <= endDate) {
      console.log(`Scanning ${currentDate.toISOString().split('T')[0]}...`);

      // Simulate scan on this date (in real implementation, would use historical data)
      // For now, we'll use a simplified simulation

      // Close any positions that hit stop-loss or take-profit
      positions = await this.updatePositions(positions, currentDate, trades);

      // Check if we have capital for new positions
      if (capital >= positionSize && positions.length < 10) {
        // Simulate finding matches (simplified)
        const matches = await this.simulateScan(profile, currentDate);

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
      const exitPrice = position.entryPrice * (1 + (Math.random() * 0.2 - 0.1)); // Simulate price movement
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
    };
  }

  /**
   * Update open positions and close if stop-loss/take-profit hit
   */
  async updatePositions(positions, currentDate, trades) {
    const remaining = [];

    for (const position of positions) {
      // Simulate price movement
      const currentPrice = position.entryPrice * (1 + (Math.random() * 0.3 - 0.15));

      // Check stop-loss
      if (currentPrice <= position.stopLoss) {
        const pl = (position.stopLoss - position.entryPrice) * position.quantity;
        trades.push({
          symbol: position.symbol,
          entryDate: position.entryDate,
          exitDate: currentDate,
          entryPrice: position.entryPrice,
          exitPrice: position.stopLoss,
          quantity: position.quantity,
          profitLoss: pl,
          profitLossPercent: -5, // Stop-loss at 5%
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
          exitDate: currentDate,
          entryPrice: position.entryPrice,
          exitPrice: position.takeProfit,
          quantity: position.quantity,
          profitLoss: pl,
          profitLossPercent: 15, // Take-profit at 15%
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
   * Simulate a scan on a specific date (simplified for demo)
   */
  async simulateScan(profile, date) {
    // In a real implementation, this would fetch historical data and apply filters
    // For now, we'll simulate some matches

    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'AMD', 'NFLX', 'DIS'];
    const matches = [];

    // Simulate 30% hit rate
    if (Math.random() < 0.3) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const basePrice = 100 + Math.random() * 300;

      matches.push({
        symbol,
        price: basePrice,
        volume: 1000000 + Math.random() * 10000000,
      });
    }

    return matches;
  }

  /**
   * Calculate performance metrics from trade history
   */
  calculateMetrics(trades, initialCapital, finalCapital) {
    if (trades.length === 0) {
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

    const winners = trades.filter(t => t.profitLoss > 0);
    const losers = trades.filter(t => t.profitLoss <= 0);

    const totalPL = trades.reduce((sum, t) => sum + t.profitLoss, 0);
    const totalWins = winners.reduce((sum, t) => sum + t.profitLoss, 0);
    const totalLosses = Math.abs(losers.reduce((sum, t) => sum + t.profitLoss, 0));

    const avgWin = winners.length > 0 ? totalWins / winners.length : 0;
    const avgLoss = losers.length > 0 ? totalLosses / losers.length : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

    // Calculate Sharpe Ratio (simplified)
    const returns = trades.map(t => t.profitLossPercent);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252 / 7) : 0; // Annualized

    // Calculate max drawdown
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

    const avgHoldingDays = trades.reduce((sum, t) => sum + t.holdingDays, 0) / trades.length;

    return {
      totalTrades: trades.length,
      winningTrades: winners.length,
      losingTrades: losers.length,
      winRate: (winners.length / trades.length) * 100,
      totalProfitLoss: totalPL,
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
