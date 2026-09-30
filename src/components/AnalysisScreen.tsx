import React, { useState, useEffect } from 'react';
import { AppSymbol } from './AppLogo';

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
      {/* Official App Symbol with Harmonic Pulse */}
      <div className="mb-8">
        <div className="w-32 h-32 rounded-3xl bg-linear-to-tr from-teal-600 via-teal-700 to-emerald-800 flex items-center justify-center shadow-xl shadow-teal-200 border-4 border-white animate-pulse p-4">
          <AppSymbol size={80} className="w-20 h-20 drop-shadow-sm" />
        </div>
      </div>

      {/* Main Title */}
      <h2 className="text-3xl font-black text-amber-950 mb-4 tracking-tight">
        صدى حكايتي يراجع القصتين...
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
