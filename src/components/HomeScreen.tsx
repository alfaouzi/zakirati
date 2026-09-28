import React from 'react';
import { Play, HelpCircle, Info, BookOpen, Brain, Sparkles, Smile } from 'lucide-react';

interface HomeScreenProps {
  onStartGame: () => void;
  onOpenHowToPlay: () => void;
  onOpenAbout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartGame,
  onOpenHowToPlay,
  onOpenAbout,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8 text-center">
      {/* Decorative friendly memory mascot card */}
      <div className="relative mb-6">
        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-linear-to-tr from-amber-400 via-amber-300 to-yellow-200 flex items-center justify-center shadow-lg shadow-amber-200/50 border-4 border-white rotate-1 hover:rotate-0 transition-transform">
          <Brain className="w-16 h-16 sm:w-20 sm:h-20 text-amber-900 drop-shadow-xs" />
        </div>
        <div className="absolute -top-2 -right-2 w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md animate-bounce">
          <Sparkles className="w-5 h-5 fill-yellow-200" />
        </div>
        <div className="absolute -bottom-2 -left-2 w-9 h-9 rounded-2xl bg-emerald-400 text-white flex items-center justify-center shadow-md">
          <Smile className="w-5 h-5 text-emerald-950" />
        </div>
      </div>

      {/* Main Title & Concept */}
      <h1 className="text-4xl sm:text-5xl font-black text-amber-950 mb-3 tracking-tight">
        ذاكرتي تحكي
      </h1>
      <p className="text-xl sm:text-2xl font-bold text-amber-800/90 mb-8 max-w-md">
        "احكِ قصتك... ثم أعدها من ذاكرتك!"
      </p>

      {/* Quick reassurance pill */}
      <div className="inline-flex items-center gap-2 bg-amber-100/70 text-amber-900 px-4 py-1.5 rounded-full text-sm font-semibold mb-8 border border-amber-200">
        <Sparkles className="w-4 h-4 text-amber-600" />
        <span>لعبة ذاكرة ممتعة وتشجيعية للأبطال الصغار</span>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-sm space-y-3.5">
        {/* Primary Large Button */}
        <button
          onClick={onStartGame}
          className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xl sm:text-2xl shadow-lg shadow-amber-400/40 hover:shadow-xl hover:shadow-amber-500/50 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          <Play className="w-7 h-7 fill-white" />
          <span>ابدأ اللعبة</span>
        </button>

        {/* Secondary Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onOpenHowToPlay}
            className="py-3 px-4 rounded-2xl bg-white hover:bg-amber-50/80 text-amber-900 font-bold text-base border-2 border-amber-200/80 shadow-xs hover:border-amber-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <HelpCircle className="w-5 h-5 text-amber-600" />
            <span>كيفية اللعب</span>
          </button>

          <button
            onClick={onOpenAbout}
            className="py-3 px-4 rounded-2xl bg-white hover:bg-amber-50/80 text-amber-900 font-bold text-base border-2 border-amber-200/80 shadow-xs hover:border-amber-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Info className="w-5 h-5 text-amber-600" />
            <span>عن التطبيق</span>
          </button>
        </div>
      </div>

      {/* Friendly attribution footer */}
      <div className="mt-12 text-xs font-semibold text-slate-400">
        تطوير: <span className="text-slate-600 font-bold">ل.فوزي</span>
      </div>
    </div>
  );
};
