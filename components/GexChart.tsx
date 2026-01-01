
import React, { useState, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, 
  ComposedChart, Area, Bar, Cell, Line, Label
} from 'recharts';
import { GexDataPoint, PriceLevelVolume, TopStrike } from '../types';

interface GexChartProps {
  data: GexDataPoint[];
  priceLevels?: PriceLevelVolume[];
  volatilityTrigger?: number;
  hvnPrice?: number;
  zeroGamma?: number;
  kingStrike?: number;
  topOiStrikes?: TopStrike[];
  topDarkPoolStrikes?: TopStrike[];
}

const formatValue = (val: number) => {
  const absVal = Math.abs(val);
  if (absVal >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
  if (absVal >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
  if (absVal >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
  return val.toFixed(0);
};

// 支柱标签渲染组件
const CustomPillarLabel = (props: any) => {
  const { y, viewBox, text, color, textColor, price, offset = 0 } = props;
  const width = 120;
  const height = 20;
  const finalY = y + offset - height / 2;

  return (
    <g transform={`translate(${viewBox.width - width - 5}, ${finalY})`}>
      <rect width={width} height={height} rx="4" fill={color} className="filter drop-shadow-md" />
      <text x={width / 2} y={height / 2 + 4} textAnchor="middle" fill={textColor} fontSize="9" fontWeight="900" className="font-mono uppercase tracking-tighter">
        {text}: {price}
      </text>
    </g>
  );
};

// 通用坐标轴高亮标签组件 (Callout)
const AxisHighlight = (props: any) => {
  const { viewBox, value, color, labelPrefix, side = 'right', isPrice = false, labelWidth = 75 } = props;
  const { x, y, width } = viewBox;
  
  const labelX = side === 'right' ? x + width + 5 : x - labelWidth - 5;
  const rectWidth = labelWidth;
  const textColor = color === '#000' || color === '#facc15' || color === '#f59e0b' ? '#000' : '#fff';
  const displayValue = isPrice ? `$${value.toFixed(1)}` : formatValue(value);

  return (
    <g transform={`translate(${labelX}, ${y - 10})`}>
      <rect width={rectWidth} height={20} rx="4" fill={color} className="filter drop-shadow-lg shadow-black" />
      <text 
        x={rectWidth / 2} 
        y="14" 
        textAnchor="middle" 
        fill={textColor} 
        fontSize="9" 
        fontWeight="900" 
        className="font-mono tracking-tighter"
      >
        {labelPrefix}: {displayValue}
      </text>
    </g>
  );
};

// 专业级 Tooltip
const CustomTooltip = (props: any) => {
  const { active, payload, label } = props;
  if (active && payload && payload.length) {
    const d = payload.find((p: any) => p.dataKey === 'price')?.payload || payload[0].payload;
    const isPos = d.gamma_per_one_percent_move_vol >= 0;

    return (
      <div className="bg-zinc-950/95 border border-zinc-800 p-4 rounded-xl shadow-2xl backdrop-blur-xl min-w-[260px] font-mono ring-1 ring-white/5">
        <div className="flex justify-between items-center mb-3 border-b border-zinc-800 pb-2">
           <span className="text-[10px] font-black text-zinc-500 uppercase">{new Date(label).toLocaleTimeString()}</span>
           <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${isPos ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'}`}>
             {isPos ? 'GLUE 模式' : 'FUEL 模式'}
           </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between"><span className="text-[9px] text-zinc-500 font-bold uppercase">标的价格</span><span className="text-sm font-black text-white">${d.price.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-[9px] text-zinc-500 font-bold uppercase">0DTE GEX</span><span className={`text-[11px] font-black ${isPos ? 'text-blue-400' : 'text-rose-400'}`}>{formatValue(d.gamma_per_one_percent_move_vol)}</span></div>
          
          <div className="pt-2 mt-2 border-t border-zinc-900 grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-[8px] text-zinc-600 font-bold uppercase">1DTE GEX</span>
            <span className="text-[10px] font-bold text-indigo-400 text-right">{formatValue(d.gamma_1dte_vol || 0)}</span>
            
            <span className="text-[8px] text-zinc-600 font-bold uppercase">Tide (潮汐)</span>
            <span className="text-[10px] font-bold text-amber-500 text-right">{formatValue(d.net_tide || 0)}</span>
            
            <span className="text-[8px] text-zinc-600 font-bold uppercase">Momentum</span>
            <span className="text-[10px] font-bold text-yellow-400 text-right">{formatValue(d.gex_vol_change_rate || 0)}</span>

            <span className="text-[8px] text-zinc-600 font-bold uppercase">Velocity</span>
            <span className="text-[10px] font-bold text-zinc-400 text-right">{formatValue(d.gex_velocity || 0)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const GexChart: React.FC<GexChartProps> = ({ 
  data, 
  priceLevels = [], 
  volatilityTrigger, 
  hvnPrice, 
  zeroGamma, 
  kingStrike,
  topOiStrikes = [],
  topDarkPoolStrikes = []
}) => {
  const [showProfile, setShowProfile] = useState(true);
  
  // 核心支柱配置
  const rawPillars = useMemo(() => {
    const p = [];
    if (volatilityTrigger) p.push({ price: volatilityTrigger, text: "VT TRIGGER", color: "#f43f5e", textColor: "#fff" });
    if (kingStrike) p.push({ price: kingStrike, text: "KING STRIKE", color: "#f59e0b", textColor: "#000" });
    if (zeroGamma) p.push({ price: zeroGamma, text: "0G FLIP", color: "#3f3f46", textColor: "#fff" });
    if (hvnPrice) p.push({ price: hvnPrice, text: "HVN NODE", color: "#10b981", textColor: "#000" });
    return p;
  }, [volatilityTrigger, hvnPrice, zeroGamma, kingStrike]);

  // 获取最新数值用于实时坐标高亮
  const metrics = useMemo(() => {
    if (!data.length) return { price: 0, momentum: 0, tide: 0, gex: 0 };
    const last = data[data.length - 1];
    return {
      price: last.price,
      momentum: last.gex_vol_change_rate || 0,
      tide: last.net_tide || 0,
      gex: last.gamma_per_one_percent_move_vol || 0
    };
  }, [data]);

  // 自适应坐标轴范围
  const { domainMin, domainMax } = useMemo(() => {
    if (data.length === 0) return { domainMin: 5000, domainMax: 5500 };
    const prices = data.map(d => d.price);
    const minP = Math.min(...prices, ...rawPillars.map(p => p.price));
    const maxP = Math.max(...prices, ...rawPillars.map(p => p.price));
    const pad = (maxP - minP) * 0.3;
    return { domainMin: Math.floor(minP - pad), domainMax: Math.ceil(maxP + pad) };
  }, [data, rawPillars]);

  // 计算 Y 轴 Gamma 剖面分布 (Profile) - 仅显示 Top 6 读数，并标注 Top 1
  const { strikeProfile, top1Strike } = useMemo(() => {
    const sorted = [...priceLevels].sort((a, b) => Math.abs(b.net_gex) - Math.abs(a.net_gex));
    const top6 = sorted.slice(0, 6)
      .map(l => ({
        strike: l.price,
        gex: l.net_gex,
        oi: l.open_interest || 0,
        isMajor: l.price === kingStrike || l.price === zeroGamma,
        isTop1: sorted.length > 0 && l.price === sorted[0].price
      }))
      .filter(l => l.strike >= domainMin && l.strike <= domainMax)
      .sort((a, b) => a.strike - b.strike);

    return { strikeProfile: top6, top1Strike: sorted.length > 0 ? sorted[0].price : null };
  }, [priceLevels, domainMin, domainMax, kingStrike, zeroGamma]);

  const maxAbsGexScale = useMemo(() => {
    const vals = data.flatMap(d => [
      Math.abs(d.gamma_per_one_percent_move_vol || 0),
      Math.abs(d.gamma_1dte_vol || 0),
      Math.abs(d.net_tide || 0),
      Math.abs(d.gex_vol_change_rate || 0)
    ]);
    return Math.max(...vals, 1e6);
  }, [data]);

  return (
    <div className="bg-zinc-900/20 p-6 rounded-2xl border border-zinc-800/50 h-[560px] relative overflow-hidden flex flex-col font-mono">
      {/* 头部控制栏 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> 
            对冲结构分析矩阵 (Gamma Matrix v3.0)
          </h3>
          <p className="text-[8px] text-zinc-600 font-bold uppercase mt-1 tracking-widest">
            Top 1 Node Highlighting & Coordinate Precision Alignment
          </p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setShowProfile(!showProfile)} 
             className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border transition-all ${showProfile ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}
           >
             Targeted Profile
           </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 relative">
        {/* 左侧：Strike Profile (仅 Top 6 GEX 读数，高亮 Top 1) */}
        {showProfile && (
          <div className="w-24 h-full border-r border-zinc-900 pr-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart layout="vertical" data={strikeProfile} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <XAxis type="number" hide domain={['auto', 'auto']} />
                <YAxis dataKey="strike" type="number" hide domain={[domainMin, domainMax]} />
                <Bar dataKey="gex" isAnimationActive={false}>
                  {strikeProfile.map((entry, index) => (
                    <Cell 
                      key={index} 
                      fill={entry.isTop1 ? '#facc15' : (entry.gex >= 0 ? '#3b82f6' : '#f43f5e')} 
                      fillOpacity={entry.isTop1 ? 1 : (entry.isMajor ? 0.9 : 0.6)}
                      stroke={entry.isTop1 ? '#fff' : 'none'}
                      strokeWidth={entry.isTop1 ? 1 : 0}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <div className="absolute top-0 left-0 text-[7px] font-black text-zinc-700 uppercase vertical-text">
               Top 6 Nodes | <span className="text-yellow-500">Gold: Top 1 GEX</span>
            </div>
          </div>
        )}

        {/* 主视窗：Time-Series Analysis */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 85, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
              <XAxis 
                dataKey="time" 
                tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                stroke="#52525b" fontSize={9} axisLine={false} fontWeight="bold"
              />
              <YAxis 
                yAxisId="price" 
                orientation="left" 
                domain={[domainMin, domainMax]} 
                stroke="#71717a" fontSize={10} axisLine={false} fontWeight="900"
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis 
                yAxisId="gex" 
                orientation="right"
                domain={[-maxAbsGexScale * 1.5, maxAbsGexScale * 1.5]} 
                stroke="#52525b" fontSize={9} axisLine={false} fontWeight="900"
                tickFormatter={(v) => formatValue(v)}
              />
              
              <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ stroke: '#27272a', strokeWidth: 1 }} />

              {/* === 左侧轴高亮：实时价格 === */}
              <ReferenceLine 
                yAxisId="price" 
                y={metrics.price} 
                stroke="#10b981" 
                strokeWidth={1} 
                strokeDasharray="2 2" 
                strokeOpacity={0.4}
              >
                <Label 
                  content={<AxisHighlight value={metrics.price} color="#10b981" labelPrefix="PRICE" side="left" isPrice={true} labelWidth={75} />} 
                  position="left" 
                />
              </ReferenceLine>

              {/* === 左侧轴高亮：Top 2 OI 读数 === */}
              {topOiStrikes.slice(0, 2).map((oi, idx) => (
                <ReferenceLine 
                  key={`oi-${idx}`}
                  yAxisId="price" 
                  y={oi.price} 
                  stroke="transparent"
                >
                  <Label 
                    content={<AxisHighlight value={oi.value} color="#818cf8" labelPrefix={`OI-${idx+1}`} side="left" labelWidth={70} />} 
                    position="left" 
                  />
                </ReferenceLine>
              ))}

              {/* === 右侧轴高亮：多维流量读数 === */}
              <ReferenceLine yAxisId="gex" y={metrics.momentum} stroke="transparent">
                <Label content={<AxisHighlight value={metrics.momentum} color="#facc15" labelPrefix="MOM" />} position="right" />
              </ReferenceLine>

              <ReferenceLine yAxisId="gex" y={metrics.tide} stroke="transparent" offset={25}>
                <Label content={<AxisHighlight value={metrics.tide} color="#f59e0b" labelPrefix="TIDE" />} position="right" />
              </ReferenceLine>

              <ReferenceLine yAxisId="gex" y={metrics.gex} stroke="transparent" offset={50}>
                <Label 
                  content={<AxisHighlight value={metrics.gex} color={metrics.gex >= 0 ? '#3b82f6' : '#f43f5e'} labelPrefix="GEX" />} 
                  position="right" 
                />
              </ReferenceLine>

              {/* 关键支柱标签 (价格锚点) */}
              {rawPillars.map((p, idx) => (
                <ReferenceLine key={idx} yAxisId="price" y={p.price} stroke="transparent">
                  <Label content={<CustomPillarLabel text={p.text} color={p.color} textColor={p.textColor} price={p.price} />} />
                </ReferenceLine>
              ))}

              {/* 价格主曲线：带光晕效果 */}
              <Area 
                yAxisId="price" 
                type="monotone" 
                dataKey="price" 
                stroke="#10b981" 
                strokeWidth={3} 
                fill="url(#priceGradient)" 
                isAnimationActive={false} 
              />
              
              {/* 0DTE Gamma 柱状图 (对冲背景色) */}
              <Bar yAxisId="gex" dataKey="gamma_per_one_percent_move_vol" barSize={4}>
                {data.map((entry, index) => (
                  <Cell 
                    key={index} 
                    fill={entry.gamma_per_one_percent_move_vol >= 0 ? '#3b82f6' : '#f43f5e'} 
                    fillOpacity={0.15} 
                  />
                ))}
              </Bar>

              <Line yAxisId="gex" type="monotone" dataKey="gex_vol_change_rate" stroke="#facc15" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="gex" type="monotone" dataKey="net_tide" stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
              <Line yAxisId="gex" type="monotone" dataKey="gamma_1dte_vol" stroke="#818cf8" strokeWidth={2} dot={false} isAnimationActive={false} />

              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 右侧：机构节点快速预览 (OI & DP) */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-1 pointer-events-none opacity-20">
           {topOiStrikes.slice(0, 2).map((s, i) => (
             <div key={i} className="bg-blue-900/20 border border-blue-500/30 px-1 py-0.5 rounded text-[7px] font-black text-blue-400">
               OI:{s.price}
             </div>
           ))}
           {topDarkPoolStrikes.slice(0, 1).map((s, i) => (
             <div key={i} className="bg-amber-900/20 border border-amber-500/30 px-1 py-0.5 rounded text-[7px] font-black text-amber-400">
               DP:{s.price}
             </div>
           ))}
        </div>
      </div>

      {/* 底部图例与状态 */}
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-zinc-900 pt-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-emerald-500 rounded-full"></div>
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">SPX PRICE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-blue-500/40 rounded-full"></div>
            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">0DTE GEX</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-indigo-400 rounded-full"></div>
            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">OI READS</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-amber-500 stroke-dasharray-3 rounded-full"></div>
            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">MARKET TIDE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-yellow-400 rounded-full"></div>
            <span className="text-[8px] font-black text-yellow-400 uppercase tracking-widest">MOMENTUM</span>
          </div>
        </div>
        <div className="text-[8px] text-zinc-700 font-black uppercase tracking-widest italic text-right flex items-center justify-end">
          Engine: Recharts v2.17 | <span className="text-yellow-500">Gold Star: Absolute GEX Max</span>
        </div>
      </div>
    </div>
  );
};

export default GexChart;
