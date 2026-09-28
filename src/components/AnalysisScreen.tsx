import React, { useState, useEffect } from 'react';
import { Brain, Sparkles, Star } from 'lucide-react';

export const AnalysisScreen: React.FC = () => {
  const messages = [
    'أراجع أحداث القصة...',
    'أقارن التفاصيل...',
    'أبحث عما تذكرته...',
    'لحظة واحدة...',
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] px-4 py-8 text-center">
      {/* Friendly Animated Brain / Star Mascot */}
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-3xl bg-linear-to-tr from-amber-400 via-amber-300 to-yellow-200 flex items-center justify-center shadow-xl shadow-amber-200 border-4 border-white animate-pulse">
          <Brain className="w-18 h-18 text-amber-900" />
        </div>
        <div className="absolute -top-3 -right-3 w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md animate-spin duration-3000">
          <Sparkles className="w-6 h-6 fill-yellow-200" />
        </div>
        <div className="absolute -bottom-2 -left-2 w-9 h-9 rounded-2xl bg-yellow-400 text-amber-950 flex items-center justify-center shadow-md animate-bounce">
          <Star className="w-5 h-5 fill-amber-950" />
        </div>
      </div>

      {/* Main Title */}
      <h2 className="text-3xl font-black text-amber-950 mb-4 tracking-tight">
        ذاكرتي تحكي تفكر...
      </h2>

      {/* Rotating Friendly Message */}
      <div className="h-10 flex items-center justify-center">
        <p className="text-lg font-bold text-amber-800 animate-fade-in transition-all">
          {messages[currentMessageIndex]}
        </p>
      </div>

      {/* Friendly Dots indicator */}
      <div className="flex gap-2 mt-6">
        {[0, 1, 2, 3].map((idx) => (
          <span
            key={idx}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              idx === currentMessageIndex
                ? 'bg-amber-500 scale-125'
                : 'bg-amber-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
