
export interface GexDataPoint {
  time: string;
  price: number;
  gamma_per_one_percent_move_vol: number;
  gamma_per_one_percent_move_oi: number;
  // New 1DTE metrics
  gamma_1dte_vol?: number;
  gamma_1dte_oi?: number;
}

export interface AnalysisPacket {
  ticker: string;
  timestamp: string;
  current_price: number;
  
  // 0DTE (Today)
  current_gex_vol: number;
  current_gex_oi: number;
  gex_vol_change_rate: number;

  // 1DTE (Next Day)
  current_1dte_vol: number;
  current_1dte_oi: number;
  gex_1dte_wall: number;   // Key strike level
  gex_1dte_block: number;  // Concentrated liquidity
  gex_1dte_drive: number;  // Momentum gradient
  
  trend_data: GexDataPoint[];
}

export interface TradingAlert {
  id: string;
  timestamp: string;
  price: number;
  strategy: 'LONG' | 'SHORT' | 'NEUTRAL';
  regime: string;
  analysis: string;
  risk: string;
  rawAnalysis: string;
  // Enhanced analysis context
  dteContext?: '0DTE' | '1DTE' | 'MULTI';
}

export enum GexRegime {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE'
}

export type HistoryViewMode = 'table' | 'chart';
export type RegimeFilter = 'ALL' | 'POSITIVE' | 'NEGATIVE';
export type AppTab = 'dashboard' | 'strategy' | 'audit' | 'terminal' | 'settings';

export type AppTheme = 'emerald' | 'ocean' | 'obsidian' | 'crimson';
export type AppFontSize = 'xs' | 'sm' | 'base' | 'lg';

export interface SystemError {
  message: string;
  code?: string | number;
  severity: 'warning' | 'error' | 'critical';
  timestamp: number;
  retryable: boolean;
}
