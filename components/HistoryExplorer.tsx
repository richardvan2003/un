
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, ComposedChart, Line, Area
} from 'recharts';
import { GexDataPoint, HistoryViewMode, RegimeFilter } from '../types';

interface HistoryExplorerProps {
  history: GexDataPoint[];
}

const HistoryExplorer: React.FC<HistoryExplorerProps> = ({ history }) => {
  const [viewMode, setViewMode] = useState<HistoryViewMode>('chart');
  const [regimeFilter, setRegimeFilter] = useState<RegimeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const filteredHistory = useMemo(() => {
    return history.filter(point => {
      const gex = point.gamma_per_one_percent_move_vol;
      const pointTime = new Date(point.time).getTime();
      
      const matchesRegime = 
        regimeFilter === 'ALL' || 
        (regimeFilter === 'POSITIVE' && gex > 0) || 
        (regimeFilter === 'NEGATIVE' && gex < 0);
      
      const matchesSearch = point.price.toString().includes(searchQuery) || 
                            new Date(point.time).toLocaleTimeString().includes(searchQuery);

      const startLimit = startDate ? new Date(startDate).getTime() : 0;
      const endLimit = endDate ? new Date(endDate).getTime() : Infinity;
      const matchesDateRange = pointTime >= startLimit && pointTime <= endLimit;

      return matchesRegime && matchesSearch && matchesDateRange;
    }).reverse();
  }, [history, regimeFilter, searchQuery, startDate, endDate]);

  const resetFilters = () => {
    setRegimeFilter('ALL');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  const formatGex = (val: number) => {
    const absVal = Math.abs(val);
    if (absVal >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
    if (absVal >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
    return val.toFixed(0);
  };

  return (
    <div className="bg-zinc-950/50 rounded-2xl border border-zinc-800/50 shadow-2xl overflow-hidden flex flex-col h-full backdrop-blur-xl">
      <div className="p-6 border-b border-zinc-900 bg-zinc-900/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
              <i className="fa-solid fa-clock-rotate-left"></i> 历史审计日志
            </h3>
            <p className="text-[9px] text-zinc-600 font-bold uppercase mt-1">快照存档: SPX 0DTE 流量</p>
          </div>

          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-zinc-800">
            <button 
              onClick={() => setViewMode('chart')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'chart' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              图表
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              列表
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">审计起始时间</label>
              <input 
                type="datetime-local" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-black/40 border border-zinc-900 rounded-lg px-3 py-1.5 text-[10px] text-zinc-400 focus:outline-none focus:border-emerald-500/30 font-mono transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">审计结束时间</label>
              <input 
                type="datetime-local" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-black/40 border border-zinc-900 rounded-lg px-3 py-1.5 text-[10px] text-zinc-400 focus:outline-none focus:border-emerald-500/30 font-mono transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">对冲制度</label>
              <div className="flex bg-black/40 p-1 rounded-lg border border-zinc-900 h-[32px] items-center">
                {[
                  { id: 'ALL', label: '全部' },
                  { id: 'POSITIVE', label: '正 G' },
                  { id: 'NEGATIVE', label: '负 G' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setRegimeFilter(f.id as RegimeFilter)}
                    className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all whitespace-nowrap ${regimeFilter === f.id ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex-1">
              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-1.5">价格/时间搜索</label>
              <input 
                type="text" 
                placeholder="搜索价格..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-zinc-900 rounded-lg px-3 py-1.5 text-[10px] text-zinc-400 focus:outline-none focus:border-emerald-500/30 font-mono transition-colors"
              />
            </div>
            
            <button 
              onClick={resetFilters}
              className="px-4 py-1.5 bg-zinc-900 text-zinc-500 border border-zinc-800 rounded-lg text-[10px] font-black uppercase tracking-widest hover:text-zinc-300 transition-colors h-[32px]"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        {viewMode === 'chart' ? (
          <div className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredHistory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                  stroke="#3f3f46"
                  fontSize={10}
                  axisLine={false}
                />
                <YAxis yAxisId="left" orientation="left" stroke="#3f3f46" fontSize={10} axisLine={false} domain={['auto', 'auto']} />
                <YAxis yAxisId="right" orientation="right" stroke="#3f3f46" fontSize={10} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '11px' }}
                  itemStyle={{ padding: '2px 0' }}
                />
                <Area yAxisId="left" type="monotone" dataKey="price" stroke="#10b981" fill="#10b981" fillOpacity={0.05} strokeWidth={2} dot={false} />
                <Bar yAxisId="right" dataKey="gamma_per_one_percent_move_vol">
                  {filteredHistory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.gamma_per_one_percent_move_vol > 0 ? '#3b82f6' : '#f43f5e'} fillOpacity={0.4} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900">
                  <th className="py-3 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">时间戳</th>
                  <th className="py-3 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">标的价格</th>
                  <th className="py-3 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">0DTE GEX (VOL)</th>
                  <th className="py-3 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">0DTE GEX (OI)</th>
                  <th className="py-3 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">对冲状态</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((point, idx) => (
                  <tr key={idx} className="border-b border-zinc-900/50 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-[11px] font-mono text-zinc-400">{new Date(point.time).toLocaleString()}</td>
                    <td className="py-3 px-4 text-[12px] font-mono text-white text-right font-bold">${point.price.toFixed(2)}</td>
                    <td className={`py-3 px-4 text-[12px] font-mono text-right font-bold ${point.gamma_per_one_percent_move_vol >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                      {formatGex(point.gamma_per_one_percent_move_vol)}
                    </td>
                    <td className="py-3 px-4 text-[12px] font-mono text-right text-blue-300">
                      {formatGex(point.gamma_per_one_percent_move_oi)}
                    </td>
                    <td className="py-3 px-4 text-right">
                       <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                         point.gamma_per_one_percent_move_vol >= 0 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                       }`}>
                         {point.gamma_per_one_percent_move_vol >= 0 ? 'Glue' : 'Fuel'}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-900 bg-zinc-900/10 flex justify-between items-center">
        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
          审计记录: {filteredHistory.length} / {history.length}
        </span>
        <div className="flex gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-800"></div>
        </div>
      </div>
    </div>
  );
};

export default HistoryExplorer;
