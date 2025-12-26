
import React from 'react';
import { AnalysisPacket } from '../types';

interface MarketStatsProps {
  data: AnalysisPacket | null;
}

const MarketStats: React.FC<MarketStatsProps> = ({ data }) => {
  if (!data) return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
      {[...Array(6)].map((_, i) => <div key={i} className="bg-zinc-900 h-24 rounded-xl border border-zinc-800"></div>)}
    </div>
  );

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  
  const formatGex = (val: number) => {
    const absVal = Math.abs(val);
    if (absVal >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
    if (absVal >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
    if (absVal >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
    return val.toString();
  };

  const isPos0dte = data.current_gex_vol > 0;
  const isPos1dte = data.current_1dte_vol > 0;
  const flowColor = data.gex_vol_change_rate >= 0 ? 'text-emerald-400' : 'text-rose-400';

  return (
    <div className="space-y-4">
      {/* 0DTE Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 shadow-xl backdrop-blur-sm border-l-4 border-l-emerald-500">
          <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
            <i className="fa-solid fa-crosshairs text-emerald-500"></i> 标的现货价
          </p>
          <p className="text-xl font-mono font-bold text-white tracking-tighter">{formatCurrency(data.current_price)}</p>
          <p className="text-[8px] text-zinc-600 font-bold mt-1 uppercase">Ticker: {data.ticker} / 0DTE</p>
        </div>

        <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 shadow-xl backdrop-blur-sm">
          <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
            <i className="fa-solid fa-bolt text-blue-500"></i> 0DTE GEX 流量
          </p>
          <p className={`text-xl font-mono font-bold tracking-tighter ${isPos0dte ? 'text-blue-400' : 'text-rose-400'}`}>
            {formatGex(data.current_gex_vol)}
          </p>
          <div className="flex justify-between items-center mt-1">
             <span className="text-[8px] text-zinc-600 font-bold uppercase">实时对冲敞口</span>
             <span className={`text-[8px] font-black ${flowColor}`}>
               {data.gex_vol_change_rate > 0 ? '▲' : '▼'} {formatGex(Math.abs(data.gex_vol_change_rate))}
             </span>
          </div>
        </div>

        <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 shadow-xl backdrop-blur-sm">
          <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
            <i className="fa-solid fa-layer-group text-blue-300"></i> 0DTE GEX 库存 (OI)
          </p>
          <p className="text-xl font-mono font-bold text-blue-300 tracking-tighter">
            {formatGex(data.current_gex_oi)}
          </p>
          <p className="text-[8px] text-zinc-600 font-bold mt-1 uppercase">静态仓位分布</p>
        </div>

        <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 shadow-xl backdrop-blur-sm bg-gradient-to-br from-zinc-900/80 to-indigo-950/20">
          <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
            <i className="fa-solid fa-calendar-day text-indigo-400"></i> 1DTE 综合流量
          </p>
          <p className={`text-xl font-mono font-bold tracking-tighter ${isPos1dte ? 'text-indigo-400' : 'text-rose-400'}`}>
            {formatGex(data.current_1dte_vol)}
          </p>
          <p className="text-[8px] text-zinc-600 font-bold mt-1 uppercase">次日预期对冲</p>
        </div>
      </div>

      {/* 1DTE Advanced Metrics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900">
         <div className="flex items-center gap-4 px-3 border-r border-zinc-900">
            <div className="w-8 h-8 rounded bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
               <i className="fa-solid fa-chess-rook text-indigo-400 text-xs"></i>
            </div>
            <div>
               <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">1DTE Wall (核心墙)</p>
               <p className="text-sm font-mono font-black text-white">${data.gex_1dte_wall}</p>
            </div>
         </div>
         <div className="flex items-center gap-4 px-3 border-r border-zinc-900">
            <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
               <i className="fa-solid fa-cube text-blue-400 text-xs"></i>
            </div>
            <div>
               <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">1DTE Block (流动性块)</p>
               <p className="text-sm font-mono font-black text-white">{formatGex(data.gex_1dte_block)}</p>
            </div>
         </div>
         <div className="flex items-center gap-4 px-3">
            <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
               <i className="fa-solid fa-gauge-simple-high text-emerald-400 text-xs"></i>
            </div>
            <div>
               <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">1DTE Drive (势能系数)</p>
               <p className="text-sm font-mono font-black text-white">{data.gex_1dte_drive}%</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default MarketStats;
