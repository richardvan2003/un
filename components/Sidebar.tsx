
import React from 'react';
import { AppTab } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: AppTab) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems: { id: AppTab; icon: string; label: string }[] = [
    { id: 'dashboard', icon: 'fa-solid fa-gauge-high', label: '实时监控' },
    { id: 'strategy', icon: 'fa-solid fa-chess-knight', label: '策略手册' },
    { id: 'audit', icon: 'fa-solid fa-database', label: '数据审计' },
    { id: 'terminal', icon: 'fa-solid fa-terminal', label: '命令终端' },
    { id: 'settings', icon: 'fa-solid fa-sliders', label: '个性化' },
    { id: 'statistics', icon: 'fa-solid fa-chart-pie', label: '策略统计' },
  ];

  return (
    <div className="w-16 md:w-20 bg-zinc-950 border-r border-zinc-900 flex flex-col items-center py-6 gap-8 z-50">
      <div className="w-11 h-11 bg-[rgb(var(--accent-rgb))] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] mb-4 cursor-pointer transition-all" onClick={() => setActiveTab('dashboard')}>
        <i className="fa-solid fa-shuttle-space text-black text-xl"></i>
      </div>
      
      <nav className="flex flex-col gap-4 flex-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group ${
              activeTab === item.id 
              ? 'bg-[rgba(var(--accent-rgb),0.1)] accent-text border border-[rgba(var(--accent-rgb),0.2)]' 
              : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <i className={`${item.icon} text-base`}></i>
            <span className="text-[9px] font-black uppercase tracking-tighter text-center px-1">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-4 text-zinc-700">
        <button onClick={() => setActiveTab('settings')} className={`transition-colors ${activeTab === 'settings' ? 'accent-text' : 'hover:text-zinc-400'}`}><i className="fa-solid fa-gear text-lg"></i></button>
        <button className="hover:text-zinc-400 transition-colors"><i className="fa-solid fa-circle-user text-lg"></i></button>
      </div>
    </div>
  );
};

export default Sidebar;
