
import React from 'react';
import { SystemError } from '../types';

interface ErrorBannerProps {
  error: SystemError | null;
  onClear: () => void;
  onRetry?: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, onClear, onRetry }) => {
  if (!error) return null;

  const severityStyles = {
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
    error: 'bg-rose-500/10 border-rose-500/30 text-rose-500',
    critical: 'bg-red-600/20 border-red-600/40 text-red-400'
  };

  const severityIcons = {
    warning: 'fa-triangle-exclamation',
    error: 'fa-circle-exclamation',
    critical: 'fa-skull-crossbones'
  };

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] min-w-[320px] max-w-[90vw] p-4 rounded-2xl border backdrop-blur-xl shadow-2xl animate-in slide-in-from-top duration-300 ${severityStyles[error.severity]}`}>
      <div className="flex items-start gap-4">
        <div className="mt-1">
          <i className={`fa-solid ${severityIcons[error.severity]} text-lg`}></i>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-[10px] font-black uppercase tracking-widest">
              系统报告 - {error.severity === 'critical' ? '严重故障' : error.severity === 'error' ? '运行错误' : '异常警报'}
            </h4>
            <span className="text-[8px] opacity-50 font-mono">
              {new Date(error.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-xs font-bold leading-tight mb-3">
            {error.message}
          </p>
          <div className="flex gap-3">
            {error.retryable && onRetry && (
              <button 
                onClick={onRetry}
                className="px-3 py-1 bg-current text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity"
              >
                重试操作
              </button>
            )}
            <button 
              onClick={onClear}
              className="px-3 py-1 border border-current rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-current/10 transition-colors"
            >
              忽略
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorBanner;
