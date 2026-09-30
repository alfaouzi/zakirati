import React from 'react';
import { Home, Volume2, VolumeX } from 'lucide-react';
import { GameScreen } from '../types/game';
import { AppSymbol } from './AppLogo';

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
    <header className="w-full bg-white/90 backdrop-blur-md border-b border-amber-100 sticky top-0 z-30 px-3 sm:px-4 py-2.5 sm:py-3 shadow-xs">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 group text-right focus:outline-hidden cursor-pointer"
          title="الرئيسية"
        >
          <div className="shrink-0 group-hover:scale-105 transition-transform duration-200">
            <AppSymbol size={38} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-amber-950 tracking-tight leading-tight">
              صدى حكايتي
            </h1>
            <span className="text-[10px] sm:text-[11px] font-semibold text-teal-700 block -mt-0.5">
              My Memory Tells
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onToggleSound}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 flex items-center justify-center transition-colors border border-amber-200/60"
            title={soundEnabled ? 'كتم الصوت' : 'تشغيل الصوت'}
            aria-label={soundEnabled ? 'كتم الصوت' : 'تشغيل الصوت'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-800" />
            ) : (
              <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            )}
          </button>

          {currentScreen !== 'HOME' && (
            <button
              onClick={onNavigateHome}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 flex items-center justify-center transition-colors border border-amber-200/60"
              title="العودة للرئيسية"
              aria-label="العودة للرئيسية"
            >
              <Home className="w-4 h-4 sm:w-5 sm:h-5 text-amber-800" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
