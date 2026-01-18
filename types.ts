
export interface GexDataPoint {
  time: string;
  price: number;
  gamma_per_one_percent_move_vol: number;
  gamma_per_one_percent_move_oi: number;
  gamma_1dte_vol?: number;
  gamma_1dte_oi?: number;
  net_tide?: number;
  gex_vol_change_rate?: number; // Current Momentum
  gex_velocity?: number;        // Rate of change (1st derivative)
  gex_acceleration?: number;    // Change in rate (2nd derivative)
  flow_intensity?: number;      // Combined OFI (Order Flow Imbalance) score
  gex_1dte_wall?: number;
  gex_1dte_block?: number;
  gex_1dte_drive?: number;
  net_call_premium?: number;
  net_put_premium?: number;
}

export interface MarketTidePoint {
  timestamp: string;
  net_call_premium: number;
  net_put_premium: number;
  net_volume: number;
  call_premium_change_rate?: number; 
  put_premium_change_rate?: number;  
}

export interface PriceLevelVolume {
  price: number;
  call_volume: number;
  put_volume: number;
  total_volume: number;
  net_gex: number;
  call_premium?: number;
  put_premium?: number;
  open_interest?: number;
  dark_pool_volume?: number;
}

export interface TopStrike {
  price: number;
  value: number;
  type: 'OI' | 'DARK_POOL';
  side?: 'Call' | 'Put' | 'Total';
}

export interface AnalysisPacket {
  ticker: string;
  timestamp: string;
  current_price: number;
  vix: number;
  implied_move?: number; // Calculated from ATM Straddle
  
  current_gex_vol: number;
  current_gex_oi: number;
  gex_vol_change_rate: number;
  gex_velocity: number;
  gex_acceleration: number;
  flow_intensity: number;

  current_1dte_vol: number;
  current_1dte_oi: number;
  gex_1dte_wall: number;
  gex_1dte_block: number;
  gex_1dte_drive: number;
  
  volatility_trigger: number;
  hvn_price?: number;
  king_strike?: number; 
  zero_gamma?: number;
  trend_data: GexDataPoint[];
  
  market_tide?: MarketTidePoint;
  price_levels?: PriceLevelVolume[];

  major_0dte_pos?: PriceLevelVolume;
  major_0dte_neg?: PriceLevelVolume;
  major_1dte_pos?: PriceLevelVolume;
  major_1dte_neg?: PriceLevelVolume;
  total_0dte_premium?: number;
  total_1dte_premium?: number;

  top_oi_strikes: TopStrike[];
  top_dark_pool_strikes: TopStrike[];
}

export interface TradingAlert {
  id: string;
  timestamp: string;
  price: number;
  strategy: 'LONG' | 'SHORT' | 'NEUTRAL';
  pattern?: string;
  recommendedStrategies?: string[];
  regime: string;
  analysis: string;
  risk: string;
  rawAnalysis: string;
  dteContext?: '0DTE' | '1DTE' | 'MULTI';
  pushedToDiscord?: boolean;
}

export type AppTab = 'dashboard' | 'strategy' | 'audit' | 'terminal' | 'settings' | 'statistics';
export type AppTheme = 'emerald' | 'ocean' | 'obsidian' | 'crimson';
export type AppFontSize = 'xs' | 'sm' | 'base' | 'lg';

export type HistoryViewMode = 'chart' | 'table';
export type RegimeFilter = 'ALL' | 'POSITIVE' | 'NEGATIVE';

export interface SystemError {
  message: string;
  code?: string | number;
  severity: 'warning' | 'error' | 'critical';
  timestamp: number;
  retryable: boolean;
}
