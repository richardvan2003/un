
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
  
  const lastAnalyzedRef = useRef<number>(0);
  const consecutiveFailuresRef = useRef<number>(0);

  // Preference Persistence
  const [appTheme, setAppTheme] = useState<AppTheme>(() => 
    (localStorage.getItem('sentinel_theme') as AppTheme) || 'emerald'
  );
  const [appFontSize, setAppFontSize] = useState<AppFontSize>(() => 
    (localStorage.getItem('sentinel_font_size') as AppFontSize) || 'base'
  );

  // External Config Persistence
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

  // Sync Preferences
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

  const performAnalysis = useCallback(async (packet: AnalysisPacket) => {
    setIsAnalyzing(true);
    try {
      const analysisResult = await analyzeGexData(packet, () => {
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
        regime: analysisResult.regime || '未知',
        analysis: analysisResult.analysis || '正在等待资金流解码...',
        risk: analysisResult.risk || '风险监控运行中。',
        rawAnalysis: analysisResult.rawAnalysis || ''
      };

      setAlerts(prev => [newAlert, ...prev].slice(0, 50));

      if (externalConfig.discordWebhook && analysisResult.strategy !== 'NEUTRAL') {
        fetch(externalConfig.discordWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: `🎯 ${newAlert.strategy} 信号触发 - SPX`,
              color: newAlert.strategy === 'LONG' ? 65280 : 16711680,
              fields: [
                { name: '现价', value: `$${newAlert.price}`, inline: true },
                { name: '制度', value: newAlert.regime, inline: true },
                { name: '分析', value: newAlert.analysis },
                { name: '风险', value: newAlert.risk }
              ],
              timestamp: newAlert.timestamp
            }]
          })
        }).catch(err => console.error("Discord 转发失败:", err));
      }
    } catch (err) {
      setSystemError({
        message: "AI 分析链路异常，请检查 Gemini API 配置。",
        severity: 'error',
        timestamp: Date.now(),
        retryable: true
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [externalConfig.discordWebhook]);

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
      
      const newHistoryPoint: GexDataPoint = {
        time: latest.timestamp,
        price: latest.current_price,
        gamma_per_one_percent_move_vol: latest.current_gex_vol,
        gamma_per_one_percent_move_oi: latest.current_gex_oi,
        gamma_1dte_vol: latest.current_1dte_vol,
        gamma_1dte_oi: latest.current_1dte_oi
      };

      setHistory(prev => {
        const filtered = prev.filter(p => p.time !== newHistoryPoint.time);
        return [...filtered, newHistoryPoint].slice(-500);
      });

      const now = Date.now();
      const threeMinutes = 180000;
      const whaleThreshold = 5000000;

      if (now - lastAnalyzedRef.current > threeMinutes || Math.abs(latest.gex_vol_change_rate) > whaleThreshold) {
        await performAnalysis(latest);
        lastAnalyzedRef.current = now;
      }
    } catch (e: any) {
      console.error("数据循环故障:", e);
      consecutiveFailuresRef.current++;
      setUplinkStatus('error');
      
      // Upgrade severity if failures persist
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
    const interval = setInterval(fetchAndProcess, 5000);
    return () => clearInterval(interval);
  }, [fetchAndProcess]);

  const handleManualInject = (data: AnalysisPacket) => {
    setMarketData(data);
    setHistory(prev => [...prev, {
      time: data.timestamp,
      price: data.current_price,
      gamma_per_one_percent_move_vol: data.current_gex_vol,
      gamma_per_one_percent_move_oi: data.current_gex_oi,
      gamma_1dte_vol: data.current_1dte_vol,
      gamma_1dte_oi: data.current_1dte_oi
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
                <Panel title="流动性动态" subtitle="做市商实时对冲敞口 (Spot GEX)" icon="fa-solid fa-chart-area">
                  <GexChart data={history.slice(-60)} />
                </Panel>
              </div>
              <div className="xl:col-span-1 h-full">
                <Panel title="情报流" subtitle="AI 策略信号" icon="fa-solid fa-satellite" className="h-full">
                  <AlertList alerts={alerts} />
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
            <div className="max-w-4xl mx-auto py-12">
               <Panel title="指挥指令" subtitle="核心交易逻辑 (UW API 原理)" icon="fa-solid fa-shield-halved">
                  <div className="space-y-6">
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      当 <b className="accent-text">Spot GEX</b> 为正时，做市商在股价下跌时买入，上涨时卖出，从而<b>抑制波动性</b>。
                      当 <b className="text-rose-400">Spot GEX</b> 为负时，做市商在股价上涨时买入，下跌时卖出，从而<b>加剧波动性</b>。
                    </p>
                  </div>
               </Panel>
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
