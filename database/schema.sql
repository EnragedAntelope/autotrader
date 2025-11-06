-- Alpaca Trading Scanner Database Schema

-- Screening Profiles
CREATE TABLE IF NOT EXISTS screening_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  asset_type TEXT CHECK(asset_type IN ('stock', 'call_option', 'put_option')) NOT NULL,
  parameters JSON NOT NULL,
  schedule_enabled BOOLEAN DEFAULT 0,
  schedule_interval INTEGER DEFAULT 15, -- minutes
  schedule_market_hours_only BOOLEAN DEFAULT 1,
  auto_execute BOOLEAN DEFAULT 0,
  max_transaction_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scan Results
CREATE TABLE IF NOT EXISTS scan_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  scan_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  parameters_snapshot JSON NOT NULL,
  market_data_snapshot JSON NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES screening_profiles(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_scan_results_profile_timestamp
ON scan_results(profile_id, scan_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_scan_results_symbol
ON scan_results(symbol);

-- Trade History
CREATE TABLE IF NOT EXISTS trade_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER,
  symbol TEXT NOT NULL,
  side TEXT CHECK(side IN ('buy', 'sell')) NOT NULL,
  quantity INTEGER NOT NULL,
  order_type TEXT CHECK(order_type IN ('market', 'limit', 'stop', 'stop_limit', 'trailing_stop')) NOT NULL,
  limit_price DECIMAL(10,4),
  filled_price DECIMAL(10,4),
  status TEXT CHECK(status IN ('pending', 'filled', 'rejected', 'cancelled', 'partial_fill')) NOT NULL,
  rejection_reason TEXT,
  order_id TEXT, -- Alpaca order ID
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  filled_at TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES screening_profiles(id) ON DELETE SET NULL
);

-- Create index for trade history queries
CREATE INDEX IF NOT EXISTS idx_trade_history_symbol
ON trade_history(symbol);

CREATE INDEX IF NOT EXISTS idx_trade_history_status
ON trade_history(status);

CREATE INDEX IF NOT EXISTS idx_trade_history_executed
ON trade_history(executed_at DESC);

-- Positions Tracker
CREATE TABLE IF NOT EXISTS positions_tracker (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL UNIQUE,
  quantity INTEGER NOT NULL,
  avg_cost DECIMAL(10,4) NOT NULL,
  current_value DECIMAL(10,2),
  current_price DECIMAL(10,4),
  stop_loss_percent DECIMAL(5,2),
  take_profit_percent DECIMAL(5,2),
  unrealized_pl DECIMAL(10,2),
  unrealized_pl_percent DECIMAL(5,2),
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Risk Settings
CREATE TABLE IF NOT EXISTS risk_settings (
  id INTEGER PRIMARY KEY CHECK(id = 1), -- Only one row allowed
  max_transaction_amount DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
  daily_spend_limit DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
  weekly_spend_limit DECIMAL(10,2) NOT NULL DEFAULT 20000.00,
  max_positions INTEGER NOT NULL DEFAULT 10,
  enabled BOOLEAN DEFAULT 1,
  stop_loss_default DECIMAL(5,2) DEFAULT 5.00, -- Default 5% stop loss
  take_profit_default DECIMAL(5,2) DEFAULT 10.00, -- Default 10% take profit
  allow_duplicate_positions BOOLEAN DEFAULT 0
);

-- Insert default risk settings
INSERT OR IGNORE INTO risk_settings (id) VALUES (1);

-- Daily Statistics
CREATE TABLE IF NOT EXISTS daily_stats (
  date DATE PRIMARY KEY,
  scans_run INTEGER DEFAULT 0,
  matches_found INTEGER DEFAULT 0,
  orders_placed INTEGER DEFAULT 0,
  orders_filled INTEGER DEFAULT 0,
  orders_rejected INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  positions_opened INTEGER DEFAULT 0,
  positions_closed INTEGER DEFAULT 0,
  realized_pl DECIMAL(10,2) DEFAULT 0
);

-- Rate Limit Tracking (for API rate limiting)
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL, -- 'alpaca', 'alpha_vantage', etc.
  endpoint TEXT,
  requests_made INTEGER DEFAULT 0,
  limit_period TEXT NOT NULL, -- 'minute', 'hour', 'day'
  period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  max_requests INTEGER NOT NULL
);

-- Notifications/Alerts Log
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT CHECK(type IN ('info', 'success', 'warning', 'error')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_profile_id INTEGER,
  related_symbol TEXT,
  read BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (related_profile_id) REFERENCES screening_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_read
ON notifications(read, created_at DESC);

-- Application Settings/Configuration
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default app settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES
  ('theme', 'light'),
  ('notifications_enabled', 'true'),
  ('sound_alerts', 'false'),
  ('scheduler_running', 'false'),
  ('default_order_type', 'limit'),
  ('limit_price_offset_percent', '0.5'),
  -- Rate limit settings (user-configurable)
  ('alpaca_rate_limit_per_minute', '10000'),  -- Default for paid plan
  ('alpaca_rate_limit_per_day', 'null'),      -- No daily limit for Alpaca
  ('alpha_vantage_rate_limit_per_minute', '5'),  -- Default for free tier
  ('alpha_vantage_rate_limit_per_day', '25');    -- Default for free tier

-- Closed Positions (Historical tracking)
CREATE TABLE IF NOT EXISTS closed_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  avg_open_price DECIMAL(10,4) NOT NULL,
  avg_close_price DECIMAL(10,4) NOT NULL,
  realized_pl DECIMAL(10,2) NOT NULL,
  realized_pl_percent DECIMAL(5,2) NOT NULL,
  holding_period_days INTEGER,
  opened_at TIMESTAMP NOT NULL,
  closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  close_reason TEXT -- 'manual', 'stop_loss', 'take_profit'
);

CREATE INDEX IF NOT EXISTS idx_closed_positions_closed
ON closed_positions(closed_at DESC);

-- Market Data Cache (to reduce API calls)
CREATE TABLE IF NOT EXISTS market_data_cache (
  symbol TEXT NOT NULL,
  data_type TEXT NOT NULL, -- 'quote', 'fundamentals', 'technical'
  data JSON NOT NULL,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  PRIMARY KEY (symbol, data_type)
);

CREATE INDEX IF NOT EXISTS idx_market_data_expires
ON market_data_cache(expires_at);

-- Scheduler Jobs Log
CREATE TABLE IF NOT EXISTS scheduler_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  job_type TEXT NOT NULL, -- 'scan', 'monitor_positions', 'update_data'
  status TEXT CHECK(status IN ('started', 'completed', 'failed')) NOT NULL,
  error_message TEXT,
  execution_time_ms INTEGER,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES screening_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scheduler_log_started
ON scheduler_log(started_at DESC);

-- Backtesting Results (for simple backtesting feature)
CREATE TABLE IF NOT EXISTS backtest_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_matches INTEGER DEFAULT 0,
  hypothetical_trades INTEGER DEFAULT 0,
  hypothetical_pl DECIMAL(10,2),
  results_data JSON, -- Detailed results
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES screening_profiles(id) ON DELETE CASCADE
);

-- Database version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO schema_version (version) VALUES (1);
