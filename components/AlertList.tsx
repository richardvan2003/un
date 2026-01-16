import React, { useState, useRef } from 'react';
import { TradingAlert } from '../types';
import { generateSpeech, decodeBase64, decodeAudioData } from '../services/geminiService';

interface AlertListProps {
  alerts: TradingAlert[];
  onManualPush?: (alert: TradingAlert) => Promise<boolean>;
  lastPushSuccess?: string | null;
}

const AlertList: React.FC<AlertListProps> = ({ alerts, onManualPush, lastPushSuccess }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handleStopAudio = () => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }
    setPlayingId(null);
  };

  const handleBroadcast = async (alert: TradingAlert) => {
    if (playingId === alert.id) {
      handleStopAudio();
      return;
    }

    handleStopAudio();
    setPlayingId(alert.id);

    // Extract sections for broadcasting
    const sections = alert.analysis.split(/(?=### \d\. )/);
    let broadcastText = "";
    sections.forEach(s => {
      if (s.includes("战术部署") || s.includes("结构诊断")) {
        broadcastText += s.replace(/### \d\. /g, "").replace(/\n/g, " ").trim() + "。 ";
      }
    });

    if (!broadcastText) {
      setPlayingId(null);
      return;
    }

    const base64Audio = await generateSpeech(broadcastText);
    if (!base64Audio) {
      setPlayingId(null);
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      const audioData = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        if (playingId === alert.id) setPlayingId(null);
      };
      
      currentSourceRef.current = source;
      source.start();
    } catch (err) {
      console.error("Playback error:", err);
      setPlayingId(null);
    }
  };

  const formatAnalysis = (text: string) => {
    const sections = text.split(/(?=### \d\. )/);
    
    return sections.map((section, idx) => {
      const trimmed = section.trim();
      if (!trimmed) return null;

      const titleMatch = trimmed.match(/^### (\d\. .*?)\n/);
      const title = titleMatch ? titleMatch[1] : "";
      let content = titleMatch ? trimmed.replace(titleMatch[0], "") : trimmed;

      const isData = title.includes("数据快照") || title.includes("环境数据");
      const isDeployment = title.includes("战术部署") || title.includes("即时策略");
      const isDiagnosis = title.includes("结构诊断") || title.includes("延续性");

      let colorClass = "text-zinc-400";
      let icon = "fa-solid fa-circle-info";

      if (isDiagnosis) { colorClass = "text-blue-400"; icon = "fa-solid fa-microchip"; }
      if (isData) { colorClass = "text-amber-500"; icon = "fa-solid fa-database"; }
      if (isDeployment) { colorClass = "text-emerald-400"; icon = "fa-solid fa-crosshairs"; }

      const renderContent = (raw: string) => {
        return raw.split('\n').map((line, lIdx) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return null;

          const redundantPatterns = [/^信号[:：]/i, /^推荐[:：]/i, /^执行[:：]/i, /^模式[:：]/i, /^逻辑[:：]/i];
          let displayLine = trimmedLine;
          redundantPatterns.forEach(p => {
            displayLine = displayLine.replace(p, '');
          });

          const parts = displayLine.split(/(\*\*.*?\*\*)/);
          const formattedLine = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} className="font-black text-white px-1">{part.slice(2, -2)}</strong>;
            }
            return part;
          });

          if (trimmedLine.includes('🎯')) {
            const confidenceMatch = trimmedLine.match(/(\d+)%/);
            const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 50;
            const priceVal = trimmedLine.match(/评估[:：]\s*(\d+\.?\d*)/i)?.[1] || "---";

            return (
              <div key={lIdx} className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-800 my-2 group transition-all hover:bg-zinc-900/60">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-black text-white">🎯 16:00 收盘预期: ${priceVal}</span>
                    <span className="text-[10px] font-black text-zinc-500 uppercase">置信度: {confidence}%</span>
                 </div>
                 <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${confidence > 75 ? 'bg-emerald-500' : confidence > 45 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${confidence}%` }}
                    ></div>
                 </div>
              </div>
            );
          }

          return (
            <div key={lIdx} className="text-[13px] leading-tight text-zinc-400 py-1 flex items-start gap-2">
              <span className="text-zinc-700 mt-1">•</span>
              <span className="flex-1">{formattedLine}</span>
            </div>
          );
        });
      };

      return (
        <div key={idx} className="mb-6 last:mb-0">
          <div className={`flex items-center gap-2 mb-2 ${colorClass} border-b border-zinc-900 pb-1`}>
            <i className={`${icon} text-[11px]`}></i>
            <h4 className="text-[11px] font-black uppercase tracking-[0.1em]">{title}</h4>
          </div>
          <div className="pl-2 space-y-0.5">
            {renderContent(content)}
          </div>
        </div>
      );
    });
  };

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-800">
        <i className="fa-solid fa-satellite-dish text-4xl mb-4 animate-pulse"></i>
        <p className="text-[11px] font-black uppercase tracking-[0.1em]">等待上行链路信号...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar h-full font-mono">
      {alerts.map((alert) => (
        <div 
          key={alert.id} 
          className={`relative bg-zinc-950 border rounded-xl p-4 shadow-xl transition-all hover:border-zinc-700 group overflow-hidden ${
            alert.strategy === 'LONG' ? 'border-emerald-500/20' : 
            alert.strategy === 'SHORT' ? 'border-rose-500/20' : 'border-zinc-800'
          }`}
        >
          <div className="flex justify-between items-start mb-4">
             <div className="space-y-1">
                <div className="flex items-center gap-2">
                   <span className={`text-[11px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
                     alert.strategy === 'LONG' ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 
                     alert.strategy === 'SHORT' ? 'bg-rose-500 text-black shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'bg-zinc-800 text-zinc-400'
                   }`}>
                     {alert.strategy}
                   </span>
                   <span className="text-[11px] font-black text-zinc-500 uppercase">
                     ${alert.price.toFixed(0)}
                   </span>
                </div>
                <h3 className="text-[13px] font-black text-white uppercase tracking-tight group-hover:accent-text transition-colors">
                  {alert.pattern || "探测中"}
                </h3>
             </div>
             <div className="flex flex-col items-end gap-2">
                <span className="text-[10px] font-bold text-zinc-600 uppercase">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleBroadcast(alert)}
                    className={`text-[13px] p-1.5 rounded-md border transition-all ${
                      playingId === alert.id 
                      ? 'text-emerald-400 border-emerald-400 bg-emerald-400/10 animate-pulse' 
                      : 'text-zinc-600 border-zinc-800 hover:text-emerald-500 hover:border-emerald-500/40 hover:bg-emerald-500/5'
                    }`}
                    title="语音播报报告"
                  >
                    <i className={`fa-solid ${playingId === alert.id ? 'fa-volume-high' : 'fa-volume-low'}`}></i>
                  </button>
                  {onManualPush && (
                    <button 
                      onClick={() => onManualPush(alert)}
                      disabled={alert.pushedToDiscord || lastPushSuccess === alert.id}
                      className={`text-[13px] transition-colors p-1.5 rounded-md border ${
                        alert.pushedToDiscord ? 'text-indigo-400 border-indigo-400/20 bg-indigo-400/5' : 
                        lastPushSuccess === alert.id ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5' :
                        'text-zinc-600 border-zinc-800 hover:text-indigo-400 hover:border-indigo-400/40 hover:bg-indigo-400/5'
                      }`}
                    >
                      <i className="fa-brands fa-discord"></i>
                    </button>
                  )}
                </div>
             </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-900/50">
            {formatAnalysis(alert.analysis)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlertList;