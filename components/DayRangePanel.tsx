
import React, { useMemo } from 'react';
import { AnalysisPacket } from '../types';

interface DayRangePanelProps {
  data: AnalysisPacket | null;
}

const DayRangePanel: React.FC<DayRangePanelProps> = ({ data }) => {
  if (!data) return null;

  const results = useMemo(() => {
    const price = data.current_price;
    const vix = data.vix || 15.0;
    const impliedMoveStraddle = data.implied_move || 30.0;
    const gex = data.current_gex_vol;

    // 1. Rule of 16: Expected points = Price * (VIX / 1600)
    const ruleOf16Points = price * (vix / 1600);
    const ruleOf16Range = { low: price - ruleOf16Points, high: price + ruleOf16Points };

    // 2. ATM Straddle Method: Range = 1.25 * Implied Straddle Price
    const straddlePoints = impliedMoveStraddle * 1.25;
    const straddleRange = { low: price - straddlePoints, high: price + straddlePoints };

    // 3. GEX Adjusted Range
    // If GEX > 0 (Positive/Glue), suppress volatility (x0.8)
    // If GEX < 0 (Negative/Fuel), expand volatility (x1.2)
    const gexAdjustment = gex >= 0 ? 0.75 : 1.25;
    const gexAdjustedPoints = ruleOf16Points * gexAdjustment;
    const gexRange = { low: price - gexAdjustedPoints, high: price + gexAdjustedPoints };

    return {
      vix,
      impliedMoveStraddle,
      ruleOf16: { points: ruleOf16Points, range: ruleOf16Range },
      straddle: { points: straddlePoints, range: straddleRange },
      gexAdjusted: { points: gexAdjustedPoints, range: gexRange, adjustment: gexAdjustment }
    };
  }, [data]);

  const formatPoints = (p: number) => `±${p.toFixed(2)} PTS`;
  const formatRange = (range: { low: number; high: number }) => 
    `${Math.round(range.low)} - ${Math.round(range.high)}`;

  return (
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 shadow-xl font-mono mb-6">
      <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
          <i className="fa-solid fa-arrows-left-right text-indigo-400"></i> 日内预期波动区间 (Expected Range)
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-black text-zinc-600 uppercase">VIX: {results.vix.toFixed(2)}</span>
          <span className="text-[9px] font-black text-zinc-600 uppercase">ATM STRD: ${results.impliedMoveStraddle.toFixed(1)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rule of 16 */}
        <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800 flex flex-col justify-between group hover:border-zinc-700 transition-colors">
          <div>
            <div className="flex justify-between items-start mb-1">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">经典 16 法则</span>
              <i className="fa-solid fa-calculator text-[8px] text-zinc-800"></i>
            </div>
            <p className="text-sm font-black text-white">{formatPoints(results.ruleOf16.points)}</p>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/50">
             <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-1">
               <span>L: {Math.round(results.ruleOf16.range.low)}</span>
               <span>H: {Math.round(results.ruleOf16.range.high)}</span>
             </div>
             <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-[60%] mx-auto opacity-50"></div>
             </div>
          </div>
        </div>

        {/* ATM Straddle */}
        <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800 flex flex-col justify-between group hover:border-zinc-700 transition-colors">
          <div>
            <div className="flex justify-between items-start mb-1">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">0DTE 平值跨式 (1.25x)</span>
              <i className="fa-solid fa-bolt text-[8px] text-amber-500"></i>
            </div>
            <p className="text-sm font-black text-white">{formatPoints(results.straddle.points)}</p>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/50">
             <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-1">
               <span>L: {Math.round(results.straddle.range.low)}</span>
               <span>H: {Math.round(results.straddle.range.high)}</span>
             </div>
             <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 w-[70%] mx-auto opacity-50"></div>
             </div>
          </div>
        </div>

        {/* GEX Adjusted */}
        <div className={`bg-zinc-900/40 p-3 rounded-xl border border-zinc-800 flex flex-col justify-between group hover:border-zinc-700 transition-colors ${results.gexAdjusted.adjustment > 1 ? 'border-rose-900/20' : 'border-blue-900/20'}`}>
          <div>
            <div className="flex justify-between items-start mb-1">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">GEX 动态修正 (Sentinel)</span>
              <span className={`text-[8px] font-black px-1 rounded ${results.gexAdjusted.adjustment > 1 ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'}`}>
                {results.gexAdjusted.adjustment > 1 ? 'FUEL 模式 [扩张]' : 'GLUE 模式 [收敛]'}
              </span>
            </div>
            <p className="text-sm font-black text-white">{formatPoints(results.gexAdjusted.points)}</p>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/50">
             <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-1">
               <span>L: {Math.round(results.gexAdjusted.range.low)}</span>
               <span>H: {Math.round(results.gexAdjusted.range.high)}</span>
             </div>
             <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-700 ${results.gexAdjusted.adjustment > 1 ? 'bg-rose-500 w-[90%]' : 'bg-blue-500 w-[45%]'}`}
                  style={{ margin: '0 auto', opacity: 0.5 }}
                ></div>
             </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex gap-4 text-[9px] font-black text-zinc-700 uppercase tracking-tighter italic">
        <p>● 16法则: $VIX / 16$ 映射年化波动至单日</p>
        <p>● 跨式法: 0DTE ATM Straddle 隐含波动映射</p>
        <p>● GEX修正: 根据 Gamma 敞口状态动态调整做市商抑波/增波倾向</p>
      </div>
    </div>
  );
};

export default DayRangePanel;
