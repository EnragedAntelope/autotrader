const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dotenv = require('dotenv');
const Database = require('better-sqlite3');

// Load environment variables
dotenv.config();

// Services
const AlpacaService = require('./services/alpacaService');
const DataService = require('./services/dataService');
const ScannerService = require('./services/scannerService');
const SchedulerService = require('./services/schedulerService');
const TradeService = require('./services/tradeService');
const PositionMonitorService = require('./services/positionMonitorService');
const BacktestService = require('./services/backtestService');

// Database instance
let db;

// Main window
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  // Set Content Security Policy
  const isDev = process.env.NODE_ENV === 'development';

  // Note: CSP warning about 'unsafe-eval' is EXPECTED in development mode
  // Vite's Hot Module Replacement (HMR) requires 'unsafe-eval' to function
  // This warning will NOT appear in production builds
  // See: https://vitejs.dev/guide/backend-integration.html
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? // Development CSP - allows Vite HMR with unsafe-eval
              // WARNING: This will trigger a security warning in dev console - this is EXPECTED
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173; " +
              "style-src 'self' 'unsafe-inline' http://localhost:5173; " +
              "img-src 'self' data: https:; " +
              "font-src 'self' data:; " +
              "connect-src 'self' http://localhost:5173 ws://localhost:5173 https://paper-api.alpaca.markets https://api.alpaca.markets https://data.alpaca.markets https://www.alphavantage.co; " +
              "frame-src 'none';"
            : // Production CSP - more restrictive, no unsafe-eval
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: https:; " +
              "font-src 'self' data:; " +
              "connect-src 'self' https://paper-api.alpaca.markets https://api.alpaca.markets https://data.alpaca.markets https://www.alphavantage.co; " +
              "frame-src 'none';"
        ]
      }
    });
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'trading_scanner.db');
  db = new Database(dbPath);

  // Read and execute schema
  const schemaPath = path.join(__dirname, '../database/schema.sql');
  const fs = require('fs');

  try {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    console.log('Database initialized successfully');

    // Run migrations for existing databases
    runMigrations();

    // Initialize default watchlists if needed
    initializeDefaultWatchlists();
  } catch (error) {
    console.error('Error initializing database:', error);
  }

  return db;
}

function initializeDefaultWatchlists() {
  try {
    // Check if any watchlists already exist
    const existingWatchlists = db.prepare('SELECT COUNT(*) as count FROM watchlists').get();
    if (existingWatchlists.count > 0) {
      console.log('Watchlists already initialized, skipping...');
      return;
    }

    console.log('Creating default watchlists...');

    // Default watchlist data
    const watchlists = [
      {
        name: 'ALL US STOCKS (Universe Scanner)',
        description: 'Scan ALL tradable US stocks from Alpaca (~10,000+ stocks). Warning: This will use significantly more API calls and take longer to complete.',
        is_default: 0,
        special_id: 'ALL_STOCKS'  // Special marker for universal scanning
      },
      {
        name: 'All Major Stocks',
        description: 'Comprehensive list of major US stocks across all sectors (60 stocks)',
        is_default: 1,
        symbols: [
          // Tech giants
          'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX', 'ADBE', 'CRM',
          'ORCL', 'CSCO', 'INTC', 'AMD', 'QCOM',
          // Financials
          'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'V', 'MA', 'PYPL', 'AXP',
          // Healthcare
          'JNJ', 'UNH', 'PFE', 'ABBV', 'LLY', 'TMO', 'ABT', 'DHR', 'MRK', 'BMY',
          // Consumer
          'WMT', 'HD', 'MCD', 'NKE', 'SBUX', 'TGT', 'LOW', 'COST', 'PG', 'KO', 'PEP', 'PM',
          // Industrials
          'BA', 'CAT', 'GE', 'UPS', 'HON', 'MMM', 'LMT', 'RTX',
          // Energy
          'XOM', 'CVX', 'COP', 'SLB', 'EOG'
        ]
      },
      {
        name: 'Tech Giants',
        description: 'FAANG + major technology companies',
        is_default: 0,
        symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'CSCO', 'AMD', 'INTC', 'QCOM']
      },
      {
        name: 'Dividend Aristocrats',
        description: 'Reliable dividend-paying stocks with long track records',
        is_default: 0,
        symbols: ['JNJ', 'PG', 'KO', 'PEP', 'WMT', 'MCD', 'MMM', 'CAT', 'XOM', 'CVX', 'PM', 'ABT', 'LOW', 'HD', 'TGT']
      },
      {
        name: 'Financial Sector',
        description: 'Banks, payment processors, and financial services',
        is_default: 0,
        symbols: ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'V', 'MA', 'PYPL', 'AXP', 'BLK', 'SCHW', 'USB', 'PNC', 'TFC']
      },
      {
        name: 'Healthcare Leaders',
        description: 'Pharmaceuticals, biotech, and medical devices',
        is_default: 0,
        symbols: ['JNJ', 'UNH', 'PFE', 'ABBV', 'LLY', 'TMO', 'ABT', 'DHR', 'MRK', 'BMY', 'AMGN', 'GILD', 'CVS', 'CI', 'HUM']
      },
      {
        name: 'Energy & Commodities',
        description: 'Oil, gas, and commodity-related stocks',
        is_default: 0,
        symbols: ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PSX', 'MPC', 'VLO', 'OXY', 'HAL', 'BKR', 'DVN', 'HES', 'MRO', 'APA']
      },
      {
        name: 'Cloud & SaaS',
        description: 'Cloud computing and software-as-a-service companies',
        is_default: 0,
        symbols: ['MSFT', 'AMZN', 'GOOGL', 'CRM', 'ORCL', 'ADBE', 'NOW', 'INTU', 'WDAY', 'ZM', 'DDOG', 'SNOW', 'CRWD', 'OKTA', 'MDB']
      },
      {
        name: 'Consumer Staples',
        description: 'Essential consumer goods and retail',
        is_default: 0,
        symbols: ['WMT', 'COST', 'PG', 'KO', 'PEP', 'PM', 'MO', 'CL', 'KMB', 'GIS', 'K', 'HSY', 'CPB', 'SJM', 'CAG']
      },
      {
        name: 'E-commerce & Retail',
        description: 'Online and traditional retail leaders',
        is_default: 0,
        symbols: ['AMZN', 'WMT', 'HD', 'TGT', 'COST', 'LOW', 'EBAY', 'ETSY', 'W', 'CHWY', 'BBY', 'DG', 'DLTR', 'ROST', 'TJX']
      },
      {
        name: 'Semiconductors',
        description: 'Chip manufacturers and semiconductor equipment',
        is_default: 0,
        symbols: ['NVDA', 'AMD', 'INTC', 'QCOM', 'AVGO', 'TSM', 'MU', 'AMAT', 'LRCX', 'KLAC', 'MCHP', 'ADI', 'TXN', 'NXPI', 'ON']
      },
      {
        name: 'EV & Clean Energy',
        description: 'Electric vehicles and renewable energy',
        is_default: 0,
        symbols: ['TSLA', 'F', 'GM', 'RIVN', 'LCID', 'NIO', 'XPEV', 'LI', 'ENPH', 'SEDG', 'FSLR', 'RUN', 'PLUG', 'BE', 'CHPT']
      },
      {
        name: 'Value Plays',
        description: 'Undervalued stocks with strong fundamentals (starter list)',
        is_default: 0,
        symbols: ['BAC', 'WFC', 'C', 'F', 'GM', 'XOM', 'CVX', 'INTC', 'VZ', 'T', 'CSCO', 'MO', 'PM', 'PFE', 'BMY']
      },
      {
        name: 'Growth Momentum',
        description: 'High-growth stocks with strong momentum (starter list)',
        is_default: 0,
        symbols: ['NVDA', 'META', 'TSLA', 'AMD', 'NOW', 'CRWD', 'SNOW', 'DDOG', 'NET', 'PLTR', 'U', 'SHOP', 'SQ', 'MELI', 'COIN']
      },
      {
        name: 'My Custom Stocks',
        description: 'Empty watchlist for your custom stock picks',
        is_default: 0,
        symbols: []
      }
    ];

    // Insert watchlists and symbols
    const insertWatchlist = db.prepare('INSERT INTO watchlists (name, description, is_default) VALUES (?, ?, ?)');
    const insertSymbol = db.prepare('INSERT INTO watchlist_symbols (watchlist_id, symbol) VALUES (?, ?)');

    for (const watchlist of watchlists) {
      const result = insertWatchlist.run(watchlist.name, watchlist.description, watchlist.is_default);
      const watchlistId = result.lastInsertRowid;

      // Handle special watchlists (like ALL_STOCKS) that don't need symbols
      if (watchlist.special_id) {
        // Store the special ID as a special symbol marker
        insertSymbol.run(watchlistId, `__SPECIAL__${watchlist.special_id}__`);
        console.log(`✓ Created special watchlist: ${watchlist.name} (${watchlist.special_id})`);
      } else if (watchlist.symbols) {
        // Insert symbols for regular watchlists
        for (const symbol of watchlist.symbols) {
          insertSymbol.run(watchlistId, symbol);
        }
        console.log(`✓ Created watchlist: ${watchlist.name} (${watchlist.symbols.length} symbols)`);
      }
    }

    console.log('Default watchlists initialized successfully');
  } catch (error) {
    console.error('Error initializing default watchlists:', error);
  }
}

function runMigrations() {
  try {
    // Migration: Add trading_mode column to existing tables
    // This is safe to run multiple times (will fail silently if column exists)

    // Check if trade_history needs migration
    const tradeColumns = db.prepare("PRAGMA table_info(trade_history)").all();
    if (!tradeColumns.some(col => col.name === 'trading_mode')) {
      console.log('Migrating trade_history table...');
      db.exec(`
        ALTER TABLE trade_history
        ADD COLUMN trading_mode TEXT CHECK(trading_mode IN ('paper', 'live')) NOT NULL DEFAULT 'paper'
      `);
      console.log('✓ trade_history migrated');
    }

    // Check if positions_tracker needs migration
    const positionColumns = db.prepare("PRAGMA table_info(positions_tracker)").all();
    if (!positionColumns.some(col => col.name === 'trading_mode')) {
      console.log('Migrating positions_tracker table...');
      // Drop old UNIQUE constraint on symbol only
      db.exec(`
        CREATE TABLE positions_tracker_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          symbol TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          avg_cost DECIMAL(10,4) NOT NULL,
          current_value DECIMAL(10,2),
          current_price DECIMAL(10,4),
          stop_loss_percent DECIMAL(5,2),
          take_profit_percent DECIMAL(5,2),
          unrealized_pl DECIMAL(10,2),
          unrealized_pl_percent DECIMAL(5,2),
          trading_mode TEXT CHECK(trading_mode IN ('paper', 'live')) NOT NULL DEFAULT 'paper',
          opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(symbol, trading_mode)
        );

        INSERT INTO positions_tracker_new
        SELECT id, symbol, quantity, avg_cost, current_value, current_price,
               stop_loss_percent, take_profit_percent, unrealized_pl, unrealized_pl_percent,
               'paper', opened_at, last_updated
        FROM positions_tracker;

        DROP TABLE positions_tracker;
        ALTER TABLE positions_tracker_new RENAME TO positions_tracker;
      `);
      console.log('✓ positions_tracker migrated');
    }

    // Check if closed_positions needs migration
    const closedColumns = db.prepare("PRAGMA table_info(closed_positions)").all();
    if (!closedColumns.some(col => col.name === 'trading_mode')) {
      console.log('Migrating closed_positions table...');
      db.exec(`
        ALTER TABLE closed_positions
        ADD COLUMN trading_mode TEXT CHECK(trading_mode IN ('paper', 'live')) NOT NULL DEFAULT 'paper'
      `);
      console.log('✓ closed_positions migrated');
    }

    // Check if daily_stats needs migration
    const statsColumns = db.prepare("PRAGMA table_info(daily_stats)").all();
    if (!statsColumns.some(col => col.name === 'trading_mode')) {
      console.log('Migrating daily_stats table...');
      db.exec(`
        CREATE TABLE daily_stats_new (
          date DATE NOT NULL,
          trading_mode TEXT CHECK(trading_mode IN ('paper', 'live')) NOT NULL DEFAULT 'paper',
          scans_run INTEGER DEFAULT 0,
          matches_found INTEGER DEFAULT 0,
          orders_placed INTEGER DEFAULT 0,
          orders_filled INTEGER DEFAULT 0,
          orders_rejected INTEGER DEFAULT 0,
          total_spent DECIMAL(10,2) DEFAULT 0,
          positions_opened INTEGER DEFAULT 0,
          positions_closed INTEGER DEFAULT 0,
          realized_pl DECIMAL(10,2) DEFAULT 0,
          PRIMARY KEY (date, trading_mode)
        );

        INSERT INTO daily_stats_new
        SELECT date, 'paper', scans_run, matches_found, orders_placed, orders_filled,
               orders_rejected, total_spent, positions_opened, positions_closed, realized_pl
        FROM daily_stats;

        DROP TABLE daily_stats;
        ALTER TABLE daily_stats_new RENAME TO daily_stats;
      `);
      console.log('✓ daily_stats migrated');
    }

    // Check if screening_profiles needs watchlist_id column
    const profileColumns = db.prepare("PRAGMA table_info(screening_profiles)").all();
    if (!profileColumns.some(col => col.name === 'watchlist_id')) {
      console.log('Migrating screening_profiles table to add watchlist_id...');
      db.exec(`
        ALTER TABLE screening_profiles
        ADD COLUMN watchlist_id INTEGER REFERENCES watchlists(id) ON DELETE SET NULL
      `);
      console.log('✓ screening_profiles migrated');
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    // Don't throw - let app continue even if migrations fail
  }
}

function setupIPC() {
  // Account & Configuration
  ipcMain.handle('get-account-info', async () => {
    try {
      return await AlpacaService.getAccountInfo();
    } catch (error) {
      console.error('Error getting account info:', error);
      throw error;
    }
  });

  ipcMain.handle('get-trading-mode', () => {
    return process.env.TRADING_MODE || 'paper';
  });

  ipcMain.handle('set-trading-mode', (event, mode) => {
    process.env.TRADING_MODE = mode;
    AlpacaService.switchMode(mode);
    return { success: true, mode };
  });

  // Screening Profiles
  ipcMain.handle('get-profiles', () => {
    const profiles = db.prepare('SELECT * FROM screening_profiles ORDER BY created_at DESC').all();
    return profiles.map(p => ({
      ...p,
      parameters: JSON.parse(p.parameters),
      // Convert SQLite integers (0/1) to booleans for React components
      schedule_enabled: Boolean(p.schedule_enabled),
      schedule_market_hours_only: Boolean(p.schedule_market_hours_only),
      auto_execute: Boolean(p.auto_execute),
    }));
  });

  ipcMain.handle('create-profile', (event, profile) => {
    const stmt = db.prepare(`
      INSERT INTO screening_profiles (name, asset_type, parameters, schedule_enabled, schedule_interval,
                                       schedule_market_hours_only, auto_execute, max_transaction_amount,
                                       created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const result = stmt.run(
      profile.name,
      profile.asset_type,
      JSON.stringify(profile.parameters),
      profile.schedule_enabled ? 1 : 0,
      profile.schedule_interval || 15,
      profile.schedule_market_hours_only ? 1 : 0,
      profile.auto_execute ? 1 : 0,
      profile.max_transaction_amount || null
    );

    return { id: result.lastInsertRowid, ...profile };
  });

  ipcMain.handle('update-profile', (event, id, profile) => {
    const stmt = db.prepare(`
      UPDATE screening_profiles
      SET name = ?, asset_type = ?, parameters = ?, schedule_enabled = ?,
          schedule_interval = ?, schedule_market_hours_only = ?, auto_execute = ?,
          max_transaction_amount = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(
      profile.name,
      profile.asset_type,
      JSON.stringify(profile.parameters),
      profile.schedule_enabled ? 1 : 0,
      profile.schedule_interval || 15,
      profile.schedule_market_hours_only ? 1 : 0,
      profile.auto_execute ? 1 : 0,
      profile.max_transaction_amount || null,
      id
    );

    return { success: true };
  });

  ipcMain.handle('delete-profile', (event, id) => {
    db.prepare('DELETE FROM screening_profiles WHERE id = ?').run(id);
    return { success: true };
  });

  // Scanner Operations
  ipcMain.handle('run-scan', async (event, profileId) => {
    try {
      const results = await ScannerService.runScan(profileId, db);
      return results;
    } catch (error) {
      console.error('Error running scan:', error);
      throw error;
    }
  });

  ipcMain.handle('get-scan-results', (event, profileId, limit = 100) => {
    const results = db.prepare(`
      SELECT * FROM scan_results
      WHERE profile_id = ?
      ORDER BY scan_timestamp DESC
      LIMIT ?
    `).all(profileId, limit);

    return results.map(r => ({
      ...r,
      parameters_snapshot: JSON.parse(r.parameters_snapshot),
      market_data_snapshot: JSON.parse(r.market_data_snapshot),
    }));
  });

  ipcMain.handle('get-all-scan-results', (event, filters = {}) => {
    const { profileId, symbol, fromDate, toDate, assetType, limit = 500 } = filters;

    let query = `
      SELECT sr.*, sp.name as profile_name
      FROM scan_results sr
      LEFT JOIN screening_profiles sp ON sr.profile_id = sp.id
      WHERE 1=1
    `;
    const params = [];

    if (profileId) {
      query += ' AND sr.profile_id = ?';
      params.push(profileId);
    }

    if (symbol) {
      query += ' AND sr.symbol LIKE ?';
      params.push(`%${symbol}%`);
    }

    if (fromDate) {
      query += ' AND sr.scan_timestamp >= ?';
      params.push(fromDate);
    }

    if (toDate) {
      query += ' AND sr.scan_timestamp <= ?';
      params.push(toDate);
    }

    if (assetType) {
      query += ' AND sr.asset_type = ?';
      params.push(assetType);
    }

    query += ' ORDER BY sr.scan_timestamp DESC LIMIT ?';
    params.push(limit);

    const results = db.prepare(query).all(...params);

    return results.map(r => ({
      ...r,
      parameters_snapshot: JSON.parse(r.parameters_snapshot),
      market_data_snapshot: JSON.parse(r.market_data_snapshot),
    }));
  });

  // Trade Operations
  ipcMain.handle('execute-trade', async (event, tradeParams) => {
    try {
      const result = await TradeService.executeTrade(tradeParams, db);
      return result;
    } catch (error) {
      console.error('Error executing trade:', error);
      throw error;
    }
  });

  ipcMain.handle('get-trade-history', (event, filters = {}) => {
    const tradingMode = process.env.TRADING_MODE || 'paper';
    let query = 'SELECT * FROM trade_history WHERE trading_mode = ?';
    const params = [tradingMode];

    if (filters.profile_id) {
      query += ' AND profile_id = ?';
      params.push(filters.profile_id);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.from_date) {
      query += ' AND executed_at >= ?';
      params.push(filters.from_date);
    }

    query += ' ORDER BY executed_at DESC LIMIT ?';
    params.push(filters.limit || 100);

    return db.prepare(query).all(...params);
  });

  // Position Management
  ipcMain.handle('get-positions', () => {
    const tradingMode = process.env.TRADING_MODE || 'paper';
    return db.prepare('SELECT * FROM positions_tracker WHERE trading_mode = ? ORDER BY opened_at DESC').all(tradingMode);
  });

  ipcMain.handle('update-position', (event, id, updates) => {
    const tradingMode = process.env.TRADING_MODE || 'paper';
    const stmt = db.prepare(`
      UPDATE positions_tracker
      SET stop_loss_percent = ?, take_profit_percent = ?
      WHERE id = ? AND trading_mode = ?
    `);

    stmt.run(updates.stop_loss_percent, updates.take_profit_percent, id, tradingMode);
    return { success: true };
  });

  // Risk Settings
  ipcMain.handle('get-risk-settings', () => {
    return db.prepare('SELECT * FROM risk_settings WHERE id = 1').get() || {
      max_transaction_amount: 1000,
      daily_spend_limit: 5000,
      weekly_spend_limit: 20000,
      max_positions: 10,
      enabled: 1,
    };
  });

  ipcMain.handle('update-risk-settings', (event, settings) => {
    const stmt = db.prepare(`
      INSERT INTO risk_settings (id, max_transaction_amount, daily_spend_limit, weekly_spend_limit, max_positions, enabled)
      VALUES (1, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        max_transaction_amount = excluded.max_transaction_amount,
        daily_spend_limit = excluded.daily_spend_limit,
        weekly_spend_limit = excluded.weekly_spend_limit,
        max_positions = excluded.max_positions,
        enabled = excluded.enabled
    `);

    stmt.run(
      settings.max_transaction_amount,
      settings.daily_spend_limit,
      settings.weekly_spend_limit,
      settings.max_positions,
      settings.enabled ? 1 : 0
    );

    return { success: true };
  });

  // Watchlist Management
  ipcMain.handle('get-watchlists', () => {
    return db.prepare('SELECT * FROM watchlists ORDER BY is_default DESC, name ASC').all();
  });

  ipcMain.handle('get-watchlist', (event, id) => {
    const watchlist = db.prepare('SELECT * FROM watchlists WHERE id = ?').get(id);
    if (!watchlist) return null;

    const symbols = db.prepare('SELECT symbol FROM watchlist_symbols WHERE watchlist_id = ? ORDER BY symbol ASC').all(id);
    watchlist.symbols = symbols.map(s => s.symbol);
    return watchlist;
  });

  ipcMain.handle('create-watchlist', (event, watchlist) => {
    const { name, description, symbols } = watchlist;

    try {
      const insertWatchlist = db.prepare('INSERT INTO watchlists (name, description, is_default) VALUES (?, ?, 0)');
      const result = insertWatchlist.run(name, description);
      const watchlistId = result.lastInsertRowid;

      // Insert symbols
      if (symbols && symbols.length > 0) {
        const insertSymbol = db.prepare('INSERT INTO watchlist_symbols (watchlist_id, symbol) VALUES (?, ?)');
        for (const symbol of symbols) {
          insertSymbol.run(watchlistId, symbol.toUpperCase());
        }
      }

      return { success: true, id: watchlistId };
    } catch (error) {
      console.error('Error creating watchlist:', error);
      throw error;
    }
  });

  ipcMain.handle('update-watchlist', (event, id, watchlist) => {
    const { name, description, symbols } = watchlist;

    try {
      // Update watchlist metadata
      db.prepare('UPDATE watchlists SET name = ?, description = ? WHERE id = ?').run(name, description, id);

      // Replace all symbols
      db.prepare('DELETE FROM watchlist_symbols WHERE watchlist_id = ?').run(id);

      if (symbols && symbols.length > 0) {
        const insertSymbol = db.prepare('INSERT INTO watchlist_symbols (watchlist_id, symbol) VALUES (?, ?)');
        for (const symbol of symbols) {
          insertSymbol.run(id, symbol.toUpperCase());
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating watchlist:', error);
      throw error;
    }
  });

  ipcMain.handle('delete-watchlist', (event, id) => {
    try {
      // Check if it's the default watchlist
      const watchlist = db.prepare('SELECT is_default FROM watchlists WHERE id = ?').get(id);
      if (watchlist && watchlist.is_default) {
        throw new Error('Cannot delete the default watchlist');
      }

      // Set any profiles using this watchlist to null
      db.prepare('UPDATE screening_profiles SET watchlist_id = NULL WHERE watchlist_id = ?').run(id);

      // Delete watchlist (symbols will cascade delete)
      db.prepare('DELETE FROM watchlists WHERE id = ?').run(id);

      return { success: true };
    } catch (error) {
      console.error('Error deleting watchlist:', error);
      throw error;
    }
  });

  ipcMain.handle('add-symbol-to-watchlist', (event, watchlistId, symbol) => {
    try {
      db.prepare('INSERT OR IGNORE INTO watchlist_symbols (watchlist_id, symbol) VALUES (?, ?)').run(watchlistId, symbol.toUpperCase());
      return { success: true };
    } catch (error) {
      console.error('Error adding symbol to watchlist:', error);
      throw error;
    }
  });

  ipcMain.handle('remove-symbol-from-watchlist', (event, watchlistId, symbol) => {
    try {
      db.prepare('DELETE FROM watchlist_symbols WHERE watchlist_id = ? AND symbol = ?').run(watchlistId, symbol.toUpperCase());
      return { success: true };
    } catch (error) {
      console.error('Error removing symbol from watchlist:', error);
      throw error;
    }
  });

  // App Settings
  ipcMain.handle('get-app-settings', () => {
    const settings = db.prepare('SELECT key, value FROM app_settings').all();
    // Convert array of {key, value} objects to a single object
    const settingsObj = {};
    for (const setting of settings) {
      settingsObj[setting.key] = setting.value;
    }
    return settingsObj;
  });

  ipcMain.handle('get-app-setting', (event, key) => {
    const result = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
    return result ? result.value : null;
  });

  ipcMain.handle('update-app-setting', (event, key, value) => {
    const stmt = db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(key, value);
    return { success: true };
  });

  ipcMain.handle('update-app-settings', (event, settings) => {
    const stmt = db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);

    // Update each setting in a transaction
    const transaction = db.transaction((settingsObj) => {
      for (const [key, value] of Object.entries(settingsObj)) {
        stmt.run(key, value.toString());
      }
    });

    transaction(settings);
    return { success: true };
  });

  // Scheduler Control
  ipcMain.handle('start-scheduler', () => {
    SchedulerService.start(db);
    return { success: true, status: 'running' };
  });

  ipcMain.handle('stop-scheduler', () => {
    SchedulerService.stop();
    return { success: true, status: 'stopped' };
  });

  ipcMain.handle('get-scheduler-status', () => {
    return SchedulerService.getStatus();
  });

  // Market Data
  ipcMain.handle('get-market-data', async (event, symbol) => {
    try {
      return await DataService.getMarketData(symbol);
    } catch (error) {
      console.error('Error getting market data:', error);
      throw error;
    }
  });

  // Backtesting
  ipcMain.handle('run-backtest', async (event, profileId, startDate, endDate, initialCapital, positionSize) => {
    try {
      const profile = db.prepare('SELECT * FROM screening_profiles WHERE id = ?').get(profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      const profileData = {
        ...profile,
        parameters: JSON.parse(profile.parameters),
      };

      const results = await BacktestService.runBacktest(
        profileData,
        new Date(startDate),
        new Date(endDate),
        initialCapital || 10000,
        positionSize || 1000
      );

      return results;
    } catch (error) {
      console.error('Error running backtest:', error);
      throw error;
    }
  });

  // Statistics
  ipcMain.handle('get-daily-stats', (event, date) => {
    const tradingMode = process.env.TRADING_MODE || 'paper';
    return db.prepare('SELECT * FROM daily_stats WHERE date = ? AND trading_mode = ?').get(date || new Date().toISOString().split('T')[0], tradingMode);
  });
}

// App lifecycle
app.whenReady().then(() => {
  initializeDatabase();
  setupIPC();
  createWindow();

  // Start background services
  PositionMonitorService.start(db);
  console.log('Position monitoring service started');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Cleanup
  PositionMonitorService.stop();
  SchedulerService.stop();
  if (db) {
    db.close();
  }
});
