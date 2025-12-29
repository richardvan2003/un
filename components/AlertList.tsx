
import React from 'react';
import { TradingAlert } from '../types';

interface AlertListProps {
  alerts: TradingAlert[];
  onManualPush?: (alert: TradingAlert) => Promise<boolean>;
  lastPushSuccess?: string | null;
}

const AlertList: React.FC<AlertListProps> = ({ alerts, onManualPush, lastPushSuccess }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
          <i className="fa-solid fa-bell animate-pulse text-amber-500"></i> 情报流
        </h3>
        <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[9px] font-black font-mono">
          {alerts.length.toString().padStart(2, '0')} 信号
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-700 border border-zinc-900 border-dashed rounded-2xl">
             <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center mb-3">
                <i className="fa-solid fa-wind text-xl"></i>
             </div>
             <p className="text-[9px] font-black uppercase tracking-widest">正在扫描市场脉搏...</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isLatestSuccess = lastPushSuccess === alert.id;
            
            return (
              <div 
                key={alert.id} 
                className={`bg-zinc-900/40 p-3 rounded-xl border-l-4 border-r border-t border-b border-zinc-800/80 transition-all hover:bg-zinc-900/60 relative overflow-hidden ${
                  alert.strategy === 'LONG' ? 'border-l-emerald-500' : 
                  alert.strategy === 'SHORT' ? 'border-l-rose-500' : 'border-l-blue-500'
                }`}
              >
                {isLatestSuccess && (
                  <div className="absolute top-0 right-0 left-0 h-0.5 bg-blue-500/50 animate-pulse"></div>
                )}
                
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                     <div className="flex items-center gap-2">
                       <span className={`text-[9px] font-black uppercase tracking-tight ${
                         alert.strategy === 'LONG' ? 'text-emerald-400' : 
                         alert.strategy === 'SHORT' ? 'text-rose-400' : 'text-blue-400'
                       }`}>
                         {alert.strategy === 'LONG' ? '🎯 多头建议' : alert.strategy === 'SHORT' ? '🎯 空头建议' : '🎯 中性调仓'}
                       </span>
                       {alert.pattern && (
                         <span className="text-[7px] font-black bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-700 uppercase tracking-tighter">
                           {alert.pattern}
                         </span>
                       )}
                     </div>
                     <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-zinc-500 font-bold">
                          ${alert.price.toFixed(2)}
                        </span>
                        {alert.recommendedStrategies && alert.recommendedStrategies.length > 0 && (
                          <div className="flex gap-1">
                            {alert.recommendedStrategies.map(s => (
                              <span key={s} className="text-[7px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1 py-0.2 rounded">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                     </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {onManualPush && (
                      <button 
                        onClick={() => onManualPush(alert)}
                        className={`text-zinc-600 hover:text-blue-400 transition-all p-1 rounded hover:bg-zinc-800/50 ${alert.pushedToDiscord ? 'opacity-50' : ''}`}
                      >
                        <i className={`fa-brands fa-discord text-[10px] ${isLatestSuccess ? 'animate-bounce text-blue-400' : ''}`}></i>
                      </button>
                    )}
                    <span className="text-[8px] text-zinc-600 font-bold px-1.5 py-0.5 rounded bg-black/40 border border-zinc-800">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-600 uppercase font-black text-[7px] tracking-widest border-b border-zinc-900 pb-0.5 w-max">分析报告</span>
                    <div className="text-[10px] text-zinc-300 leading-snug whitespace-pre-wrap font-sans font-medium">
                      {alert.analysis}
                    </div>
                  </div>

                  <div className={`p-2 rounded-lg border flex gap-2 items-start ${
                    alert.strategy === 'SHORT' ? 'bg-rose-500/5 border-rose-500/20' : 'bg-emerald-500/5 border-emerald-500/20'
                  }`}>
                     <i className="fa-solid fa-triangle-exclamation text-rose-500 text-[9px] mt-0.5"></i>
                     <div className="flex flex-col">
                        <span className="text-rose-500 font-black uppercase text-[7px] tracking-widest">风险边界</span>
                        <p className="text-[9px] text-zinc-400 font-bold leading-tight">{alert.risk}</p>
                     </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <div className="mt-4 pt-3 border-t border-zinc-900 flex justify-between items-center text-[8px] font-black text-zinc-600 uppercase tracking-widest">
         <span>自动审计: 运行中</span>
         <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
            SYNC
         </span>
      </div>
    </div>
  );
};

export default AlertList;
