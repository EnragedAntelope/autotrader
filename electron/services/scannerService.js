const alpacaService = require('./alpacaService');
const dataService = require('./dataService');

/**
 * Scanner Service - Executes screening logic
 * Core engine for finding stocks/options that match criteria
 */

class ScannerService {
  /**
   * Run a scan based on a profile
   */
  async runScan(profileId, db) {
    const startTime = Date.now();

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
        matches = await this.scanStocks(parameters, db);
      } else if (profile.asset_type === 'call_option' || profile.asset_type === 'put_option') {
        matches = await this.scanOptions(profile.asset_type, parameters, db);
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
      db.prepare(`
        INSERT INTO daily_stats (date, scans_run, matches_found)
        VALUES (?, 1, ?)
        ON CONFLICT(date) DO UPDATE SET
          scans_run = scans_run + 1,
          matches_found = matches_found + ?
      `).run(today, matches.length, matches.length);

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
   * Phase 1: Basic implementation - will be enhanced in Phase 3
   */
  async scanStocks(parameters, db) {
    // TODO: Implement full stock screening logic in Phase 3
    // For now, return empty array as placeholder

    console.log('Stock scanning logic - to be implemented in Phase 3');
    return [];
  }

  /**
   * Scan for options matching criteria
   * Phase 1: Stub - will be implemented in Phase 3
   */
  async scanOptions(assetType, parameters, db) {
    // TODO: Implement options screening logic in Phase 3
    console.log(`${assetType} scanning logic - to be implemented in Phase 3`);
    return [];
  }

  /**
   * Check if a stock matches the given parameters
   */
  matchesStockCriteria(stockData, parameters) {
    // Price checks
    if (parameters.priceMin && stockData.price < parameters.priceMin) return false;
    if (parameters.priceMax && stockData.price > parameters.priceMax) return false;

    // Volume checks
    if (parameters.volumeMin && stockData.volume < parameters.volumeMin) return false;
    if (parameters.volumeMax && stockData.volume > parameters.volumeMax) return false;

    // Fundamental checks
    if (parameters.peMin && stockData.pe < parameters.peMin) return false;
    if (parameters.peMax && stockData.pe > parameters.peMax) return false;

    if (parameters.marketCapMin && stockData.marketCap < parameters.marketCapMin) return false;
    if (parameters.marketCapMax && stockData.marketCap > parameters.marketCapMax) return false;

    // Technical indicator checks
    if (parameters.rsiMin && stockData.rsi < parameters.rsiMin) return false;
    if (parameters.rsiMax && stockData.rsi > parameters.rsiMax) return false;

    // Sector filter
    if (parameters.sectors && parameters.sectors.length > 0) {
      if (!parameters.sectors.includes(stockData.sector)) return false;
    }

    return true;
  }

  /**
   * Get a watchlist of symbols to scan
   * For now, returns a default list - can be enhanced to use custom watchlists
   */
  async getWatchlist() {
    // TODO: Implement custom watchlist feature
    // For now, return common large-cap stocks
    return [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA',
      'TSLA', 'META', 'BRK.B', 'JPM', 'V',
      'JNJ', 'WMT', 'PG', 'MA', 'HD',
      'DIS', 'NFLX', 'ADBE', 'CRM', 'PYPL'
    ];
  }
}

module.exports = new ScannerService();
