import React, { useState, useEffect, useRef } from 'react';
import { AnalysisPacket } from '../types';

interface CommandTerminalProps {
  onInject: (data: AnalysisPacket) => void;
  onAnalyze: (data: AnalysisPacket) => Promise<void>;
  currentMarketData: AnalysisPacket | null;
  config: { uwApiKey: string; discordWebhook: string };
  onConfigUpdate: (key: string, value: string) => void;
}

const CommandTerminal: React.FC<CommandTerminalProps> = ({ 
  onInject, 
  onAnalyze, 
  currentMarketData,
  config,
  onConfigUpdate 
}) => {
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<{ time: string; msg: string; type: 'info' | 'error' | 'success' }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [localUwKey, setLocalUwKey] = useState(config.uwApiKey);
  const [localDiscord, setLocalDiscord] = useState(config.discordWebhook);

  useEffect(() => {
    setLocalUwKey(config.uwApiKey);
  }, [config.uwApiKey]);

  useEffect(() => {
    setLocalDiscord(config.discordWebhook);
  }, [config.discordWebhook]);

  useEffect(() => {
    if (currentMarketData && input === '') {
      setInput(JSON.stringify(currentMarketData, null, 2));
    }
  }, [currentMarketData]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }].slice(-50));
  };

  const handleDeploy = () => {
    try {
      const parsed = JSON.parse(input) as AnalysisPacket;
      if (!parsed.current_price || !parsed.current_gex_vol) throw new Error('缺少必要的数据字段');
      
      addLog('正在验证数据完整性...', 'info');
      onInject(parsed);
      addLog('数据包已成功注入核心引擎', 'success');
    } catch (e: any) {
      addLog(`注入失败: ${e.message}`, 'error');
    }
  };

  const handleManualAnalyze = async () => {
    try {
      setIsProcessing(true);
      const parsed = JSON.parse(input) as AnalysisPacket;
      addLog(`正在向上行链路发送 AI 分析请求: ${parsed.ticker}...`, 'info');
      await onAnalyze(parsed);
      addLog('AI 解码响应已收到并加入历史流', 'success');
    } catch (e: any) {
      addLog(`AI 分析失败: ${e.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUwKeyChange = (val: string) => {
    setLocalUwKey(val);
    onConfigUpdate('uwApiKey', val);
  };

  const handleDiscordChange = (val: string) => {
    setLocalDiscord(val);
    onConfigUpdate('discordWebhook', val);
  };

  return (
    <div className="flex flex-col h-full gap-6 font-mono">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        
        <div className="lg:col-span-2 flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
          <div className="bg-zinc-900/50 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-code text-blue-500"></i> 数据提交端口 (Raw JSON)
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent p-6 text-emerald-500/80 text-sm focus:outline-none resize-none custom-scrollbar leading-relaxed"
            placeholder="粘贴 AnalysisPacket JSON 数据..."
          />
          <div className="p-4 bg-zinc-900/20 border-t border-zinc-900 flex gap-4">
            <button 
              onClick={handleDeploy}
              className="px-6 py-2 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[11px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 hover:text-white transition-all"
            >
              部署到监控屏
            </button>
            <button 
              onClick={handleManualAnalyze}
              disabled={isProcessing}
              className={`px-6 py-2 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded-lg text-[11px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
            >
              {isProcessing ? '正在解码...' : '触发 AI 探测'}
            </button>
          </div>
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
        </div>

        <div className="flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-zinc-900/50 px-4 py-2 border-b border-zinc-800 flex justify-between items-center">
             <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-link text-indigo-400"></i> 外部上行链路 (Uplink)
            </span>
            <span className="text-[8px] font-black text-emerald-500/50 uppercase tracking-widest flex items-center gap-1">
              <i className="fa-solid fa-cloud-arrow-up"></i> 自动云同步
            </span>
          </div>
          <div className="p-4 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center justify-between">
                <span>UnusualWhales API 密钥</span>
                <i className="fa-solid fa-key text-emerald-500/50"></i>
              </label>
              <div className="relative group">
                <input 
                  type="password"
                  value={localUwKey}
                  onChange={(e) => handleUwKeyChange(e.target.value)}
                  className="w-full bg-black/40 border border-zinc-900 rounded-lg px-3 py-2 text-[11px] text-zinc-400 focus:outline-none focus:border-emerald-500/30 transition-all font-mono"
                  placeholder="请输入 API Key..."
                />
              </div>
              <p className="text-[8px] text-zinc-700 leading-tight">注：用于实时同步 0DTE / 1DTE GEX 原始流量包。更改即刻生效。</p>
            </div>

            <div className="h-px bg-zinc-900"></div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center justify-between">
                <span>Discord Webhook URL</span>
                <i className="fa-brands fa-discord text-blue-500/50"></i>
              </label>
              <div className="relative group">
                <input 
                  type="text"
                  value={localDiscord}
                  onChange={(e) => handleDiscordChange(e.target.value)}
                  className="w-full bg-black/40 border border-zinc-900 rounded-lg px-3 py-2 text-[11px] text-zinc-400 focus:outline-none focus:border-blue-500/30 transition-all font-mono"
                  placeholder="https://discord.com/api/webhooks/..."
                />
              </div>
              <p className="text-[8px] text-zinc-700 leading-tight">注：信号触发时自动推送到指定频道。修改自动存档。</p>
            </div>
            
            <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
               <div className="flex items-center gap-2 mb-1">
                 <i className="fa-solid fa-shield-halved text-indigo-400 text-[9px]"></i>
                 <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">安全建议</span>
               </div>
               <p className="text-[9px] text-zinc-600 leading-relaxed italic">"密钥仅存储于本地浏览器缓存，不会上传到哨兵主服务器。"</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col bg-black border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-zinc-950 px-4 py-2 border-b border-zinc-900">
            <span className="text-[11px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-rectangle-list"></i> 系统传输日志
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar text-[11px] space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3 leading-tight">
                <span className="text-zinc-700 whitespace-nowrap">[{log.time}]</span>
                <span className={`${
                  log.type === 'error' ? 'text-rose-500' : 
                  log.type === 'success' ? 'text-emerald-400' : 'text-zinc-400'
                }`}>
                  {log.type === 'error' ? '>> ERR: ' : log.type === 'success' ? '>> OK: ' : '>> '}
                  {log.msg}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
          <div className="p-3 bg-zinc-950 border-t border-zinc-900 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[9px] text-zinc-600 font-bold uppercase">链路活跃</span>
            </div>
            <button 
              onClick={() => setLogs([])}
              className="text-[9px] text-zinc-700 hover:text-zinc-500 uppercase font-black"
            >
              清除日志
            </button>
          </div>
        </div>
      </div>

      <div className="h-20 bg-zinc-950/40 border border-zinc-900/50 rounded-2xl p-4 flex items-center justify-around">
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-zinc-600 font-black uppercase mb-1">UnusualWhales 状态</span>
          <span className={`text-sm font-bold tracking-tighter ${config.uwApiKey ? 'text-emerald-500' : 'text-zinc-600'}`}>
            {config.uwApiKey ? '认证激活' : '等待输入'}
          </span>
        </div>
        <div className="h-8 w-px bg-zinc-900"></div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-zinc-600 font-black uppercase mb-1">上行 Discord 链路</span>
          <span className={`text-sm font-bold tracking-tighter ${config.discordWebhook ? 'text-blue-500' : 'text-zinc-600'}`}>
            {config.discordWebhook ? '链路已就绪' : '离线状态'}
          </span>
        </div>
        <div className="h-8 w-px bg-zinc-900"></div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-zinc-600 font-black uppercase mb-1">加密套件</span>
          <span className="text-sm text-zinc-400 font-bold tracking-tighter text-emerald-500/70">AES-256-LOCAL</span>
        </div>
      </div>
    </div>
  );
};

export default CommandTerminal;