import React, { useState, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, 
  ComposedChart, Area, Bar, Cell, Line, Label
} from 'recharts';
import { GexDataPoint, PriceLevelVolume, TopStrike } from '../types';

// Define the GexChartProps interface
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
  if (absVal >= 1e9) return `${Math.round(val / 1e9)}B`;
  if (absVal >= 1e6) return `${Math.round(val / 1e6)}M`;
  if (absVal >= 1e3) return `${Math.round(val / 1e3)}K`;
  return Math.round(val).toString();
};

// 支柱标签渲染组件
const CustomPillarLabel = (props: any) => {
  const { y, viewBox, text, color, textColor, price, offset = 0 } = props;
  const width = 120;
  const height = 18;
  const finalY = y + offset - height / 2;

  return (
    <g transform={`translate(${viewBox.width - width - 5}, ${finalY})`}>
      <rect width={width} height={height} rx="4" fill={color} className="filter drop-shadow-md" />
      <text x={width / 2} y={height / 2 + 4} textAnchor="middle" fill={textColor} fontSize="8" fontWeight="900" className="font-mono uppercase tracking-tighter">
        {text}: {Math.round(price)}
      </text>
    </g>
  );
};

// 通用坐标轴高亮标签组件 (Callout)
const AxisHighlight = (props: any) => {
  const { viewBox, value, color, labelPrefix, side = 'right', isPrice = false, labelWidth = 105 } = props;
  const { x, y, width } = viewBox;
  
  const labelX = side === 'right' ? x + width + 5 : x - labelWidth - 5;
  const rectHeight = 16;
  const rectWidth = labelWidth;
  const textColor = color === '#000' || color === '#facc15' || color === '#f59e0b' ? '#000' : '#fff';
  const displayValue = isPrice ? `$${Math.round(value)}` : formatValue(value);

  return (
    <g transform={`translate(${labelX}, ${y - rectHeight / 2})`}>
      <rect width={rectWidth} height={rectHeight} rx="2" fill={color} className="filter drop-shadow-lg shadow-black" />
      <text 
        x={rectWidth - 4} 
        y="11" 
        textAnchor="end" 
        fill={textColor} 
        fontSize="7" 
        fontWeight="900" 
        className="font-mono tracking-tighter"
      >
        {labelPrefix}:{displayValue}
      </text>
    </g>
  );
};

// 专业级 Tooltip
const CustomTooltip = (props: any) => {
  const { active, payload, label, top5GexStrikes } = props;
  if (active && payload && payload.length) {
    const d = payload.find((p: any) => p.dataKey === 'price')?.payload || payload[0].payload;
    const isPos = d.gamma_per_one_percent_move_vol >= 0;

    return (
      <div className="bg-zinc-950/95 border border-zinc-800 p-4 rounded-xl shadow-2xl backdrop-blur-xl min-w-[280px] font-mono ring-1 ring-white/5">
        <div className="flex justify-between items-center mb-3 border-b border-zinc-800 pb-2">
           <span className="text-[10px] font-black text-zinc-500 uppercase">{new Date(label).toLocaleTimeString()}</span>
           <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${isPos ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'}`}>
             {isPos ? 'GLUE 模式' : 'FUEL 模式'}
           </span>
        </div>
        
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between"><span className="text-[9px] text-zinc-500 font-bold uppercase">标的价格</span><span className="text-sm font-black text-white">${Math.round(d.price)}</span></div>
          <div className="flex justify-between"><span className="text-[9px] text-zinc-500 font-bold uppercase">0DTE GEX</span><span className={`text-[11px] font-black ${isPos ? 'text-blue-400' : 'text-rose-400'}`}>{formatValue(d.gamma_per_one_percent_move_vol)}</span></div>
          
          <div className="pt-2 mt-2 border-t border-zinc-900 grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-[8px] text-zinc-600 font-bold uppercase">1DTE GEX</span>
            <span className="text-[10px] font-bold text-indigo-400 text-right">{formatValue(d.gamma_1dte_vol || 0)}</span>
            
            <span className="text-[8px] text-zinc-600 font-bold uppercase">Momentum</span>
            <span className="text-[10px] font-bold text-yellow-400 text-right">{formatValue(d.gex_vol_change_rate || 0)}</span>
          </div>
        </div>

        {top5GexStrikes && top5GexStrikes.length > 0 && (
          <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/50">
            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2 border-b border-zinc-800/50 pb-1">
              Top 5 GEX 敞口节点
            </p>
            <div className="space-y-1.5">
              {top5GexStrikes.map((s: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-500 font-bold flex items-center gap-1.5">
                    <span className={`w-1 h-1 rounded-full ${s.net_gex >= 0 ? 'bg-blue-500' : 'bg-rose-500'}`}></span>
                    ${s.price}
                  </span>
                  <span className={`font-black ${s.net_gex >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                    {formatValue(s.net_gex)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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
  
  // 计算 Top 5 绝对 GEX 节点
  const top5GexStrikes = useMemo(() => {
    return [...priceLevels]
      .sort((a, b) => Math.abs(b.net_gex) - Math.abs(a.net_gex))
      .slice(0, 5);
  }, [priceLevels]);

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

  // 计算 Y 轴 Gamma 剖面分布 (Profile)
  const strikeProfile = useMemo(() => {
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

    return top6;
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
            对冲结构分析矩阵 (Gamma Matrix v3.1)
          </h3>
          <p className="text-[8px] text-zinc-600 font-bold uppercase mt-1 tracking-widest">
            Top 5 Abs GEX Strike Highlighting Enabled
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
        {/* 左侧：Strike Profile */}
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
          </div>
        )}

        {/* 主视窗：Time-Series Analysis */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 110, left: 20, bottom: 0 }}>
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
                tickFormatter={(v) => `$${Math.round(v)}`}
              />
              <YAxis 
                yAxisId="gex" 
                orientation="right"
                domain={[-maxAbsGexScale * 1.5, maxAbsGexScale * 1.5]} 
                stroke="#52525b" fontSize={9} axisLine={false} fontWeight="900"
                tickFormatter={(v) => formatValue(v)}
              />
              
              <Tooltip 
                content={<CustomTooltip top5GexStrikes={top5GexStrikes} />} 
                isAnimationActive={false} 
                cursor={{ stroke: '#27272a', strokeWidth: 1 }} 
              />

              {/* === 左侧轴高亮：Top 5 GEX Strikes (指示灯) === */}
              {top5GexStrikes.map((s, idx) => (
                <ReferenceLine 
                  key={`top5-${idx}`}
                  yAxisId="price" 
                  y={s.price} 
                  stroke={s.net_gex >= 0 ? '#3b82f6' : '#f43f5e'} 
                  strokeWidth={2} 
                  strokeOpacity={0.6}
                  strokeDasharray="1 5"
                >
                  <Label 
                    content={
                      <AxisHighlight 
                        value={s.net_gex} 
                        color={s.net_gex >= 0 ? '#3b82f6' : '#f43f5e'} 
                        labelPrefix={`N${idx+1}-${Math.round(s.price)}`} 
                        side="left" 
                        labelWidth={105} 
                      />
                    } 
                    position="left" 
                  />
                </ReferenceLine>
              ))}

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
                  content={<AxisHighlight value={metrics.price} color="#10b981" labelPrefix="PRICE" side="left" isPrice={true} labelWidth={105} />} 
                  position="left" 
                />
              </ReferenceLine>

              {/* === 右侧轴高亮：多维流量读数 === */}
              <ReferenceLine yAxisId="gex" y={metrics.momentum} stroke="transparent">
                <Label content={<AxisHighlight value={metrics.momentum} color="#facc15" labelPrefix="MOM" labelWidth={75} />} position="right" />
              </ReferenceLine>

              {/* 关键支柱标签 (价格锚点) */}
              {rawPillars.map((p, idx) => (
                <ReferenceLine key={idx} yAxisId="price" y={p.price} stroke="transparent">
                  <Label content={<CustomPillarLabel text={p.text} color={p.color} textColor={p.textColor} price={p.price} />} />
                </ReferenceLine>
              ))}

              {/* 价格主曲线 */}
              <Area 
                yAxisId="price" 
                type="monotone" 
                dataKey="price" 
                stroke="#10b981" 
                strokeWidth={3} 
                fill="url(#priceGradient)" 
                isAnimationActive={false} 
              />
              
              {/* 0DTE Gamma 柱状图 */}
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

              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 底部图例 */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-zinc-900 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 bg-emerald-500 rounded-full"></div>
          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">SPX PRICE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 bg-blue-500 rounded-full"></div>
          <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">POS GEX NODE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 bg-rose-500 rounded-full"></div>
          <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">NEG GEX NODE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 bg-yellow-400 rounded-full"></div>
          <span className="text-[8px] font-black text-yellow-400 uppercase tracking-widest">MOMENTUM</span>
        </div>
      </div>
    </div>
  );
};

export default GexChart;