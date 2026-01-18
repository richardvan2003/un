
import React, { useMemo, useState } from 'react';
import { TradingAlert } from '../types';
import Panel from './Panel';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface StrategyStatisticsProps {
  alerts: TradingAlert[];
}

const StrategyStatistics: React.FC<StrategyStatisticsProps> = ({ alerts }) => {
  const [filter, setFilter] = useState('');

  const stats = useMemo(() => {
    const total = alerts.length;
    const long = alerts.filter(a => a.strategy === 'LONG').length;
    const short = alerts.filter(a => a.strategy === 'SHORT').length;
    const neutral = alerts.filter(a => a.strategy === 'NEUTRAL').length;

    const patternMap: Record<string, number> = {};
    const regimeMap: Record<string, number> = {};

    alerts.forEach(a => {
      const p = a.pattern || '未知模式';
      patternMap[p] = (patternMap[p] || 0) + 1;
      
      const r = a.regime || '未指定';
      regimeMap[r] = (regimeMap[r] || 0) + 1;
    });

    const pieData = [
      { name: '做多', value: long, color: '#10b981' },
      { name: '做空', value: short, color: '#f43f5e' },
      { name: '观望', value: neutral, color: '#3f3f46' },
    ].filter(d => d.value > 0);

    const barData = Object.entries(patternMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return { total, long, short, neutral, pieData, barData, regimeMap };
  }, [alerts]);

  const filteredAlerts = alerts.filter(a => 
    a.pattern?.toLowerCase().includes(filter.toLowerCase()) || 
    a.regime?.toLowerCase().includes(filter.toLowerCase()) ||
    a.analysis.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 border-l-4 border-l-emerald-500 shadow-xl">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">累计做多信号</p>
          <p className="text-3xl font-black text-emerald-400 font-mono">{stats.long}</p>
        </div>
        <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 border-l-4 border-l-rose-500 shadow-xl">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">累计做空信号</p>
          <p className="text-3xl font-black text-rose-500 font-mono">{stats.short}</p>
        </div>
        <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 border-l-4 border-l-zinc-500 shadow-xl">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">观望/保护次数</p>
          <p className="text-3xl font-black text-zinc-400 font-mono">{stats.neutral}</p>
        </div>
        <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 border-l-4 border-l-indigo-500 shadow-xl">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">总探测信号量</p>
          <p className="text-3xl font-black text-white font-mono">{stats.total}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="信号比例分布" icon="fa-solid fa-chart-pie" className="lg:col-span-1">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-around mt-2">
             {stats.pieData.map(d => (
               <div key={d.name} className="flex flex-col items-center">
                 <span className="text-[9px] font-black uppercase text-zinc-600 mb-1">{d.name}</span>
                 <span className="text-xs font-bold text-zinc-300">{Math.round((d.value / stats.total) * 100)}%</span>
               </div>
             ))}
          </div>
        </Panel>

        <Panel title="高频模式识别" icon="fa-solid fa-brain" className="lg:col-span-2">
          <div className="h-[280px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.barData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#18181b" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#52525b" 
                  fontSize={10} 
                  width={100} 
                  fontWeight="bold"
                />
                <RechartsTooltip 
                   cursor={{ fill: '#ffffff05' }}
                   contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }}
                />
                <Bar dataKey="value" fill="rgb(var(--accent-rgb))" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="策略审计日志" icon="fa-solid fa-list-check">
        <div className="mb-4">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700 text-xs"></i>
            <input 
              type="text" 
              placeholder="搜索模式、结构或分析内容..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-black/40 border border-zinc-900 rounded-xl pl-10 pr-4 py-2 text-[12px] text-zinc-400 focus:outline-none focus:border-[rgba(var(--accent-rgb),0.3)] font-sans transition-all"
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-900">
                <th className="py-3 px-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">时间</th>
                <th className="py-3 px-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">策略</th>
                <th className="py-3 px-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">识别模式</th>
                <th className="py-3 px-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">推荐结构</th>
                <th className="py-3 px-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">执行价格</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((a, i) => (
                <tr key={a.id} className="border-b border-zinc-900/50 hover:bg-white/5 transition-colors group">
                  <td className="py-3 px-2 text-[11px] font-mono text-zinc-500">{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="py-3 px-2">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                      a.strategy === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' :
                      a.strategy === 'SHORT' ? 'bg-rose-500/10 text-rose-400' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {a.strategy === 'LONG' ? '做多' : a.strategy === 'SHORT' ? '做空' : '观望'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-[12px] font-black text-white">{a.pattern || '---'}</td>
                  <td className="py-3 px-2 text-[11px] text-zinc-400">{a.regime}</td>
                  <td className="py-3 px-2 text-[12px] font-mono font-bold text-right text-zinc-300">${a.price.toFixed(1)}</td>
                </tr>
              ))}
              {filteredAlerts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[10px] font-black uppercase text-zinc-800 tracking-widest">
                    未检索到匹配信号
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};

export default StrategyStatistics;
