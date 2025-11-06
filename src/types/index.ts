/**
 * TypeScript Type Definitions
 * Comprehensive types for the Alpaca Trading Scanner
 */

// ============================================================================
// Account & Configuration Types
// ============================================================================

export interface AccountInfo {
  id: string;
  cash: number;
  buying_power: number;
  portfolio_value: number;
  equity: number;
  last_equity: number;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  account_blocked: boolean;
  status: string;
  currency: string;
  daytrade_count: number;
  mode: 'paper' | 'live';
}

export type TradingMode = 'paper' | 'live';

// ============================================================================
// Screening Profile Types
// ============================================================================

export type AssetType = 'stock' | 'call_option' | 'put_option';

export interface StockParameters {
  // Price metrics
  priceMin?: number;
  priceMax?: number;
  dayChangeMin?: number;
  dayChangeMax?: number;
  week52HighMin?: number;
  week52HighMax?: number;

  // Volume
  volumeMin?: number;
  volumeMax?: number;
  avgVolumeMin?: number;
  avgVolumeMax?: number;
  volumeRatioMin?: number;
  volumeRatioMax?: number;

  // Fundamentals
  peMin?: number;
  peMax?: number;
  pbMin?: number;
  pbMax?: number;
  epsMin?: number;
  epsMax?: number;
  marketCapMin?: number;
  marketCapMax?: number;
  dividendYieldMin?: number;
  dividendYieldMax?: number;
  debtToEquityMax?: number;
  currentRatioMin?: number;

  // Technical Indicators
  rsiMin?: number;
  rsiMax?: number;
  macdSignal?: 'bullish' | 'bearish' | 'any';
  sma20Above?: boolean;
  sma50Above?: boolean;
  sma200Above?: boolean;
  betaMin?: number;
  betaMax?: number;

  // Filters
  sectors?: string[];
  exchanges?: string[];
}

export interface OptionsParameters {
  // Basic
  strikeMin?: number;
  strikeMax?: number;
  expirationMinDays?: number;
  expirationMaxDays?: number;

  // Greeks
  deltaMin?: number;
  deltaMax?: number;
  gammaMin?: number;
  gammaMax?: number;
  thetaMin?: number;
  thetaMax?: number;
  vegaMin?: number;
  vegaMax?: number;

  // Pricing
  bidMin?: number;
  bidMax?: number;
  askMin?: number;
  askMax?: number;
  bidAskSpreadMax?: number;
  premiumMin?: number;
  premiumMax?: number;

  // Volume & Interest
  openInterestMin?: number;
  volumeMin?: number;
  volumeOIRatioMin?: number;

  // Moneyness
  moneyness?: 'ITM' | 'ATM' | 'OTM' | 'any';
}

export type ScreeningParameters = StockParameters | OptionsParameters;

export interface ScreeningProfile {
  id?: number;
  name: string;
  asset_type: AssetType;
  parameters: ScreeningParameters;
  schedule_enabled: boolean;
  schedule_interval: number;
  schedule_market_hours_only: boolean;
  auto_execute: boolean;
  max_transaction_amount?: number;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Scan Results Types
// ============================================================================

export interface ScanResult {
  id: number;
  profile_id: number;
  symbol: string;
  asset_type: AssetType;
  scan_timestamp: string;
  parameters_snapshot: ScreeningParameters;
  market_data_snapshot: MarketData;
}

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  change: number;
  changePercent: number;
  fundamentals?: FundamentalData;
  technical?: TechnicalData;
}

export interface FundamentalData {
  pe: number;
  pb: number;
  eps: number;
  marketCap: number;
  dividendYield: number;
  beta: number;
  sector: string;
  industry: string;
}

export interface TechnicalData {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  sma20: number;
  sma50: number;
  sma200: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
}

// ============================================================================
// Trade Types
// ============================================================================

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
export type OrderStatus = 'pending' | 'filled' | 'rejected' | 'cancelled' | 'partial_fill';

export interface TradeParams {
  profile_id?: number;
  symbol: string;
  quantity: number;
  side: OrderSide;
  order_type: OrderType;
  limit_price?: number;
  stop_price?: number;
  trail_percent?: number;
}

export interface Trade {
  id: number;
  profile_id?: number;
  symbol: string;
  side: OrderSide;
  quantity: number;
  order_type: OrderType;
  limit_price?: number;
  filled_price?: number;
  status: OrderStatus;
  rejection_reason?: string;
  order_id?: string;
  executed_at: string;
  filled_at?: string;
}

// ============================================================================
// Position Types
// ============================================================================

export interface Position {
  id: number;
  symbol: string;
  quantity: number;
  avg_cost: number;
  current_value: number;
  current_price: number;
  stop_loss_percent?: number;
  take_profit_percent?: number;
  unrealized_pl: number;
  unrealized_pl_percent: number;
  opened_at: string;
  last_updated: string;
}

// ============================================================================
// Risk Management Types
// ============================================================================

export interface RiskSettings {
  id: number;
  max_transaction_amount: number;
  daily_spend_limit: number;
  weekly_spend_limit: number;
  max_positions: number;
  enabled: boolean;
  stop_loss_default: number;
  take_profit_default: number;
  allow_duplicate_positions: boolean;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface DailyStats {
  date: string;
  scans_run: number;
  matches_found: number;
  orders_placed: number;
  orders_filled: number;
  orders_rejected: number;
  total_spent: number;
  positions_opened: number;
  positions_closed: number;
  realized_pl: number;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  related_profile_id?: number;
  related_symbol?: string;
  read: boolean;
  created_at: string;
}

// ============================================================================
// Scheduler Types
// ============================================================================

export interface SchedulerStatus {
  isRunning: boolean;
  activeJobs: number;
  scheduledProfiles: number[];
}

// ============================================================================
// Market Clock Types
// ============================================================================

export interface MarketClock {
  is_open: boolean;
  timestamp: string;
  next_open: string;
  next_close: string;
}

// ============================================================================
// Electron IPC Types
// ============================================================================

export interface ElectronAPI {
  // Account & Configuration
  getAccountInfo: () => Promise<AccountInfo>;
  getTradingMode: () => Promise<TradingMode>;
  setTradingMode: (mode: TradingMode) => Promise<{ success: boolean; mode: TradingMode }>;

  // Screening Profiles
  getProfiles: () => Promise<ScreeningProfile[]>;
  createProfile: (profile: Omit<ScreeningProfile, 'id'>) => Promise<ScreeningProfile>;
  updateProfile: (id: number, profile: Partial<ScreeningProfile>) => Promise<{ success: boolean }>;
  deleteProfile: (id: number) => Promise<{ success: boolean }>;

  // Scanner Operations
  runScan: (profileId: number) => Promise<ScanResult[]>;
  getScanResults: (profileId: number, limit?: number) => Promise<ScanResult[]>;

  // Trade Operations
  executeTrade: (tradeParams: TradeParams) => Promise<{ success: boolean; order?: any; rejected?: boolean; reason?: string }>;
  getTradeHistory: (filters?: TradeHistoryFilters) => Promise<Trade[]>;

  // Position Management
  getPositions: () => Promise<Position[]>;
  updatePosition: (id: number, updates: { stop_loss_percent: number; take_profit_percent: number }) => Promise<{ success: boolean }>;

  // Risk Settings
  getRiskSettings: () => Promise<RiskSettings>;
  updateRiskSettings: (settings: Partial<RiskSettings>) => Promise<{ success: boolean }>;

  // App Settings
  getAppSettings: () => Promise<Record<string, string>>;
  getAppSetting: (key: string) => Promise<string | null>;
  updateAppSetting: (key: string, value: string) => Promise<{ success: boolean }>;
  updateAppSettings: (settings: Record<string, string>) => Promise<{ success: boolean }>;

  // Scheduler Control
  startScheduler: () => Promise<{ success: boolean; status: string }>;
  stopScheduler: () => Promise<{ success: boolean; status: string }>;
  getSchedulerStatus: () => Promise<SchedulerStatus>;

  // Market Data
  getMarketData: (symbol: string) => Promise<MarketData>;

  // Statistics
  getDailyStats: (date?: string) => Promise<DailyStats>;

  // Event listeners
  onNotification: (callback: (data: Notification) => void) => void;
  onScanComplete: (callback: (data: any) => void) => void;
  onTradeExecuted: (callback: (data: any) => void) => void;
  onError: (callback: (data: any) => void) => void;
}

export interface TradeHistoryFilters {
  profile_id?: number;
  status?: OrderStatus;
  from_date?: string;
  limit?: number;
}

// ============================================================================
// Window Extension
// ============================================================================

declare global {
  interface Window {
    electron: ElectronAPI;
    platform: {
      node: string;
      chrome: string;
      electron: string;
      platform: string;
    };
  }
}
