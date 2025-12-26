
import React from 'react';
import { TradingAlert } from '../types';

interface AlertListProps {
  alerts: TradingAlert[];
}

const AlertList: React.FC<AlertListProps> = ({ alerts }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
          <i className="fa-solid fa-bell animate-bounce"></i> 情报流
        </h3>
        <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-black font-mono">
          {alerts.length.toString().padStart(2, '0')} 信号
        </span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-700 border border-zinc-900 border-dashed rounded-2xl">
             <div className="w-16 h-16 rounded-full border border-zinc-800 flex items-center justify-center mb-4">
                <i className="fa-solid fa-wind text-2xl"></i>
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest">正在扫描市场脉搏...</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`bg-zinc-900/40 p-4 rounded-xl border-l-4 border-r border-t border-b border-zinc-800/80 transition-all hover:bg-zinc-900/60 ${
                alert.strategy === 'LONG' ? 'border-l-emerald-500' : 
                alert.strategy === 'SHORT' ? 'border-l-rose-500' : 'border-l-blue-500'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                   <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${
                     alert.strategy === 'LONG' ? 'text-emerald-400' : 
                     alert.strategy === 'SHORT' ? 'text-rose-400' : 'text-blue-400'
                   }`}>
                     {alert.strategy === 'LONG' ? '🎯 逢低买入' : alert.strategy === 'SHORT' ? '🎯 逢高做空' : '🎯 中性调仓'}
                   </span>
                   <span className="text-[11px] text-zinc-500 font-black mt-0.5">
                     执行点位: ${alert.price.toFixed(2)}
                   </span>
                </div>
                <span className="text-[9px] text-zinc-600 font-black uppercase tracking-tighter bg-black/40 px-2 py-0.5 rounded border border-zinc-800">
                  {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-600 uppercase font-black text-[8px] tracking-widest">市场环境</span>
                  <p className="text-[11px] text-zinc-200 font-bold">{alert.regime}</p>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-600 uppercase font-black text-[8px] tracking-widest">流向分析</span>
                  <p className="text-[11px] text-zinc-300 italic leading-relaxed">"{alert.analysis}"</p>
                </div>

                <div className={`mt-2 p-3 rounded-lg border flex gap-3 items-start ${
                  alert.strategy === 'SHORT' ? 'bg-rose-500/5 border-rose-500/20' : 'bg-emerald-500/5 border-emerald-500/20'
                }`}>
                   <i className="fa-solid fa-triangle-exclamation text-rose-500 text-[10px] mt-0.5"></i>
                   <div className="flex flex-col">
                      <span className="text-rose-500 font-black uppercase text-[8px] tracking-widest mb-0.5">风险监控</span>
                      <p className="text-[10px] text-zinc-400 font-medium leading-tight">{alert.risk}</p>
                   </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="mt-6 pt-4 border-t border-zinc-900 flex justify-between items-center text-[9px] font-black text-zinc-600 uppercase tracking-widest">
         <span>自动存档: 开启</span>
         <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            同步活跃
         </span>
      </div>
    </div>
  );
};

export default AlertList;
