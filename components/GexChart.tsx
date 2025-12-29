
import React, { useState, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, 
  ComposedChart, Area, Bar, Cell, Line, Label
} from 'recharts';
import { GexDataPoint, PriceLevelVolume } from '../types';

interface GexChartProps {
  data: GexDataPoint[];
  priceLevels?: PriceLevelVolume[];
  volatilityTrigger?: number;
  hvnPrice?: number;
  zeroGamma?: number;
}

const lerpColor = (a: string, b: string, amount: number): string => {
  const ah = parseInt(a.replace(/#/g, ''), 16);
  const ar = ah >> 16, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const bh = parseInt(b.replace(/#/g, ''), 16);
  const br = bh >> 16, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = ar + amount * (br - ar);
  const rg = ag + amount * (bg - ag);
  const rb = ab + amount * (bb - ab);

  return '#' + ((1 << 24) + (Math.round(rr) << 16) + (Math.round(rg) << 8) + Math.round(rb)).toString(16).slice(1);
};

const CustomTooltip = (props: any) => {
  const { active, payload, label, hvnPrice, topGexLevels } = props;
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const price = data.price;
    const gex0dte = data.gamma_per_one_percent_move_vol;
    const momentum = data.gex_vol_change_rate || 0;
    const gex1dte = data.gamma_1dte_vol || 0;
    const isPositiveGex = gex0dte >= 0;

    const formatVal = (val: number) => {
      const absVal = Math.abs(val);
      if (absVal >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
      if (absVal >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
      if (absVal >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
      return val.toFixed(0);
    };

    const distToHvn = hvnPrice ? (price - hvnPrice).toFixed(1) : null;

    return (
      <div className="bg-zinc-950/98 border border-zinc-800 p-4 rounded-2xl shadow-2xl backdrop-blur-2xl min-w-[320px] z-[100] ring-1 ring-white/5 font-mono">
        <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-2">
          <div className="flex flex-col">
            <span className="text-[7px] font-black text-zinc-500 uppercase tracking-[0.2em]">采样时间 (Timestamp)</span>
            <span className="text-[11px] font-mono text-emerald-500/90 font-bold">
              {new Date(label).toLocaleString()}
            </span>
          </div>
          <div className={`px-2 py-0.5 rounded text-[7px] font-black uppercase border ${
            isPositiveGex ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}>
            {isPositiveGex ? 'GLUE (流动性粘滞)' : 'FUEL (下行压力加速)'}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">市场快照</span>
            </div>
            <div className="flex justify-between items-center px-2">
              <span className="text-[9px] font-bold text-zinc-400 uppercase">标的价格</span>
              <span className="text-xs font-mono font-black text-white">${price.toFixed(2)}</span>
            </div>
            {distToHvn && (
               <div className="flex justify-between items-center px-2">
                <span className="text-[9px] font-bold text-emerald-500/70 uppercase">距 HVN 中枢</span>
                <span className={`text-[10px] font-mono font-black ${parseFloat(distToHvn) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {parseFloat(distToHvn) > 0 ? '+' : ''}{distToHvn} pts
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-zinc-900">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-1 h-2 bg-amber-500 rounded-full"></div>
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Top 5 敞口节点</span>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {topGexLevels?.map((level: PriceLevelVolume, idx: number) => (
                <div key={idx} className="flex justify-between items-center px-2 py-0.5 rounded bg-zinc-900/50">
                  <span className={`text-[8px] font-black font-mono ${idx === 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                    ${level.price}
                  </span>
                  <span className={`text-[8px] font-mono font-bold ${level.net_gex >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                    {formatVal(level.net_gex)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-zinc-900">
            <div className="flex justify-between items-center px-2">
              <span className="text-[9px] font-bold text-blue-400 uppercase">0DTE GEX</span>
              <span className={`text-xs font-mono font-black ${gex0dte >= 0 ? 'text-blue-400' : 'text-rose-500'}`}>{formatVal(gex0dte)}</span>
            </div>
            <div className="flex justify-between items-center px-2">
              <span className="text-[9px] font-bold text-indigo-400 uppercase">1DTE GEX</span>
              <span className={`text-xs font-mono font-black ${gex1dte >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>{formatVal(gex1dte)}</span>
            </div>
            <div className="flex justify-between items-center px-2">
              <span className="text-[9px] font-bold text-yellow-400 uppercase">变化量 (MOM)</span>
              <span className={`text-xs font-mono font-black ${momentum >= 0 ? 'text-yellow-400' : 'text-rose-500'}`}>{formatVal(momentum)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const GexChart: React.FC<GexChartProps> = ({ data, priceLevels = [], volatilityTrigger, hvnPrice, zeroGamma }) => {
  const [show1Dte, setShow1Dte] = useState(true);
  const [show0Dte, setShow0Dte] = useState(true);
  const [showMomentum, setShowMomentum] = useState(true);
  const [showTide, setShowTide] = useState(false);

  const { topGexLevels, kingStrike } = useMemo(() => {
    const sorted = [...(priceLevels || [])].sort((a, b) => Math.abs(b.net_gex) - Math.abs(a.net_gex));
    return {
      topGexLevels: sorted.slice(0, 5),
      kingStrike: sorted[0]
    };
  }, [priceLevels]);

  const formatVal = (val: number) => {
    const absVal = Math.abs(val);
    if (absVal >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
    if (absVal >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
    if (absVal >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
    return val.toFixed(0);
  };

  const { domainMin, domainMax } = useMemo(() => {
    if (data.length === 0) return { domainMin: 'auto', domainMax: 'auto' };
    const prices = data.map(d => d.price);
    let min = Math.min(...prices);
    let max = Math.max(...prices);
    
    if (volatilityTrigger) { min = Math.min(min, volatilityTrigger); max = Math.max(max, volatilityTrigger); }
    if (hvnPrice) { min = Math.min(min, hvnPrice); max = Math.max(max, hvnPrice); }
    if (zeroGamma) { min = Math.min(min, zeroGamma); max = Math.max(max, zeroGamma); }
    topGexLevels.forEach(l => { min = Math.min(min, l.price); max = Math.max(max, l.price); });

    const padding = (max - min) * 0.45;
    return { domainMin: min - padding, domainMax: max + padding };
  }, [data, volatilityTrigger, hvnPrice, zeroGamma, topGexLevels]);

  const maxAbsMetrics = useMemo(() => {
    if (data.length === 0) return 1;
    const vals = data.flatMap(d => [
      Math.abs(d.gamma_per_one_percent_move_vol || 0),
      Math.abs(d.gamma_1dte_vol || 0),
      Math.abs(d.gex_vol_change_rate || 0),
      Math.abs(d.net_tide || 0) * 0.5
    ]);
    return Math.max(...vals, 1e6); // Default min scale of 1M
  }, [data]);

  const getGexColor = (value: number) => {
    const intensity = Math.min(Math.abs(value) / (maxAbsMetrics * 0.8), 1);
    const isPositive = value >= 0;
    
    if (isPositive) {
      return lerpColor('#60a5fa', '#1e3a8a', intensity);
    } else {
      return lerpColor('#fb7185', '#881337', intensity);
    }
  };

  return (
    <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800/50 h-[450px] relative overflow-hidden group font-mono">
      <div className="flex justify-between items-center mb-6 relative z-30">
        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
            <i className="fa-solid fa-layer-group text-emerald-500"></i>
            对冲结构分析矩阵 (Gamma Matrix)
          </h3>
          <p className="text-[8px] text-zinc-600 font-bold uppercase mt-1 tracking-widest">CRITICAL PRICE PILLARS</p>
        </div>
        <div className="flex gap-1 flex-wrap justify-end max-w-[60%]">
           <button onClick={() => setShow0Dte(!show0Dte)} className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase transition-all border ${show0Dte ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>0DTE</button>
           <button onClick={() => setShow1Dte(!show1Dte)} className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase transition-all border ${show1Dte ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>1DTE</button>
           <button onClick={() => setShowMomentum(!showMomentum)} className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase transition-all border ${showMomentum ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>MOM</button>
           <button onClick={() => setShowTide(!showTide)} className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase transition-all border ${showTide ? 'bg-amber-400/20 border-amber-400/50 text-yellow-300' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>TIDE</button>
        </div>
      </div>

      <div className="relative z-20 h-full">
        <ResponsiveContainer width="100%" height="80%">
          <ComposedChart data={data} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
            <XAxis dataKey="time" tickFormatter={(time) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} stroke="#3f3f46" fontSize={8} axisLine={false} tick={{ fill: '#52525b' }} />
            
            <YAxis 
              yAxisId="left" 
              orientation="left" 
              domain={[domainMin, domainMax]} 
              stroke="#10b981" 
              fontSize={8} 
              axisLine={false} 
              tick={{ fill: '#10b981' }} 
              tickFormatter={(val) => `$${val.toFixed(0)}`} 
            />
            
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#52525b" 
              fontSize={8} 
              axisLine={false} 
              domain={[-maxAbsMetrics * 1.5, maxAbsMetrics * 1.5]} 
              tick={{ fill: '#52525b' }}
              tickFormatter={formatVal}
            />
            
            <Tooltip content={<CustomTooltip hvnPrice={hvnPrice} topGexLevels={topGexLevels} />} isAnimationActive={false} cursor={{ stroke: '#3f3f46', strokeWidth: 1 }} />
            <ReferenceLine yAxisId="right" y={0} stroke="#3f3f46" strokeWidth={1} strokeOpacity={0.5} />
            
            {hvnPrice && (
              <ReferenceLine yAxisId="left" y={hvnPrice} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2}>
                <Label position="right" content={(props: any) => {
                  const { y, viewBox } = props;
                  return (
                    <g transform={`translate(${viewBox.width - 150}, ${y - 18})`}>
                      <rect width="140" height="30" rx="8" fill="#10b981" fillOpacity={0.9} />
                      <text x="70" y="19" textAnchor="middle" fill="#000" fontSize="10" fontWeight="900" className="font-mono uppercase tracking-tighter">CORE HVN: ${hvnPrice}</text>
                    </g>
                  );
                }} />
              </ReferenceLine>
            )}

            {volatilityTrigger && (
              <ReferenceLine yAxisId="left" y={volatilityTrigger} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={2}>
                <Label position="right" content={(props: any) => {
                  const { y, viewBox } = props;
                  return (
                    <g transform={`translate(${viewBox.width - 180}, ${y - 15})`}>
                      <rect width="170" height="30" rx="8" fill="#f43f5e" fillOpacity={0.9} />
                      <text x="85" y="19" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="900" className="font-mono uppercase tracking-tighter">VT (TRIGGER): ${volatilityTrigger}</text>
                    </g>
                  );
                }} />
              </ReferenceLine>
            )}

            {zeroGamma && (
              <ReferenceLine yAxisId="left" y={zeroGamma} stroke="#a1a1aa" strokeDasharray="2 2" strokeWidth={1.5}>
                <Label position="left" content={(props: any) => {
                  const { y } = props;
                  return (
                    <g transform={`translate(25, ${y - 12})`}>
                      <rect width="110" height="24" rx="6" fill="#18181b" stroke="#3f3f46" />
                      <text x="55" y="15" textAnchor="middle" fill="#a1a1aa" fontSize="9" fontWeight="900" className="font-mono uppercase tracking-tighter">ZERO G: ${zeroGamma}</text>
                    </g>
                  );
                }} />
              </ReferenceLine>
            )}

            {kingStrike && (
              <ReferenceLine yAxisId="left" y={kingStrike.price} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 3">
                <Label position="right" content={(props: any) => {
                  const { y, viewBox } = props;
                  return (
                    <g transform={`translate(${viewBox.width - 130}, ${y - 12})`}>
                      <rect width="120" height="24" rx="6" fill="#f59e0b" fillOpacity={0.95} />
                      <text x="60" y="16" textAnchor="middle" fill="#000" fontSize="10" fontWeight="950" className="font-mono uppercase tracking-tight">KING: ${kingStrike.price}</text>
                    </g>
                  );
                }} />
              </ReferenceLine>
            )}

            <Area yAxisId="left" type="monotone" dataKey="price" stroke="#10b981" fill="#10b981" fillOpacity={0.03} strokeWidth={2} dot={false} isAnimationActive={false} />
            
            {show0Dte && (
              <Bar yAxisId="right" dataKey="gamma_per_one_percent_move_vol" isAnimationActive={false} barSize={6}>
                 {data.map((entry, index) => <Cell key={`cell-${index}`} fill={getGexColor(entry.gamma_per_one_percent_move_vol)} fillOpacity={0.85} />)}
              </Bar>
            )}
            
            {show1Dte && (
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="gamma_1dte_vol" 
                stroke="#818cf8" 
                strokeWidth={3} 
                dot={false} 
                isAnimationActive={false} 
                className="drop-shadow-[0_0_10px_rgba(129,140,248,0.5)]" 
              />
            )}
            
            {showMomentum && <Line yAxisId="right" type="monotone" dataKey="gex_vol_change_rate" stroke="#fde047" strokeWidth={2} dot={false} isAnimationActive={false} strokeOpacity={0.7} />}
            {showTide && <Line yAxisId="right" type="monotone" dataKey="net_tide" stroke="#fbbf24" strokeWidth={2} dot={false} isAnimationActive={false} />}
          </ComposedChart>
        </ResponsiveContainer>
        
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 px-4 py-2 bg-black/20 rounded-xl border border-zinc-900/50 backdrop-blur-sm text-[7px] font-black uppercase tracking-widest">
           <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-blue-500 rounded-sm"></div><span>0DTE GEX</span></div>
           <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-indigo-400 rounded-full shadow-[0_0_5px_rgba(129,140,248,0.5)]"></div><span>1DTE GEX</span></div>
           <div className="flex items-center gap-1.5"><div className="w-2 h-px border-t border-dashed border-emerald-500"></div><span>CORE HVN</span></div>
           <div className="flex items-center gap-1.5"><div className="w-2 h-px border-t border-dotted border-amber-500"></div><span>KING STRIKE</span></div>
           <div className="flex items-center gap-1.5"><div className="w-2 h-px border-t border-dotted border-rose-500"></div><span>VOL TRIGGER (VT)</span></div>
           <div className="flex items-center gap-1.5"><div className="w-2 h-px border-t border-dashed border-zinc-500"></div><span>ZERO GAMMA</span></div>
        </div>
      </div>
    </div>
  );
};

export default GexChart;
