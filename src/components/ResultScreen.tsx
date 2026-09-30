import React, { useState, useEffect } from 'react';
import {
  Star,
  CheckCircle2,
  Volume2,
  VolumeX,
  RotateCcw,
  Home,
  Trophy,
  Heart,
} from 'lucide-react';
import { StoryAnalysisResult } from '../types/game';
import { textToSpeechService } from '../services/ttsService';

interface ResultScreenProps {
  result: StoryAnalysisResult;
  onPlayAgain: () => void;
  onGoHome: () => void;
  soundEnabled: boolean;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  result,
  onPlayAgain,
  onGoHome,
  soundEnabled,
}) => {
  const [isPlayingTts, setIsPlayingTts] = useState(false);

  useEffect(() => {
    // Optionally auto-speak the encouraging message if sound is enabled
    if (soundEnabled && result.encouragementMessage) {
      handleSpeakMessage();
    }
    return () => {
      textToSpeechService.stop();
    };
  }, []);

  const handleSpeakMessage = () => {
    if (isPlayingTts) {
      textToSpeechService.stop();
      setIsPlayingTts(false);
      return;
    }

    textToSpeechService.speak(
      result.encouragementMessage,
      () => setIsPlayingTts(true),
      () => setIsPlayingTts(false),
      () => setIsPlayingTts(false)
    );
  };

  // Convert score to 1-5 stars for children
  const getStarCount = (score: number) => {
    if (score >= 90) return 5;
    if (score >= 78) return 4;
    if (score >= 65) return 3;
    if (score >= 50) return 2;
    return 1;
  };

  const stars = getStarCount(result.overallScore);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Title */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 text-xs font-black px-3 py-1 rounded-full mb-2">
          <Trophy className="w-4 h-4 text-amber-700" />
          <span>نتيجة الجولة</span>
        </span>
        <h2 className="text-3xl font-black text-amber-950">أداء رائع لذاكرتك!</h2>
        {result.isFallback && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            <span>تحليل محلي بديل (بدون اتصال بالإنترنت)</span>
          </div>
        )}
      </div>

      {/* Main Score Card */}
      <div className="bg-white rounded-3xl p-6 border-2 border-amber-100 shadow-sm text-center mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/50 rounded-full blur-2xl -mr-10 -mt-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-100/50 rounded-full blur-2xl -ml-10 -mb-10" />

        <div className="relative z-10">
          {/* Prominent Score Number */}
          <div className="text-6xl sm:text-7xl font-black text-amber-900 tracking-tight mb-2">
            {result.overallScore}
            <span className="text-3xl font-bold text-amber-600">%</span>
          </div>

          <p className="text-sm font-extrabold text-amber-800 mb-3">
            مستوى التذكر
          </p>

          {/* Stars Representation */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-8 h-8 transition-transform ${
                  s <= stars
                    ? 'text-amber-400 fill-amber-400 drop-shadow-xs scale-110'
                    : 'text-slate-200 fill-slate-100'
                }`}
              />
            ))}
          </div>

          {/* Sub Scores Grid */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-amber-100">
            <div className="bg-amber-50/80 rounded-2xl p-2.5">
              <span className="block text-[11px] font-bold text-amber-900 mb-1">
                الأحداث الرئيسية
              </span>
              <span className="text-lg font-black text-amber-950">
                {result.mainEventsScore}%
              </span>
            </div>

            <div className="bg-amber-50/80 rounded-2xl p-2.5">
              <span className="block text-[11px] font-bold text-amber-900 mb-1">
                ترتيب الأحداث
              </span>
              <span className="text-lg font-black text-amber-950">
                {result.sequenceScore}%
              </span>
            </div>

            <div className="bg-amber-50/80 rounded-2xl p-2.5">
              <span className="block text-[11px] font-bold text-amber-900 mb-1">
                تفاصيل القصة
              </span>
              <span className="text-lg font-black text-amber-950">
                {result.detailsScore}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Strengths Card ("ما الذي تذكرته جيدًا؟") */}
      <div className="bg-white rounded-3xl p-5 border-2 border-amber-100 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-teal-700" />
          <h3 className="text-lg font-black text-slate-800">
            ما الذي تذكرته جيدًا؟
          </h3>
        </div>

        <div className="space-y-2.5">
          {result.strengths.map((strength, index) => (
            <div
              key={index}
              className="flex items-center gap-2.5 bg-emerald-50/80 text-emerald-950 px-3.5 py-2.5 rounded-2xl border border-emerald-200/80 text-sm font-bold"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{strength}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Encouragement Message ("رسالة ذاكرتك") */}
      <div className="bg-linear-to-tr from-amber-50 to-orange-50 rounded-3xl p-5 border-2 border-amber-200 shadow-xs mb-6 text-center">
        <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-800 mb-2">
          <Heart className="w-4 h-4 fill-rose-400 text-rose-500" />
          <span>رسالة ذاكرتك</span>
        </div>

        <p className="text-lg font-extrabold text-amber-950 mb-4 leading-relaxed">
          "{result.encouragementMessage}"
        </p>

        {/* Listen Button */}
        <button
          onClick={handleSpeakMessage}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-base shadow-sm transition-all cursor-pointer ${
            isPlayingTts
              ? 'bg-amber-600 text-white animate-pulse'
              : 'bg-white hover:bg-amber-100/70 text-amber-900 border-2 border-amber-300'
          }`}
        >
          {isPlayingTts ? (
            <>
              <VolumeX className="w-5 h-5" />
              <span>جارٍ قراءة الرسالة... (إيقاف)</span>
            </>
          ) : (
            <>
              <Volume2 className="w-5 h-5 text-amber-700" />
              <span>اسمع الرسالة</span>
            </>
          )}
        </button>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Play Again */}
        <button
          onClick={onPlayAgain}
          className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xl shadow-lg shadow-amber-400/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-6 h-6" />
          <span>جولة جديدة</span>
        </button>

        {/* Back Home */}
        <button
          onClick={onGoHome}
          className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-amber-50 text-amber-950 font-bold text-base border-2 border-amber-200 shadow-2xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-5 h-5 text-amber-700" />
          <span>العودة للرئيسية</span>
        </button>
      </div>
    </div>
  );
};
