import React, { useState } from 'react';
import { Smartphone, Monitor, Wifi, Battery, Signal } from 'lucide-react';

interface AndroidViewWrapperProps {
  children: React.ReactNode;
}

export const AndroidViewWrapper: React.FC<AndroidViewWrapperProps> = ({ children }) => {
  const [isMobileFrame, setIsMobileFrame] = useState(true);

  return (
    <div className="min-h-screen bg-slate-900/5 flex flex-col items-center justify-start sm:p-4">
      {/* Top Device Switcher Toolbar */}
      <div className="w-full max-w-md flex items-center justify-between px-4 py-2 my-1 text-xs font-bold text-slate-600 bg-white/70 backdrop-blur-xs rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>تطبيق أندرويد (ذاكرتي تحكي)</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setIsMobileFrame(true)}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
              isMobileFrame
                ? 'bg-white text-amber-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>هاتف</span>
          </button>
          <button
            onClick={() => setIsMobileFrame(false)}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
              !isMobileFrame
                ? 'bg-white text-amber-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>كامل</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div
        className={`w-full transition-all duration-300 ${
          isMobileFrame
            ? 'max-w-[440px] bg-amber-50/40 rounded-[44px] shadow-2xl border-8 border-slate-800 my-2 overflow-hidden relative'
            : 'max-w-2xl bg-amber-50/40 rounded-3xl shadow-sm border border-amber-100 my-2'
        }`}
      >
        {/* Android Status Bar (when in mobile frame) */}
        {isMobileFrame && (
          <div className="w-full bg-amber-100/50 px-6 py-2 flex items-center justify-between text-[11px] font-bold text-slate-700 select-none border-b border-amber-200/50">
            <span>10:30</span>
            <div className="w-24 h-4 bg-slate-800/10 rounded-full flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-slate-800/30" />
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <Battery className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="min-h-[640px] flex flex-col justify-between">
          {children}
        </div>

        {/* Android Navigation Bar Bar (when in mobile frame) */}
        {isMobileFrame && (
          <div className="w-full py-2.5 flex items-center justify-center bg-transparent">
            <div className="w-32 h-1 bg-slate-400/50 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
};
