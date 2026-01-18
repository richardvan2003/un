
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getLatestMarketData, getFullHistory } from './services/mockDataService';
import { fetchUWMarketData, APIError } from './services/unusualWhalesService';
import { analyzeGexData } from './services/geminiService';
import { AnalysisPacket, GexDataPoint, TradingAlert, AppTab, AppTheme, AppFontSize, SystemError } from './types';
import MarketStats from './components/MarketStats';
import GexChart from './components/GexChart';
import AlertList from './components/AlertList';
import HistoryExplorer from './components/HistoryExplorer';
import Sidebar from './components/Sidebar';
import Panel from './components/Panel';
import CommandTerminal from './components/CommandTerminal';
import SettingsPanel from './components/SettingsPanel';
import ErrorBanner from './components/ErrorBanner';
import StrategyLibrary from './components/StrategyLibrary';
import StrategyStatistics from './components/StrategyStatistics';
import DayRangePanel from './components/DayRangePanel';

const checkMarketOpen = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
    weekday: 'long',
    minute: 'numeric'
  });
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const weekday = parts.find(p => p.type === 'weekday')?.value || '';
  const isWeekday = !['Saturday', 'Sunday'].includes(weekday);
  const totalMinutes = hour * 60 + minute;
  return isWeekday && totalMinutes >= (9 * 60 + 30) && totalMinutes < (16 * 60);
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [marketData, setMarketData] = useState<AnalysisPacket | null>(null);
  const [history, setHistory] = useState<GexDataPoint[]>([]);
  const [alerts, setAlerts] = useState<TradingAlert[]>([]);
  const [isBotRunning, setIsBotRunning] = useState(true);
  const [isSyncPaused, setIsSyncPaused] = useState(false);
  const [autoPauseOffMarket, setAutoPauseOffMarket] = useState(() => localStorage.getItem('sentinel_auto_pause') === 'true');
  const [isAutoPushEnabled, setIsAutoPushEnabled] = useState(true);
  const [uplinkStatus, setUplinkStatus] = useState<'simulated' | 'live' | 'error' | 'paused'>('simulated');
  const [systemError, setSystemError] = useState<SystemError | null>(null);
  const [lastPushSuccess, setLastPushSuccess] = useState<string | null>(null);
  const [marketOpen, setMarketOpen] = useState(checkMarketOpen());
  
  // Visual Monitoring States (Up to 9 streams)
  const [visualStreams, setVisualStreams] = useState<MediaStream[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const lastAnalyzedRef = useRef<number>(0);
  const alertsRef = useRef<TradingAlert[]>([]);

  useEffect(() => { alertsRef.current = alerts; }, [alerts]);

  const [appTheme, setAppTheme] = useState<AppTheme>(() => (localStorage.getItem('sentinel_theme') as AppTheme) || 'emerald');
  const [appFontSize, setAppFontSize] = useState<AppFontSize>(() => (localStorage.getItem('sentinel_font_size') as AppFontSize) || 'base');
  const [externalConfig, setExternalConfig] = useState(() => {
    const saved = localStorage.getItem('sentinel_ext_config');
    const defaultConfig = { uwApiKey: '', discordWebhook: '' };
    if (saved) { try { return { ...defaultConfig, ...JSON.parse(saved) }; } catch (e) { return defaultConfig; } }
    return defaultConfig;
  });

  useEffect(() => {
    localStorage.setItem('sentinel_theme', appTheme);
    document.body.className = `theme-${appTheme}`;
  }, [appTheme]);

  useEffect(() => {
    localStorage.setItem('sentinel_font_size', appFontSize);
    const sizeMap: Record<AppFontSize, string> = { 'xs': '16px', 'sm': '18px', 'base': '19px', 'lg': '21px' };
    document.documentElement.style.setProperty('--app-font-size', sizeMap[appFontSize]);
  }, [appFontSize]);

  useEffect(() => { localStorage.setItem('sentinel_ext_config', JSON.stringify(externalConfig)); }, [externalConfig]);

  useEffect(() => {
    const timer = setInterval(() => {
      const isOpen = checkMarketOpen();
      setMarketOpen(isOpen);
      if (autoPauseOffMarket && !isOpen && !isSyncPaused) setIsSyncPaused(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [autoPauseOffMarket, isSyncPaused]);

  // Multi-Visual Monitoring Logic
  const startVisualMonitoring = async () => {
    if (visualStreams.length >= 9) {
      setSystemError({ message: "监控链路已满 (最大 9 路)", severity: 'warning', timestamp: Date.now(), retryable: false });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: false
      });
      setVisualStreams(prev => [...prev, stream]);
      stream.getVideoTracks()[0].onended = () => {
        setVisualStreams(prev => prev.filter(s => s.id !== stream.id));
      };
    } catch (err) {
      console.error("Screen capture failed:", err);
      setSystemError({ message: "屏幕捕捉启动失败", severity: 'warning', timestamp: Date.now(), retryable: true });
    }
  };

  const stopAllMonitoring = () => {
    visualStreams.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    setVisualStreams([]);
  };

  const removeMonitoring = (index: number) => {
    const stream = visualStreams[index];
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setVisualStreams(prev => prev.filter((_, i) => i !== index));
    }
  };

  const captureAllFrames = (): string[] => {
    const frames: string[] = [];
    if (!canvasRef.current) return frames;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return frames;

    videoRefs.current.forEach((video) => {
      if (video && video.readyState === 4) { // HAVE_ENOUGH_DATA
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
        if (data) frames.push(data);
      }
    });
    return frames;
  };

  const pushToDiscord = useCallback(async (alert: TradingAlert) => {
    if (!externalConfig.discordWebhook) return false;
    try {
      const truncate = (str: string, max: number) => str.length > max ? str.substring(0, max - 3) + "..." : str;
      const rawText = alert.rawAnalysis || alert.analysis;
      const discordPayload = {
        username: "SPX GEX Sentinel",
        embeds: [{
          title: `🎯 ${alert.strategy} 信号触发 - SPX 指数`,
          description: truncate(rawText, 2048),
          color: alert.strategy === 'LONG' ? 3066993 : alert.strategy === 'SHORT' ? 15158332 : 3447003,
          fields: [
            { name: '识别模式', value: alert.pattern || '未知', inline: true },
            { name: '执行现价', value: `$${alert.price}`, inline: true }
          ],
          timestamp: alert.timestamp
        }]
      };
      const res = await fetch(externalConfig.discordWebhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(discordPayload) });
      if (res.ok) {
        setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, pushedToDiscord: true } : a));
        setLastPushSuccess(alert.id);
        setTimeout(() => setLastPushSuccess(null), 5000); 
        return true;
      }
      return false;
    } catch (err) { return false; }
  }, [externalConfig.discordWebhook]);

  const performAnalysis = useCallback(async (packet: AnalysisPacket) => {
    const lastAlert = alertsRef.current[0] || null;
    const screenshots = captureAllFrames();

    try {
      const analysisResult = await analyzeGexData(packet, lastAlert, screenshots, () => {
        setSystemError({ message: "Gemini API 配额已耗尽", severity: 'warning', timestamp: Date.now(), retryable: false });
      });
      const newAlert: TradingAlert = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        price: packet.current_price,
        strategy: analysisResult.strategy || 'NEUTRAL',
        pattern: analysisResult.pattern,
        regime: analysisResult.regime || '未知',
        analysis: analysisResult.analysis || '正在等待资金流解码...',
        risk: analysisResult.risk || '风险监控中',
        rawAnalysis: analysisResult.rawAnalysis || '',
        pushedToDiscord: false
      };
      setAlerts(prev => [newAlert, ...prev].slice(0, 50));
      if (isAutoPushEnabled && newAlert.strategy !== 'NEUTRAL') pushToDiscord(newAlert);
    } catch (err) { console.error(err); }
  }, [pushToDiscord, isAutoPushEnabled]);

  const fetchAndProcess = useCallback(async (isManualRetry = false) => {
    if ((isSyncPaused || !isBotRunning) && !isManualRetry) { setUplinkStatus('paused'); return; }
    try {
      let latest: AnalysisPacket;
      if (externalConfig.uwApiKey) {
        const liveData = await fetchUWMarketData("SPX", externalConfig.uwApiKey);
        if (liveData) { latest = liveData; setUplinkStatus('live'); setSystemError(null); }
        else { latest = getLatestMarketData(); setUplinkStatus('simulated'); }
      } else { latest = getLatestMarketData(); setUplinkStatus('simulated'); }

      setMarketData(latest);
      const netTideVal = latest.market_tide ? (latest.market_tide.net_call_premium - latest.market_tide.net_put_premium) : 0;
      setHistory(prev => [...prev, {
        time: latest.timestamp, price: latest.current_price, gamma_per_one_percent_move_vol: latest.current_gex_vol,
        gamma_per_one_percent_move_oi: latest.current_gex_oi, gamma_1dte_vol: latest.current_1dte_vol,
        gamma_1dte_oi: latest.current_1dte_oi, net_tide: netTideVal, gex_vol_change_rate: latest.gex_vol_change_rate
      }].slice(-500));

      const now = Date.now();
      const analysisInterval = visualStreams.length > 0 ? 60000 : 300000;
      if (now - lastAnalyzedRef.current > analysisInterval || Math.abs(latest.gex_vol_change_rate) > 15000000) {
        await performAnalysis(latest);
        lastAnalyzedRef.current = now;
      }
    } catch (e) { setUplinkStatus('error'); }
  }, [isBotRunning, isSyncPaused, performAnalysis, externalConfig.uwApiKey, visualStreams.length]);

  useEffect(() => {
    fetchAndProcess();
    const interval = setInterval(fetchAndProcess, 120000);
    return () => clearInterval(interval);
  }, [fetchAndProcess]);

  return (
    <div className={`flex h-screen w-screen bg-[#0a0a0c] text-zinc-300 overflow-hidden font-sans transition-colors duration-500 theme-${appTheme}`}>
      <Sidebar activeTab={activeTab} setActiveTab={(tab) => setActiveTab(tab as AppTab)} />
      <ErrorBanner error={systemError} onClear={() => setSystemError(null)} onRetry={() => fetchAndProcess(true)} />
      
      {/* Hidden processing elements */}
      <canvas ref={canvasRef} className="hidden" />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-16 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md px-6 flex items-center justify-between z-10">
          <h1 className="text-xl font-black tracking-tighter text-white flex items-center gap-3">
            SPX GEX 哨兵 <span className="text-[10px] bg-[rgba(var(--accent-rgb),0.1)] accent-text px-1.5 py-0.5 rounded uppercase font-black border border-[rgba(var(--accent-rgb),0.2)]">R.C.-02</span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
               <button 
                onClick={startVisualMonitoring} 
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${visualStreams.length > 0 ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}
              >
                <i className="fa-solid fa-plus-circle"></i>
                添加监控 ({visualStreams.length}/9)
              </button>
              {visualStreams.length > 0 && (
                <button 
                  onClick={stopAllMonitoring} 
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[11px] font-black uppercase tracking-widest"
                >
                  清除全部
                </button>
              )}
            </div>
            <div className="h-6 w-px bg-zinc-800"></div>
            <button onClick={() => setIsSyncPaused(!isSyncPaused)} className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-black uppercase tracking-widest">{isSyncPaused ? '启动同步' : '暂停同步'}</button>
            <button onClick={() => fetchAndProcess(true)} className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-black uppercase tracking-widest">强制同步</button>
            <button onClick={() => setIsBotRunning(!isBotRunning)} className={`px-4 py-1.5 rounded-lg font-black text-[11px] uppercase tracking-[0.2em] transition-all border ${isBotRunning ? 'bg-zinc-900 text-rose-500 border-rose-500/20' : 'bg-[rgb(var(--accent-rgb))] text-black border-white/20'}`}>{isBotRunning ? '紧急停机' : '启动引擎'}</button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-zinc-950/20">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full">
              <div className="xl:col-span-3 space-y-6">
                
                {/* Visual Monitor Matrix (3x3 Grid) */}
                {visualStreams.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {visualStreams.map((stream, idx) => (
                      <div key={stream.id} className="relative aspect-video bg-black rounded-xl border border-zinc-800 overflow-hidden group shadow-xl">
                        <video 
                          ref={el => videoRefs.current[idx] = el}
                          autoPlay 
                          playsInline 
                          muted 
                          onLoadedMetadata={(e) => {
                            const video = e.currentTarget;
                            video.srcObject = stream;
                            video.play();
                          }}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/80 rounded text-[9px] font-black text-amber-500 border border-amber-500/30">
                          MONITOR-0{idx+1}
                        </div>
                        <button 
                          onClick={() => removeMonitoring(idx)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <i className="fa-solid fa-xmark text-xs"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <MarketStats data={marketData} />
                <DayRangePanel data={marketData} />
                <Panel>
                  <GexChart 
                    data={history.slice(-60)} 
                    priceLevels={marketData?.price_levels}
                    volatilityTrigger={marketData?.volatility_trigger}
                    hvnPrice={marketData?.hvn_price}
                    zeroGamma={marketData?.zero_gamma}
                    kingStrike={marketData?.king_strike}
                    topOiStrikes={marketData?.top_oi_strikes}
                    topDarkPoolStrikes={marketData?.top_dark_pool_strikes}
                  />
                </Panel>
              </div>
              <div className="xl:col-span-1 h-full">
                <Panel title="情报流" subtitle="AI 策略信号" icon="fa-solid fa-satellite" className="h-full">
                  <AlertList alerts={alerts} onManualPush={pushToDiscord} lastPushSuccess={lastPushSuccess} />
                </Panel>
              </div>
            </div>
          )}
          {activeTab === 'audit' && <HistoryExplorer history={history} />}
          {activeTab === 'terminal' && <CommandTerminal onInject={(d) => setMarketData(d)} onAnalyze={performAnalysis} currentMarketData={marketData} config={externalConfig} onConfigUpdate={(k, v) => setExternalConfig(p => ({ ...p, [k]: v }))} />}
          {activeTab === 'strategy' && <StrategyLibrary />}
          {activeTab === 'settings' && <SettingsPanel theme={appTheme} fontSize={appFontSize} onThemeChange={setAppTheme} onFontSizeChange={setAppFontSize} />}
          {activeTab === 'statistics' && <StrategyStatistics alerts={alerts} />}
        </div>
        <footer className="h-8 bg-zinc-950 border-t border-zinc-900 px-6 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
           <div className="flex items-center gap-6">
             <div>STATUS: <span className={uplinkStatus === 'live' ? "accent-text" : "text-zinc-600"}>{uplinkStatus.toUpperCase()}</span></div>
             <div className="flex items-center gap-2">
               VISION MATRIX: <span className={visualStreams.length > 0 ? "text-amber-500" : "text-zinc-600"}>{visualStreams.length > 0 ? `ACTIVE [${visualStreams.length}/9]` : "OFFLINE"}</span>
             </div>
           </div>
           <div>{new Date().toISOString()}</div>
        </footer>
      </main>
    </div>
  );
};
export default App;
