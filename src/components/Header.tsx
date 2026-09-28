import React from 'react';
import { Sparkles, Home, Volume2, VolumeX } from 'lucide-react';
import { GameScreen } from '../types/game';

interface HeaderProps {
  currentScreen: GameScreen;
  onNavigateHome: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigateHome,
  soundEnabled,
  onToggleSound,
}) => {
  return (
    <header className="w-full bg-white/90 backdrop-blur-md border-b border-amber-100 sticky top-0 z-30 px-4 py-3 shadow-xs">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 group text-right focus:outline-hidden"
          title="الرئيسية"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-xs group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-amber-900 fill-amber-200" />
          </div>
          <div>
            <h1 className="text-lg font-black text-amber-950 tracking-tight">
              ذاكرتي تحكي
            </h1>
            <span className="text-[11px] font-semibold text-amber-700/80 block -mt-1">
              My Memory Tells
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSound}
            className="w-10 h-10 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 flex items-center justify-center transition-colors border border-amber-200/60"
            title={soundEnabled ? 'كتم الصوت' : 'تشغيل الصوت'}
            aria-label={soundEnabled ? 'كتم الصوت' : 'تشغيل الصوت'}
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-amber-800" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {currentScreen !== 'HOME' && (
            <button
              onClick={onNavigateHome}
              className="w-10 h-10 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 flex items-center justify-center transition-colors border border-amber-200/60"
              title="العودة للرئيسية"
              aria-label="العودة للرئيسية"
            >
              <Home className="w-5 h-5 text-amber-800" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
