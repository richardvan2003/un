
import React from 'react';
import { TradingAlert } from '../types';

interface AlertListProps {
  alerts: TradingAlert[];
  onManualPush?: (alert: TradingAlert) => Promise<boolean>;
  lastPushSuccess?: string | null;
}

const AlertList: React.FC<AlertListProps> = ({ alerts, onManualPush, lastPushSuccess }) => {
  const formatAnalysis = (text: string) => {
    // 按照 ### 标题进行切分
    const sections = text.split(/(?=### \d\. )/);
    
    return sections.map((section, idx) => {
      const trimmed = section.trim();
      if (!trimmed) return null;

      const titleMatch = trimmed.match(/^### (\d\. .*?)\n/);
      const title = titleMatch ? titleMatch[1] : "";
      let content = titleMatch ? trimmed.replace(titleMatch[0], "") : trimmed;

      const isSnapshot = title.includes("环境快照");
      const isExecution = title.includes("即时策略");
      const isDiagnosis = title.includes("延续性");

      let colorClass = "text-zinc-400";
      let icon = "fa-solid fa-circle-info";

      if (isDiagnosis) { colorClass = "text-blue-400"; icon = "fa-solid fa-radar"; }
      if (isSnapshot) { colorClass = "text-amber-500"; icon = "fa-solid fa-gauge-high"; }
      if (isExecution) { colorClass = "text-emerald-400"; icon = "fa-solid fa-bolt-lightning"; }

      const renderContent = (raw: string) => {
        return raw.split('\n').map((line, lIdx) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return <div key={lIdx} className="h-1"></div>;

          // 增强型冗余过滤器：隐藏已移动到头部的字段
          const redundantPatterns = [
            /^识别模式[:：]/i,
            /^执行现价[:：]/i,
            /^风险提示[:：]/i,
            /^策略方向[:：]/i,
            /^参考价[:：]/i,
            /^信号类型[:：]/i,
            /市场结构解码[:：]/i,
            /推荐结构[:：]/i
          ];
          if (redundantPatterns.some(p => p.test(trimmedLine))) return null;

          const parts = trimmedLine.split(/(\*\*.*?\*\*)/);
          const formattedLine = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} className="font-black text-white px-1">{part.slice(2, -2)}</strong>;
            }
            return part;
          });

          // 核心更新：处理 16:00 期望预测行
          if (trimmedLine.startsWith('🎯')) {
            const confidenceMatch = trimmedLine.match(/(\d+)%/);
            const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 50;

            return (
              <div key={lIdx} className="my-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)] relative overflow-hidden group/target">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 animate-pulse"></div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-black text-white flex items-center gap-2">
                    <i className="fa-solid fa-crosshairs text-amber-500"></i>
                    {formattedLine}
                  </span>
                  <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    EST_CLOSE
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-zinc-500">
                    <span>Model Confidence</span>
                    <span className="text-amber-500 text-sm">{confidence}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
                      style={{ width: `${confidence}%` }}
                    ></div>
                  </div>
                  <p className="text-[8px] text-zinc-600 font-bold uppercase mt-1">
                    Weighted: Flow(25%) + GEX(20%) + OI/Block(35%) + Bar(20%)
                  </p>
                </div>
              </div>
            );
          }

          if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
            return (
              <div key={lIdx} className="flex gap-2 ml-2 mb-0.5">
                <span className={`text-[7px] mt-1.5 ${colorClass}`}>●</span>
                <span className="flex-1 text-[11px] text-zinc-300 leading-tight">
                  {formattedLine.slice(1)}
                </span>
              </div>
            );
          }

          if (trimmedLine.includes('卖 ') || trimmedLine.includes('买 ') || (isSnapshot && trimmedLine.includes('|')) || trimmedLine.includes('OI_Top3')) {
             return (
               <div key={lIdx} className={`my-1.5 p-2 rounded-lg font-mono text-[11px] border border-zinc-800/50 ${isSnapshot ? 'bg-amber-500/5 text-amber-500' : 'bg-black/40 text-emerald-400'}`}>
                  {formattedLine}
               </div>
             );
          }

          return <p key={lIdx} className="text-[11px] text-zinc-400 leading-snug mb-0.5">{formattedLine}</p>;
        });
      };

      return (
        <div key={idx} className={`mb-6 last:mb-0 group/section ${isExecution ? 'p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10' : ''}`}>
          {title && (
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-5 h-5 rounded flex items-center justify-center ${colorClass.replace('text', 'bg')}/10 border border-${colorClass.replace('text', 'border')}/20`}>
                <i className={`${icon} ${colorClass} text-[10px]`}></i>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${colorClass}`}>
                {title}
              </span>
              <div className="flex-1 h-[1px] bg-zinc-800/30"></div>
            </div>
          )}
          <div className="px-1">
            {renderContent(content)}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-[rgb(var(--accent-rgb))] blur-md opacity-20"></div>
            <i className="fa-solid fa-satellite-dish text-[rgb(var(--accent-rgb))] text-sm relative z-10"></i>
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">指令流</h3>
            <p className="text-[8px] text-zinc-500 font-black uppercase tracking-[0.1em]">SENTINEL R.C.-02</p>
          </div>
        </div>
        <div className="bg-zinc-900 px-3 py-1 rounded-full text-[9px] font-black font-mono border border-zinc-800 text-zinc-600">
          UPLINK_OK
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-800 border-2 border-zinc-900 border-dashed rounded-[2rem]">
             <i className="fa-solid fa-tower-broadcast text-2xl opacity-10 mb-4"></i>
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">正在侦听信号...</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isLong = alert.strategy === 'LONG';
            const isShort = alert.strategy === 'SHORT';
            
            return (
              <div 
                key={alert.id} 
                className={`relative bg-zinc-900/10 backdrop-blur-md p-5 rounded-[2rem] border transition-all duration-300 ${
                  isLong ? 'border-emerald-500/20 shadow-emerald-950/5' : 
                  isShort ? 'border-rose-500/20 shadow-rose-950/5' : 'border-blue-500/20'
                }`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full opacity-40 ${isLong ? 'bg-emerald-500' : isShort ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
                
                <div className="flex justify-between items-start mb-6 pb-4 border-b border-zinc-800/50">
                  <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                       isLong ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 
                       isShort ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                     }`}>
                        <i className={`fa-solid ${isLong ? 'fa-arrow-trend-up' : isShort ? 'fa-arrow-trend-down' : 'fa-arrows-left-right'} text-lg`}></i>
                     </div>
                     <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[11px] font-black uppercase tracking-widest ${isLong ? 'text-emerald-400' : isShort ? 'text-rose-400' : 'text-blue-400'}`}>
                             {isLong ? 'BULLISH' : isShort ? 'BEARISH' : 'NEUTRAL'}
                          </span>
                          <span className="text-[8px] text-zinc-700 font-mono">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <h4 className="text-[12px] text-white font-mono font-black uppercase leading-tight">
                           {alert.pattern || '行情研判'}
                        </h4>
                     </div>
                  </div>

                  <div className="text-right">
                     <p className="text-[12px] font-mono font-black text-white leading-none mb-1">${alert.price.toFixed(0)}</p>
                     <p className="text-[7px] text-zinc-600 font-black uppercase tracking-tighter">Entry Ref</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {formatAnalysis(alert.rawAnalysis || alert.analysis)}
                </div>

                <div className="mt-6 pt-3 border-t border-zinc-800/30 flex items-center justify-between">
                   <span className="text-[8px] font-black text-zinc-700 uppercase">ID: {alert.id.toUpperCase()}</span>
                   <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${isLong ? 'bg-emerald-500' : isShort ? 'bg-rose-500' : 'bg-blue-500'} animate-pulse`}></div>
                      <span className="text-[8px] font-black text-zinc-600 uppercase">VERIFIED</span>
                   </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <div className="mt-6 pt-4 border-t border-zinc-900/50 flex justify-between items-center px-1">
         <p className="text-[8px] text-zinc-700 font-black uppercase tracking-widest">SENTINEL DECODING ENGINE</p>
         <i className="fa-solid fa-microchip text-zinc-800 text-sm"></i>
      </div>
    </div>
  );
};

export default AlertList;
