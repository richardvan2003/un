
import React from 'react';

interface PanelProps {
  title?: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const Panel: React.FC<PanelProps> = ({ title, subtitle, icon, children, footer, className = "" }) => {
  return (
    <div className={`bg-zinc-950/50 border border-zinc-800/50 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden ${className}`}>
      {title && (
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/10">
          <div className="flex items-center gap-3">
            {icon && <i className={`${icon} text-zinc-500 text-xs`}></i>}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 leading-none">{title}</h3>
              {subtitle && <p className="text-[8px] text-zinc-600 font-bold uppercase mt-1 tracking-wider">{subtitle}</p>}
            </div>
          </div>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-800"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-800"></div>
          </div>
        </div>
      )}
      <div className={`flex-1 ${!title ? 'p-2' : 'p-4'}`}>
        {children}
      </div>
      {footer && (
        <div className="px-4 py-2 bg-black/20 border-t border-zinc-900/50">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Panel;
