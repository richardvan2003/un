
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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [marketData, setMarketData] = useState<AnalysisPacket | null>(null);
  const [history, setHistory] = useState<GexDataPoint[]>([]);
  const [alerts, setAlerts] = useState<TradingAlert[]>([]);
  const [isBotRunning, setIsBotRunning] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [hasPaidKey, setHasPaidKey] = useState(false);
  const [uplinkStatus, setUplinkStatus] = useState<'simulated' | 'live' | 'error'>('simulated');
  const [systemError, setSystemError] = useState<SystemError | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [lastPushSuccess, setLastPushSuccess] = useState<string | null>(null);
  
  const lastAnalyzedRef = useRef<number>(0);
  const consecutiveFailuresRef = useRef<number>(0);
  const alertsRef = useRef<TradingAlert[]>([]);

  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  const [appTheme, setAppTheme] = useState<AppTheme>(() => 
    (localStorage.getItem('sentinel_theme') as AppTheme) || 'emerald'
  );
  const [appFontSize, setAppFontSize] = useState<AppFontSize>(() => 
    (localStorage.getItem('sentinel_font_size') as AppFontSize) || 'base'
  );

  const [externalConfig, setExternalConfig] = useState(() => {
    const saved = localStorage.getItem('sentinel_ext_config');
    const defaultConfig = { 
      uwApiKey: '84852589-3cb4-4c79-a590-38c81f3f1761', 
      discordWebhook: 'https://discord.com/api/webhooks/1454023725623152851/io3ru2yia1oyZhRtGFNvg6ZyOpSTIyNy8RD_4hPijy7CM8zfDP8iwsWukar100wuHZNa' 
    };
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.uwApiKey) parsed.uwApiKey = defaultConfig.uwApiKey;
        if (!parsed.discordWebhook) parsed.discordWebhook = defaultConfig.discordWebhook;
        return parsed;
      } catch (e) {
        return defaultConfig;
      }
    }
    return defaultConfig;
  });

  useEffect(() => {
    localStorage.setItem('sentinel_theme', appTheme);
    document.body.className = `theme-${appTheme}`;
  }, [appTheme]);

  useEffect(() => {
    localStorage.setItem('sentinel_font_size', appFontSize);
    const sizeMap: Record<AppFontSize, string> = {
      'xs': '13px', 'sm': '15px', 'base': '16px', 'lg': '18px'
    };
    document.documentElement.style.setProperty('--app-font-size', sizeMap[appFontSize]);
  }, [appFontSize]);

  useEffect(() => {
    localStorage.setItem('sentinel_ext_config', JSON.stringify(externalConfig));
  }, [externalConfig]);

  useEffect(() => {
    if (window.aistudio?.hasSelectedApiKey) {
      window.aistudio.hasSelectedApiKey().then(setHasPaidKey);
    }
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasPaidKey(true);
      setQuotaExceeded(false);
      setSystemError(null);
    } else {
      window.open('https://ai.google.dev/gemini-api/docs/billing', '_blank');
    }
  };

  const pushToDiscord = useCallback(async (alert: TradingAlert) => {
    if (!externalConfig.discordWebhook) return false;
    
    setIsBroadcasting(true);
    try {
      const truncate = (str: string, max: number) => str.length > max ? str.substring(0, max - 3) + "..." : str;
      const chunks = [];
      const rawText = alert.rawAnalysis || alert.analysis;
      for (let i = 0; i < rawText.length; i += 2000) {
        chunks.push(rawText.substring(i, i + 2000));
      }

      const discordPayload = {
        username: "SPX GEX Sentinel",
        avatar_url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/shuttle-space.svg",
        embeds: chunks.slice(0, 10).map((chunk, idx) => ({
          title: idx === 0 ? `🎯 ${alert.strategy} 信号触发 - SPX 指数` : `🎯 分析报告 (续 ${idx + 1})`,
          description: truncate(chunk, 2048),
          color: alert.strategy === 'LONG' ? 3066993 : alert.strategy === 'SHORT' ? 15158332 : 3447003,
          fields: idx === 0 ? [
            { name: '识别模式', value: alert.pattern || '未知', inline: true },
            { name: '推荐策略', value: alert.recommendedStrategies?.join(', ') || 'N/A', inline: true },
            { name: '执行现价', value: `$${alert.price}`, inline: true },
            { name: '市场制度', value: truncate(alert.regime, 256), inline: true },
            { name: '风险提示', value: truncate(alert.risk, 1024) }
          ] : [],
          footer: {
            text: `Sentinel R.C.-02 | 动力学解码引擎 | 第 ${idx + 1} 部分`
          },
          timestamp: alert.timestamp
        }))
      };

      const res = await fetch(externalConfig.discordWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, pushedToDiscord: true } : a));
      setLastPushSuccess(alert.id);
      setTimeout(() => setLastPushSuccess(null), 5000); 
      return true;
    } catch (err) {
      console.error("Discord 推送失败:", err);
      return false;
    } finally {
      setIsBroadcasting(false);
    }
  }, [externalConfig.discordWebhook]);

  const performAnalysis = useCallback(async (packet: AnalysisPacket) => {
    setIsAnalyzing(true);
    const lastAlert = alertsRef.current[0] || null;
    
    try {
      const analysisResult = await analyzeGexData(packet, lastAlert, () => {
        setQuotaExceeded(true);
        setSystemError({
          message: "Gemini API 配额已耗尽，请考虑升级或切换付费 Key。",
          severity: 'warning',
          timestamp: Date.now(),
          retryable: false
        });
      });
      
      const newAlert: TradingAlert = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        price: packet.current_price,
        strategy: analysisResult.strategy || 'NEUTRAL',
        pattern: analysisResult.pattern,
        recommendedStrategies: analysisResult.recommendedStrategies,
        regime: analysisResult.regime || '未知',
        analysis: analysisResult.analysis || '正在等待资金流解码...',
        risk: analysisResult.risk || '风险监控运行中。',
        rawAnalysis: analysisResult.rawAnalysis || '',
        pushedToDiscord: false
      };

      setAlerts(prev => [newAlert, ...prev].slice(0, 50));
      if (newAlert.strategy !== 'NEUTRAL') {
        pushToDiscord(newAlert);
      }
    } catch (err: any) {
      setSystemError({
        message: `Gemini Multi-DTE 分析错误: ${err?.message || '未知通信异常'}`,
        severity: 'error',
        timestamp: Date.now(),
        retryable: true
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [pushToDiscord]);

  const fetchAndProcess = useCallback(async (isManualRetry = false) => {
    if (!isBotRunning && !isManualRetry) return;

    try {
      let latest: AnalysisPacket;
      if (externalConfig.uwApiKey) {
        const liveData = await fetchUWMarketData("SPX", externalConfig.uwApiKey);
        if (liveData) {
          latest = liveData;
          setUplinkStatus('live');
          consecutiveFailuresRef.current = 0;
          if (systemError?.code === 'AUTH_FAILED' || systemError?.code === 'TIMEOUT') {
             setSystemError(null);
          }
        } else {
          latest = getLatestMarketData();
          setUplinkStatus('simulated');
        }
      } else {
        latest = getLatestMarketData();
        setUplinkStatus('simulated');
      }

      setMarketData(latest);
      
      const netTideVal = latest.market_tide 
        ? (latest.market_tide.net_call_premium - latest.market_tide.net_put_premium) 
        : (latest.trend_data[latest.trend_data.length - 1]?.net_tide || 0);

      const newHistoryPoint: GexDataPoint = {
        time: latest.timestamp,
        price: latest.current_price,
        gamma_per_one_percent_move_vol: latest.current_gex_vol,
        gamma_per_one_percent_move_oi: latest.current_gex_oi,
        gamma_1dte_vol: latest.current_1dte_vol,
        gamma_1dte_oi: latest.current_1dte_oi,
        net_tide: netTideVal,
        gex_vol_change_rate: latest.gex_vol_change_rate,
        gex_1dte_wall: latest.gex_1dte_wall,
        gex_1dte_block: latest.gex_1dte_block,
        gex_1dte_drive: latest.gex_1dte_drive
      };

      setHistory(prev => {
        const filtered = prev.filter(p => p.time !== newHistoryPoint.time);
        return [...filtered, newHistoryPoint].slice(-500);
      });

      const now = Date.now();
      const interval = 300000; 
      const whaleThreshold = 15000000; 

      if (now - lastAnalyzedRef.current > interval || Math.abs(latest.gex_vol_change_rate) > whaleThreshold) {
        await performAnalysis(latest);
        lastAnalyzedRef.current = now;
      }
    } catch (e: any) {
      console.error("数据循环故障:", e);
      consecutiveFailuresRef.current++;
      setUplinkStatus('error');
      
      if (consecutiveFailuresRef.current > 3) {
        setSystemError({
          message: e instanceof APIError ? e.message : "实时上行链路多次尝试连接失败，切换至模拟模式。",
          severity: 'error',
          code: e.code,
          timestamp: Date.now(),
          retryable: true
        });
      }

      const fallback = getLatestMarketData();
      setMarketData(fallback);
    }
  }, [isBotRunning, performAnalysis, externalConfig.uwApiKey, systemError]);

  useEffect(() => {
    fetchAndProcess();
    const interval = setInterval(fetchAndProcess, 120000);
    return () => clearInterval(interval);
  }, [fetchAndProcess]);

  const handleManualInject = (data: AnalysisPacket) => {
    setMarketData(data);
    const netTideVal = data.market_tide 
      ? (data.market_tide.net_call_premium - data.market_tide.net_put_premium) 
      : 0;
      
    setHistory(prev => [...prev, {
      time: data.timestamp,
      price: data.current_price,
      gamma_per_one_percent_move_vol: data.current_gex_vol,
      gamma_per_one_percent_move_oi: data.current_gex_oi,
      gamma_1dte_vol: data.current_1dte_vol,
      gamma_1dte_oi: data.current_1dte_oi,
      net_tide: netTideVal,
      gex_vol_change_rate: data.gex_vol_change_rate,
      gex_1dte_wall: data.gex_1dte_wall,
      gex_1dte_block: data.gex_1dte_block,
      gex_1dte_drive: data.gex_1dte_drive
    }].slice(-500));
  };

  const handleConfigUpdate = (key: string, value: string) => {
    setExternalConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className={`flex h-screen w-screen bg-[#0a0a0c] text-zinc-300 overflow-hidden font-sans transition-colors duration-500 theme-${appTheme}`}>
      <Sidebar activeTab={activeTab} setActiveTab={(tab) => setActiveTab(tab as AppTab)} />
      
      <ErrorBanner 
        error={systemError} 
        onClear={() => setSystemError(null)} 
        onRetry={() => fetchAndProcess(true)} 
      />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[rgba(var(--accent-rgb),0)] via-[rgba(var(--accent-rgb),0.5)] to-[rgba(var(--accent-rgb),0)] z-20"></div>
        
        <header className="h-16 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-black tracking-tighter text-white flex items-center gap-3">
              SPX GEX 哨兵
              <span className="text-[8px] bg-[rgba(var(--accent-rgb),0.1)] accent-text px-1.5 py-0.5 rounded uppercase font-black border border-[rgba(var(--accent-rgb),0.2)] tracking-[0.1em]">R.C.-02</span>
            </h1>
            <div className="h-4 w-px bg-zinc-800"></div>
            
            <div className={`flex items-center gap-2 px-2 py-1 rounded border transition-all duration-300 ${
              uplinkStatus === 'live' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
              uplinkStatus === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse' :
              'bg-amber-500/10 border-amber-500/30 text-amber-500'
            }`}>
               <div className={`w-1 h-1 rounded-full ${uplinkStatus === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-current'}`}></div>
               <span className="text-[8px] font-black uppercase tracking-widest">
                 Uplink: {uplinkStatus === 'live' ? 'UW-LIVE' : uplinkStatus === 'error' ? 'UPLINK-FAIL' : 'SIMULATED'}
               </span>
            </div>

            {isBroadcasting && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                <i className="fa-brands fa-discord text-[10px]"></i>
                <span className="text-[9px] font-black uppercase tracking-widest">正在广播到 Discord...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {!hasPaidKey && (
              <button 
                onClick={handleOpenKeySelector}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all"
              >
                <i className="fa-solid fa-bolt-lightning"></i> 升级 AI Key
              </button>
            )}

            <button 
              onClick={() => setIsBotRunning(!isBotRunning)}
              className={`px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-[0.2em] transition-all border ${
                isBotRunning ? 'bg-zinc-900 text-rose-500 border-rose-500/20 hover:bg-rose-500/5' : 'bg-[rgb(var(--accent-rgb))] text-black border-white/20 shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]'
              }`}
            >
              {isBotRunning ? '紧急停机' : '启动引擎'}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-zinc-950/20">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full">
              <div className="xl:col-span-3 space-y-6">
                <MarketStats data={marketData} />
                <Panel title="流动性动态" subtitle="做市商实时对冲敞口 & 成交量墙" icon="fa-solid fa-chart-area">
                  <GexChart 
                    data={history.slice(-60)} 
                    priceLevels={marketData?.price_levels}
                    volatilityTrigger={marketData?.volatility_trigger}
                    hvnPrice={marketData?.hvn_price}
                  />
                </Panel>
              </div>
              <div className="xl:col-span-1 h-full">
                <Panel title="情报流" subtitle="AI 策略信号" icon="fa-solid fa-satellite" className="h-full">
                  <AlertList 
                    alerts={alerts} 
                    onManualPush={pushToDiscord} 
                    lastPushSuccess={lastPushSuccess}
                  />
                </Panel>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="h-full">
              <HistoryExplorer history={history} />
            </div>
          )}

          {activeTab === 'terminal' && (
            <div className="h-full">
              <CommandTerminal 
                onInject={handleManualInject} 
                onAnalyze={performAnalysis} 
                currentMarketData={marketData}
                config={externalConfig}
                onConfigUpdate={handleConfigUpdate}
              />
            </div>
          )}

          {activeTab === 'strategy' && (
            <div className="h-full">
               <StrategyLibrary />
            </div>
          )}

          {activeTab === 'settings' && (
            <SettingsPanel 
              theme={appTheme} 
              fontSize={appFontSize} 
              onThemeChange={setAppTheme} 
              onFontSizeChange={setAppFontSize} 
            />
          )}
        </div>

        <footer className="h-8 bg-zinc-950 border-t border-zinc-900 px-6 flex items-center justify-between text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">
           <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <i className="fa-solid fa-server"></i> UW-DATA: <span className={uplinkStatus === 'live' ? "accent-text" : "text-zinc-600"}>{uplinkStatus === 'live' ? "ESTABLISHED" : "STANDBY"}</span>
              </span>
           </div>
           <div>SECURITY_CLEARANCE: LEVEL_4 // {new Date().toISOString()}</div>
        </footer>
      </main>
    </div>
  );
};

export default App;
