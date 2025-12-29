
export interface GexDataPoint {
  time: string;
  price: number;
  gamma_per_one_percent_move_vol: number;
  gamma_per_one_percent_move_oi: number;
  gamma_1dte_vol?: number;
  gamma_1dte_oi?: number;
  net_tide?: number;
  gex_vol_change_rate?: number;
  gex_1dte_wall?: number;
  gex_1dte_block?: number;
  gex_1dte_drive?: number;
}

export interface MarketTidePoint {
  timestamp: string;
  net_call_premium: number;
  net_put_premium: number;
  net_volume: number;
}

export interface PriceLevelVolume {
  price: number;
  call_volume: number;
  put_volume: number;
  total_volume: number;
  net_gex: number;
}

export interface AnalysisPacket {
  ticker: string;
  timestamp: string;
  current_price: number;
  
  current_gex_vol: number;
  current_gex_oi: number;
  gex_vol_change_rate: number;

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
}

export interface TradingAlert {
  id: string;
  timestamp: string;
  price: number;
  strategy: 'LONG' | 'SHORT' | 'NEUTRAL';
  pattern?: string; // Identified institutional pattern
  recommendedStrategies?: string[]; // IDs like S1, S2 from StrategyLibrary
  regime: string;
  analysis: string;
  risk: string;
  rawAnalysis: string;
  dteContext?: '0DTE' | '1DTE' | 'MULTI';
  pushedToDiscord?: boolean;
}

export type AppTab = 'dashboard' | 'strategy' | 'audit' | 'terminal' | 'settings';
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