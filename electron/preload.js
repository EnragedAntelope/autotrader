const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script - Exposes safe IPC methods to the renderer process
 * This maintains security by only exposing specific channels
 */

contextBridge.exposeInMainWorld('electron', {
  // Account & Configuration
  getAccountInfo: () => ipcRenderer.invoke('get-account-info'),
  getTradingMode: () => ipcRenderer.invoke('get-trading-mode'),
  setTradingMode: (mode) => ipcRenderer.invoke('set-trading-mode', mode),

  // Screening Profiles
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  createProfile: (profile) => ipcRenderer.invoke('create-profile', profile),
  updateProfile: (id, profile) => ipcRenderer.invoke('update-profile', id, profile),
  deleteProfile: (id) => ipcRenderer.invoke('delete-profile', id),

  // Scanner Operations
  runScan: (profileId) => ipcRenderer.invoke('run-scan', profileId),
  getScanResults: (profileId, limit) => ipcRenderer.invoke('get-scan-results', profileId, limit),
  getAllScanResults: (filters) => ipcRenderer.invoke('get-all-scan-results', filters),

  // Trade Operations
  executeTrade: (tradeParams) => ipcRenderer.invoke('execute-trade', tradeParams),
  getTradeHistory: (filters) => ipcRenderer.invoke('get-trade-history', filters),

  // Position Management
  getPositions: () => ipcRenderer.invoke('get-positions'),
  updatePosition: (id, updates) => ipcRenderer.invoke('update-position', id, updates),

  // Risk Settings
  getRiskSettings: () => ipcRenderer.invoke('get-risk-settings'),
  updateRiskSettings: (settings) => ipcRenderer.invoke('update-risk-settings', settings),

  // App Settings
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  getAppSetting: (key) => ipcRenderer.invoke('get-app-setting', key),
  updateAppSetting: (key, value) => ipcRenderer.invoke('update-app-setting', key, value),
  updateAppSettings: (settings) => ipcRenderer.invoke('update-app-settings', settings),

  // Scheduler Control
  startScheduler: () => ipcRenderer.invoke('start-scheduler'),
  stopScheduler: () => ipcRenderer.invoke('stop-scheduler'),
  getSchedulerStatus: () => ipcRenderer.invoke('get-scheduler-status'),

  // Market Data
  getMarketData: (symbol) => ipcRenderer.invoke('get-market-data', symbol),

  // Statistics
  getDailyStats: (date) => ipcRenderer.invoke('get-daily-stats', date),

  // Backtesting
  runBacktest: (profileId, startDate, endDate, initialCapital, positionSize) =>
    ipcRenderer.invoke('run-backtest', profileId, startDate, endDate, initialCapital, positionSize),

  // Update Checker
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // Watchlist Management
  getWatchlists: () => ipcRenderer.invoke('get-watchlists'),
  getWatchlist: (id) => ipcRenderer.invoke('get-watchlist', id),
  createWatchlist: (watchlist) => ipcRenderer.invoke('create-watchlist', watchlist),
  updateWatchlist: (id, watchlist) => ipcRenderer.invoke('update-watchlist', id, watchlist),
  deleteWatchlist: (id) => ipcRenderer.invoke('delete-watchlist', id),
  addSymbolToWatchlist: (watchlistId, symbol) => ipcRenderer.invoke('add-symbol-to-watchlist', watchlistId, symbol),
  removeSymbolFromWatchlist: (watchlistId, symbol) => ipcRenderer.invoke('remove-symbol-from-watchlist', watchlistId, symbol),

  // Event listeners for notifications from main process
  onNotification: (callback) => {
    ipcRenderer.on('notification', (event, data) => callback(data));
  },

  onScanComplete: (callback) => {
    ipcRenderer.on('scan-complete', (event, data) => callback(data));
  },

  onTradeExecuted: (callback) => {
    ipcRenderer.on('trade-executed', (event, data) => callback(data));
  },

  onError: (callback) => {
    ipcRenderer.on('error', (event, data) => callback(data));
  },
});

// Expose platform info
contextBridge.exposeInMainWorld('platform', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron,
  platform: process.platform,
});
