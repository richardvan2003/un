
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
      
      // Regime Filter
      const matchesRegime = 
        regimeFilter === 'ALL' || 
        (regimeFilter === 'POSITIVE' && gex > 0) || 
        (regimeFilter === 'NEGATIVE' && gex < 0);
      
      // Search Query Filter
      const matchesSearch = point.price.toString().includes(searchQuery) || 
                            new Date(point.time).toLocaleTimeString().includes(searchQuery);

      // Date Range Filter
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
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
              <i className="fa-solid fa-clock-rotate-left"></i> 历史审计日志
            </h3>
            <p className="text-[8px] text-zinc-600 font-bold uppercase mt-1">快照存档: SPX 0DTE 流量</p>
          </div>

          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-zinc-800">
            <button 
              onClick={() => setViewMode('chart')}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'chart' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              图表
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              列表
            </button>
          </div>
        </div>

        {/* 过滤器网格 */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* 时间范围过滤器 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">审计起始时间</label>
              <input 
                type="datetime-local" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-black/40 border border-zinc-900 rounded-lg px-3 py-1.5 text-[9px] text-zinc-400 focus:outline-none focus:border-emerald-500/30 font-mono transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">审计结束时间</label>
              <input 
                type="datetime-local" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-black/40 border border-zinc-900 rounded-lg px-3 py-1.5 text-[9px] text-zinc-400 focus:outline-none focus:border-emerald-500/30 font-mono transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">对冲制度</label>
              <div className="flex bg-black/40 p-1 rounded-lg border border-zinc-900 h-[30px] items-center">
                {[
                  { id: 'ALL', label: '全部' },
                  { id: 'POSITIVE', label: '正 G' },
                  { id: 'NEGATIVE', label: '负 G' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setRegimeFilter(f.id as RegimeFilter)}
                    className={`px-2 py-1 rounded text-[8px] font-black uppercase transition-all whitespace-nowrap ${regimeFilter === f.id ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-1.5">快速检索</label>
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[9px]"></i>
                <input 
                  type="text" 
                  placeholder="价格、时间或关键词..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-zinc-900 rounded-lg pl-9 pr-4 py-1.5 text-[9px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
                />
              </div>
            </div>

            <button 
              onClick={resetFilters}
              className="px-4 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[8px] font-black text-zinc-500 uppercase hover:bg-zinc-800 hover:text-zinc-300 transition-all h-[30px]"
            >
              重置
            </button>
            
            <div className="px-4 py-1.5 bg-black/20 border border-zinc-900 rounded-lg text-[10px] font-mono text-emerald-500/80 h-[30px] flex items-center">
              {filteredHistory.length} 条记录
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        {viewMode === 'chart' ? (
          <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={[...filteredHistory].reverse()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  stroke="#3f3f46"
                  fontSize={9}
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#3f3f46"
                  fontSize={9}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => `$${val.toFixed(0)}`}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#3f3f46"
                  fontSize={9}
                  axisLine={false}
                  tickFormatter={(val) => `${(val / 1e6).toFixed(0)}M`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '9px' }}
                />
                <Area yAxisId="left" type="monotone" dataKey="price" stroke="#10b981" fill="#10b981" fillOpacity={0.05} strokeWidth={1} dot={false} />
                <Bar yAxisId="right" dataKey="gamma_per_one_percent_move_vol">
                  {([...filteredHistory].reverse()).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.gamma_per_one_percent_move_vol > 0 ? '#3b82f6' : '#f43f5e'} fillOpacity={0.4} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-full overflow-auto custom-scrollbar border border-zinc-900/50 rounded-xl bg-black/20">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-zinc-950 z-10 border-b border-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-zinc-600">审计时间戳</th>
                  <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-zinc-600">标的价格</th>
                  <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-zinc-600 text-right">GEX 流量敞口</th>
                  <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-zinc-600 text-center">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 font-mono text-[10px]">
                {filteredHistory.map((point, idx) => (
                  <tr key={idx} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-4 py-2 text-zinc-500">{new Date(point.time).toLocaleString()}</td>
                    <td className="px-4 py-2 text-zinc-100 font-bold">${point.price.toFixed(2)}</td>
                    <td className={`px-4 py-2 text-right font-bold ${point.gamma_per_one_percent_move_vol > 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                      {formatGex(point.gamma_per_one_percent_move_vol)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${point.gamma_per_one_percent_move_vol > 0 ? 'bg-blue-500/10 text-blue-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {point.gamma_per_one_percent_move_vol > 0 ? '看多' : '看空'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-20 text-center text-zinc-700 uppercase tracking-widest text-[9px]">
                      未在所选时间范围内发现匹配审计日志
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryExplorer;
