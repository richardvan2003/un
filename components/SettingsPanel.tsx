import React from 'react';
import { AppTheme, AppFontSize } from '../types';
import Panel from './Panel';

interface SettingsPanelProps {
  theme: AppTheme;
  fontSize: AppFontSize;
  onThemeChange: (theme: AppTheme) => void;
  onFontSizeChange: (size: AppFontSize) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ theme, fontSize, onThemeChange, onFontSizeChange }) => {
  const themes: { id: AppTheme; label: string; color: string; desc: string }[] = [
    { id: 'emerald', label: '翡翠哨兵', color: 'bg-emerald-500', desc: '经典极客绿，高对比度监控' },
    { id: 'ocean', label: '深海链路', color: 'bg-blue-500', desc: '宁静科技蓝，适合长时间盯盘' },
    { id: 'obsidian', label: '黑曜金边', color: 'bg-amber-500', desc: '奢华琥珀金，暗色调中的焦点' },
    { id: 'crimson', label: '绯红警戒', color: 'bg-rose-500', desc: '热血战地红，强化波动感知' },
  ];

  const fontSizes: { id: AppFontSize; label: string; size: string }[] = [
    { id: 'xs', label: '紧凑 (XS)', size: '13px' },
    { id: 'sm', label: '精简 (SM)', size: '15px' },
    { id: 'base', label: '标准 (Base)', size: '17px' },
    { id: 'lg', label: '清晰 (LG)', size: '19px' },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8 font-mono">
      <Panel title="界面偏好" subtitle="定制您的数字化作战空间" icon="fa-solid fa-palette">
        <div className="space-y-10 py-4">
          
          <div className="space-y-4">
            <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-droplet text-[rgb(var(--accent-rgb))]"></i> 主题色彩方案
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onThemeChange(t.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                    theme === t.id 
                    ? 'bg-zinc-900 border-[rgb(var(--accent-rgb))] shadow-[0_0_20px_rgba(var(--accent-rgb),0.1)]' 
                    : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl ${t.color} flex-shrink-0 shadow-lg shadow-black/40`}></div>
                  <div>
                    <p className={`text-sm font-black uppercase ${theme === t.id ? 'text-white' : 'text-zinc-400'}`}>{t.label}</p>
                    <p className="text-[11px] text-zinc-600 mt-1">{t.desc}</p>
                  </div>
                  {theme === t.id && (
                    <div className="ml-auto">
                      <i className="fa-solid fa-circle-check accent-text text-base"></i>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-zinc-900"></div>

          <div className="space-y-4">
             <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-font text-[rgb(var(--accent-rgb))]"></i> 文本渲染比例
            </h4>
            <div className="flex flex-wrap gap-4">
              {fontSizes.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onFontSizeChange(f.id)}
                  className={`flex-1 min-w-[120px] p-4 rounded-xl border transition-all ${
                    fontSize === f.id
                    ? 'bg-zinc-900 border-[rgb(var(--accent-rgb))] accent-text'
                    : 'bg-zinc-900/20 border-zinc-800 text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  <p className="text-[11px] font-black uppercase mb-1">{f.label}</p>
                  <p style={{ fontSize: f.size }} className="font-bold">Sentinel</p>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-700 italic">"调整将应用于所有面板、图表标签及系统日志。"</p>
          </div>

        </div>
      </Panel>

      <Panel title="系统状态" icon="fa-solid fa-microchip">
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2">
            <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-900">
               <span className="text-[9px] text-zinc-600 font-black uppercase block mb-1">持久化存储</span>
               <span className="text-[11px] text-emerald-500 font-bold">LOCAL_CACHE_OK</span>
            </div>
            <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-900">
               <span className="text-[9px] text-zinc-600 font-black uppercase block mb-1">渲染引擎</span>
               <span className="text-[11px] text-blue-500 font-bold">RECHART_V2.15</span>
            </div>
            <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-900">
               <span className="text-[9px] text-zinc-600 font-black uppercase block mb-1">应用版本</span>
               <span className="text-[11px] text-zinc-400 font-bold">SENTINEL_2.5.0</span>
            </div>
            <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-900">
               <span className="text-[9px] text-zinc-600 font-black uppercase block mb-1">通信协议</span>
               <span className="text-[11px] text-indigo-400 font-bold">SECURE_SSL_UP</span>
            </div>
         </div>
      </Panel>
    </div>
  );
};

export default SettingsPanel;