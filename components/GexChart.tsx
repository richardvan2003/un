
import React, { useState } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, 
  ComposedChart, Area, Bar, Brush, Cell, Line, Label
} from 'recharts';
import { GexDataPoint } from '../types';

// Define the missing props interface for GexChart
interface GexChartProps {
  data: GexDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const price = data.price;
    const gexVol = data.gamma_per_one_percent_move_vol;
    const gexOi = data.gamma_per_one_percent_move_oi || 0;
    const gex1dteVol = data.gamma_1dte_vol || 0;
    const gex1dteOi = data.gamma_1dte_oi || 0;
    const isPositive = gexVol >= 0;

    const formatGex = (val: number) => {
      const absVal = Math.abs(val);
      if (absVal >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
      if (absVal >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
      if (absVal >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
      return val.toFixed(0);
    };

    return (
      <div className="bg-zinc-950/98 border border-zinc-800 p-4 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl min-w-[300px] z-[100] ring-1 ring-white/5">
        <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
          <div className="flex flex-col">
            <span className="text-[7px] font-black text-zinc-500 uppercase tracking-[0.2em]">审计时间戳</span>
            <span className="text-[11px] font-mono text-emerald-500/90 font-bold">
              {new Date(label).toLocaleString('zh-CN', { 
                year: 'numeric',
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                hour12: false 
              })}
            </span>
          </div>
          <div className={`px-2 py-0.5 rounded text-[7px] font-black uppercase border animate-pulse ${
            isPositive ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}>
            {isPositive ? '0DTE 动力平衡' : '0DTE 极速扩张'}
          </div>
        </div>
        
        <div className="space-y-2.5">
          <div className="flex justify-between items-center group">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">标的现货价格 (Spot)</span>
            <span className="text-xs font-mono font-black text-white group-hover:text-emerald-400 transition-colors">${price.toFixed(2)}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex flex-col gap-1 p-2 bg-zinc-900/40 rounded-lg border border-zinc-800/50">
               <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">0DTE 流量 (Vol)</span>
               <span className={`text-[11px] font-mono font-black ${gexVol >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                 {formatGex(gexVol)}
               </span>
            </div>
            <div className="flex flex-col gap-1 p-2 bg-zinc-900/40 rounded-lg border border-zinc-800/50">
               <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">0DTE 库存 (OI)</span>
               <span className="text-[11px] font-mono font-black text-blue-300">
                 {formatGex(gexOi)}
               </span>
            </div>
          </div>

          <div className="pt-3 mt-1 border-t border-zinc-900/50">
            <div className="flex items-center gap-2 mb-2">
              <i className="fa-solid fa-calendar-day text-indigo-400 text-[8px]"></i>
              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">1DTE 跨日结构</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[7px] font-black text-zinc-600 uppercase">远端流量</span>
                <span className={`text-[10px] font-mono font-bold ${gex1dteVol >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                  {formatGex(gex1dteVol)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[7px] font-black text-zinc-600 uppercase">远端库存</span>
                <span className="text-[10px] font-mono font-bold text-zinc-400">
                  {formatGex(gex1dteOi)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-2 border-t border-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${Math.sign(gexVol) === Math.sign(gex1dteVol) ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]'}`}></div>
            <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">
              {Math.sign(gexVol) === Math.sign(gex1dteVol) ? '跨日趋势同步' : '结构性背离'}
            </p>
          </div>
          <span className="text-[7px] font-mono text-zinc-700">Sentinel.v2</span>
        </div>
      </div>
    );
  }
  return null;
};

// Use the newly defined GexChartProps
const GexChart: React.FC<GexChartProps> = ({ data }) => {
  const [show1Dte, setShow1Dte] = useState(true);

  return (
    <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800/50 h-[450px] relative group/chart">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Multi-DTE 流量追踪</h3>
          <p className="text-[8px] text-zinc-600 font-bold uppercase mt-1 tracking-widest">0DTE & 1DTE 对冲梯度分析</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => setShow1Dte(!show1Dte)}
            className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all border ${show1Dte ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.1)]' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}
          >
            1DTE 叠加: {show1Dte ? '已激活' : '停用'}
          </button>
          <div className="h-4 w-px bg-zinc-800"></div>
          <div className="flex gap-4 text-[9px] font-black uppercase tracking-tighter">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
              <span className="text-zinc-500">价格</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500/40"></div>
              <span className="text-zinc-500">0DTE GEX</span>
            </div>
            {show1Dte && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.5)]"></div>
                <span className="text-indigo-400">1DTE 趋势</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="80%">
        <ComposedChart data={data}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
          <XAxis 
            dataKey="time" 
            tickFormatter={(time) => new Date(time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            stroke="#3f3f46"
            fontSize={9}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis yAxisId="left" orientation="left" domain={['auto', 'auto']} stroke="#3f3f46" fontSize={9} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val.toFixed(0)}`} />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke="#3f3f46" 
            fontSize={9} 
            axisLine={false} 
            tickLine={false} 
            tickFormatter={(val) => {
              const absVal = Math.abs(val);
              if (absVal >= 1e6) return `${(val / 1e6).toFixed(0)}M`;
              return `${(val / 1e3).toFixed(0)}K`;
            }}
            domain={([dataMin, dataMax]) => {
                const absMax = Math.max(Math.abs(dataMin), Math.abs(dataMax), 1000000);
                return [-absMax, absMax];
            }}
          />
          
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ stroke: '#27272a', strokeWidth: 1, strokeDasharray: '4 4' }} 
            isAnimationActive={false} 
          />
          
          <ReferenceLine 
            yAxisId="right" 
            y={0} 
            stroke="#52525b" 
            strokeWidth={1.5} 
            strokeDasharray="0"
          >
            <Label 
                value="GEX HORIZON" 
                position="insideRight" 
                fill="#52525b" 
                fontSize={8} 
                fontWeight="black" 
                className="uppercase tracking-widest opacity-50"
                offset={10}
            />
          </ReferenceLine>
          
          <Area 
            yAxisId="left" 
            type="monotone" 
            dataKey="price" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            strokeWidth={2} 
            dot={false} 
            isAnimationActive={false}
          />
          
          <Bar yAxisId="right" dataKey="gamma_per_one_percent_move_vol" radius={[2, 2, 0, 0]} isAnimationActive={false}>
             {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.gamma_per_one_percent_move_vol > 0 ? '#3b82f6' : '#f43f5e'} fillOpacity={0.4} />
             ))}
          </Bar>

          {show1Dte && (
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="gamma_1dte_vol" 
              stroke="#6366f1" 
              strokeWidth={2} 
              dot={false} 
              strokeDasharray="5 5"
              isAnimationActive={false}
            />
          )}

          <Brush 
            dataKey="time" 
            height={20} 
            stroke="#27272a" 
            fill="#09090b" 
            tickFormatter={(time) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GexChart;
