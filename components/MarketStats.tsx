
import React, { useMemo } from 'react';
import { AnalysisPacket, PriceLevelVolume } from '../types';

interface MarketStatsProps {
  data: AnalysisPacket | null;
}

const MarketStats: React.FC<MarketStatsProps> = ({ data }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  
  const formatGex = (val: number) => {
    const absVal = Math.abs(val);
    if (absVal >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
    if (absVal >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
    if (absVal >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
    return val.toString();
  };

  const { major0dtePos, major0dteNeg, major1dtePos, major1dteNeg } = useMemo(() => ({
    major0dtePos: data?.major_0dte_pos || null,
    major0dteNeg: data?.major_0dte_neg || null,
    major1dtePos: data?.major_1dte_pos || null,
    major1dteNeg: data?.major_1dte_neg || null
  }), [data]);

  if (!data) return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
      {[...Array(6)].map((_, i) => <div key={i} className="bg-zinc-900 h-24 rounded-xl border border-zinc-800"></div>)}
    </div>
  );

  const isPos0dte = data.current_gex_vol > 0;
  const callPrem = data.market_tide?.net_call_premium || 0;
  const putPrem = data.market_tide?.net_put_premium || 0;
  const callDelta = data.market_tide?.call_premium_change_rate || 0;
  const putDelta = data.market_tide?.put_premium_change_rate || 0;
  const netTide = callPrem - putPrem;

  const getSentiment = () => {
    if (callDelta > 0 && putDelta < 0) return { label: 'STRONG BULLISH', color: 'text-emerald-400' };
    if (callDelta < 0 && putDelta > 0) return { label: 'STRONG BEARISH', color: 'text-rose-400' };
    if (callDelta > 0) return { label: 'BULLISH BIAS', color: 'text-emerald-500/70' };
    if (putDelta > 0) return { label: 'BEARISH BIAS', color: 'text-rose-500/70' };
    return { label: 'NEUTRAL TIDE', color: 'text-zinc-500' };
  };

  const sentiment = getSentiment();

  return (
    <div className="space-y-4 font-mono">
      {/* Institutional Insights: OI & Dark Pool */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 border-l-4 border-l-blue-400 shadow-xl overflow-hidden relative group">
           <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2"><i className="fa-solid fa-layer-group text-blue-400"></i> 0DTE 未平仓合约 (Top 3 OI)</span>
            <i className="fa-solid fa-users-viewfinder text-zinc-800"></i>
          </p>
          <div className="flex gap-4">
            {data.top_oi_strikes.map((s, i) => (
              <div key={i} className="flex-1 bg-blue-500/5 p-2 rounded-xl border border-blue-500/10 text-center">
                 <p className="text-[12px] font-black text-white mb-0.5">${s.price}</p>
                 <p className="text-[10px] font-mono text-blue-400 flex items-center justify-center gap-1">
                   <span>{formatGex(s.value)}</span>
                   <span className="opacity-60">{s.side || ''}</span>
                 </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 border-l-4 border-l-amber-600 shadow-xl overflow-hidden relative group">
           <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2"><i className="fa-solid fa-vault text-amber-500"></i> 机构黑池/大单 (Dark Pool Top 3)</span>
            <i className="fa-solid fa-ghost text-zinc-800"></i>
          </p>
          <div className="flex gap-4">
            {data.top_dark_pool_strikes.map((s, i) => (
              <div key={i} className="flex-1 bg-amber-500/5 p-2 rounded-xl border border-amber-500/10 text-center">
                 <p className="text-[12px] font-black text-white mb-0.5">${s.price}</p>
                 <p className="text-[10px] font-mono text-amber-500 flex items-center justify-center gap-1">
                   <span>{formatGex(s.value)}</span>
                   <span className="opacity-60">{s.side || ''}</span>
                 </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Primary Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 shadow-xl border-l-4 border-l-emerald-500">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center justify-between">
            <span className="flex items-center gap-2"><i className="fa-solid fa-crosshairs text-emerald-500"></i> SPX 现货价</span>
            <span className={`text-[8px] px-1.5 py-0.5 rounded-md border tracking-tighter uppercase font-black ${isPos0dte ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
              {isPos0dte ? 'GLUE 粘滞' : 'FUEL 燃油'}
            </span>
          </p>
          <p className="text-2xl font-mono font-black text-white tracking-tighter">{formatCurrency(data.current_price)}</p>
        </div>

        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden group">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center justify-between">
            <span className="flex items-center gap-2"><i className="fa-solid fa-water text-indigo-400"></i> 市场潮汐 (Tide)</span>
            <span className={`text-[8px] font-black uppercase ${sentiment.color}`}>{sentiment.label}</span>
          </p>
          <div className="flex items-end justify-between">
            <p className={`text-2xl font-mono font-black tracking-tighter ${netTide >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatGex(netTide)}
            </p>
            <div className="flex flex-col items-end text-[10px] font-bold font-mono">
               <span className="text-emerald-500/80">C: {formatGex(callPrem)}</span>
               <span className="text-rose-500/80">P: {formatGex(putPrem)}</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 shadow-xl border-l-4 border-l-rose-500/50">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-rose-500"></i> VT 波动率触发
          </p>
          <p className="text-2xl font-mono font-black text-white tracking-tighter">${data.volatility_trigger}</p>
        </div>
      </div>

      {/* Row 2: 0DTE & Sensitive Momentum */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 border-l-4 border-l-blue-500">
          <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mb-1">0DTE 核心支撑 (+)</p>
          <p className="text-xl font-mono font-black text-white">${major0dtePos?.price || '---'}</p>
        </div>
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 border-l-4 border-l-rose-500">
          <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mb-1">0DTE 核心阻力 (-)</p>
          <p className="text-xl font-mono font-black text-white">${major0dteNeg?.price || '---'}</p>
        </div>
        
        {/* Sensitive Momentum Card */}
        <div className="col-span-2 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 border-l-4 border-l-yellow-500 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-1">
            <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
              Ultra-Sensitive Flow Force
            </p>
            <div className="flex items-center gap-1 text-[9px] font-black">
              <span className={data.gex_velocity >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                Vel: {formatGex(data.gex_velocity)}
              </span>
              <span className="text-zinc-700">|</span>
              <span className={data.gex_acceleration >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                Acc: {formatGex(data.gex_acceleration)}
              </span>
            </div>
          </div>
          
          <div className="flex items-end justify-between">
            <p className={`text-2xl font-mono font-black ${data.gex_vol_change_rate >= 0 ? 'text-yellow-400' : 'text-rose-400'}`}>
              {formatGex(data.gex_vol_change_rate)}
            </p>
            <div className="flex flex-col items-end gap-1">
               <div className="text-[8px] font-black text-zinc-500 uppercase flex items-center gap-1">
                 <i className="fa-solid fa-bolt-lightning text-yellow-500"></i> OFI Intensity
               </div>
               <div className="w-24 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className={`h-full transition-all duration-700 ${data.flow_intensity > 60 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : data.flow_intensity < 40 ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-yellow-500 shadow-[0_0_8px_#fde047]'}`}
                    style={{ width: `${data.flow_intensity}%` }}
                  ></div>
               </div>
            </div>
          </div>
          
          {/* Hover Overlay for Detail */}
          <div className="absolute inset-0 bg-black/95 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center px-4 py-2">
             <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-[9px] text-zinc-500 font-black uppercase">HMA Velocity</span>
                <span className={`text-[9px] font-bold ${data.gex_velocity >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatGex(data.gex_velocity)}/min</span>
                
                <span className="text-[9px] text-zinc-500 font-black uppercase">GEX Force (Acc)</span>
                <span className={`text-[9px] font-bold ${data.gex_acceleration >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatGex(data.gex_acceleration)}/min²</span>
                
                <span className="text-[9px] text-zinc-500 font-black uppercase">Imbalance (OFI)</span>
                <span className="text-[9px] font-bold text-yellow-400">{data.flow_intensity.toFixed(1)}%</span>
             </div>
             <p className="text-[8px] text-zinc-700 font-black uppercase mt-2 italic leading-tight">
               Leading Indicator: Log(Vol) * HMA_Slope * GEX_Bias
             </p>
          </div>
        </div>
      </div>

      {/* Row 3: 1DTE & King */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 border-l-4 border-l-indigo-600">
          <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mb-1">1DTE 结构支撑 (+)</p>
          <p className="text-xl font-mono font-black text-white">${major1dtePos?.price || '---'}</p>
        </div>
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 border-l-4 border-l-rose-800">
          <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mb-1">1DTE 结构阻力 (-)</p>
          <p className="text-xl font-mono font-black text-white">${major1dteNeg?.price || '---'}</p>
        </div>
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 border-l-4 border-l-amber-500">
          <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mb-1">KING STRIKE 锚点</p>
          <p className="text-xl font-mono font-black text-white">${data.king_strike || '---'}</p>
        </div>
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 border-l-4 border-l-zinc-500">
          <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mb-1">翻转点 (0G Flip)</p>
          <p className="text-xl font-mono font-black text-white">${data.zero_gamma || '---'}</p>
        </div>
      </div>
    </div>
  );
};

export default MarketStats;
