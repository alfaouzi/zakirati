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
  Users,
  MapPin,
  ListOrdered,
  Sparkles,
  HelpCircle,
  Shuffle,
  ChevronDown,
  ChevronUp,
  GraduationCap,
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
  const [showParentReport, setShowParentReport] = useState(false);

  useEffect(() => {
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
  const isSufficient = result.overallScore > 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Child-Friendly Header */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 text-xs font-black px-3 py-1 rounded-full mb-2">
          <Trophy className="w-4 h-4 text-amber-700" />
          <span>نتيجة الجولة</span>
        </span>
        <h2 className="text-3xl font-black text-amber-950">
          {isSufficient ? 'أداء رائع لذاكرتك يا بطل! 🌟' : 'نتيجة فحص التسجيل'}
        </h2>
        {result.isFallback && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            <span>تحليل محلي بديل (بدون اتصال بالإنترنت)</span>
          </div>
        )}
      </div>

      {/* Joyful Star & Score Card for the Child */}
      <div className="bg-white rounded-3xl p-6 border-2 border-amber-100 shadow-sm text-center mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/50 rounded-full blur-2xl -mr-10 -mt-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-100/50 rounded-full blur-2xl -ml-10 -mb-10" />

        <div className="relative z-10">
          <div className="text-6xl sm:text-7xl font-black text-amber-900 tracking-tight mb-2">
            {result.overallScore}
            <span className="text-3xl font-bold text-amber-600">%</span>
          </div>

          <p className="text-sm font-extrabold text-amber-800 mb-3">
            مستوى التذكر
          </p>

          {/* Stars Representation */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-9 h-9 transition-transform ${
                  s <= stars && isSufficient
                    ? 'text-amber-400 fill-amber-400 drop-shadow-xs scale-110'
                    : 'text-slate-200 fill-slate-100'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Positive Highlights for the Child */}
      <div className="bg-white rounded-3xl p-5 border-2 border-amber-100 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-teal-700" />
          <h3 className="text-lg font-black text-slate-800">
            {isSufficient ? 'أشياء رائعة تذكرتها! 👏' : 'ملاحظات التسجيل'}
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

      {/* Encouragement Voice Card */}
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

      {/* Main Play Actions */}
      <div className="space-y-3 mb-8">
        <button
          onClick={onPlayAgain}
          className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xl shadow-lg shadow-amber-400/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-6 h-6" />
          <span>جولة جديدة 🎮</span>
        </button>

        <button
          onClick={onGoHome}
          className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-amber-50 text-amber-950 font-bold text-base border-2 border-amber-200 shadow-2xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-5 h-5 text-amber-700" />
          <span>العودة للرئيسية</span>
        </button>
      </div>

      {/* Parent / Educator Detailed Report (Collapsible Accordion) */}
      {isSufficient && (
        <div className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden mb-6">
          <button
            onClick={() => setShowParentReport(!showParentReport)}
            className="w-full p-4 flex items-center justify-between text-right cursor-pointer hover:bg-slate-100/80 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              <div>
                <h4 className="text-sm font-black text-slate-800">
                  تقرير تحليلي لولي الأمر والمعلم 👨‍👩‍👧
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  {showParentReport ? 'اضغط للإخفاء' : 'اضغط للاطلاع على التفاصيل الدلالية ومقارنة السرد'}
                </p>
              </div>
            </div>
            {showParentReport ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>

          {showParentReport && (
            <div className="p-4 pt-0 border-t border-slate-200/70 space-y-4">
              {/* Detailed Sub Scores */}
              <div className="grid grid-cols-3 gap-2 pt-3">
                <div className="bg-white rounded-2xl p-2.5 text-center border border-slate-200/60 shadow-2xs">
                  <span className="block text-[11px] font-bold text-slate-600 mb-1">
                    الأحداث الرئيسية
                  </span>
                  <span className="text-base font-black text-indigo-900">
                    {result.mainEventsScore}%
                  </span>
                </div>
                <div className="bg-white rounded-2xl p-2.5 text-center border border-slate-200/60 shadow-2xs">
                  <span className="block text-[11px] font-bold text-slate-600 mb-1">
                    ترتيب الأحداث
                  </span>
                  <span className="text-base font-black text-indigo-900">
                    {result.sequenceScore}%
                  </span>
                </div>
                <div className="bg-white rounded-2xl p-2.5 text-center border border-slate-200/60 shadow-2xs">
                  <span className="block text-[11px] font-bold text-slate-600 mb-1">
                    التفاصيل
                  </span>
                  <span className="text-base font-black text-indigo-900">
                    {result.detailsScore}%
                  </span>
                </div>
              </div>

              {/* Recalled with quotes */}
              {result.recalledDetails && result.recalledDetails.length > 0 && (
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/60 shadow-2xs">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black text-slate-800">
                      ما تذكره الطفل بالأمثلة:
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {result.recalledDetails.map((detail, idx) => (
                      <p key={idx} className="text-xs text-slate-700 font-medium">
                        • {detail}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Omitted or Changed */}
              {((result.omittedDetails && result.omittedDetails.length > 0) ||
                (result.changedDetails && result.changedDetails.length > 0)) && (
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/60 shadow-2xs">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Shuffle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-black text-slate-800">
                      أوجه الاختلاف والتبديل في السرد:
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {result.omittedDetails?.map((omitted, idx) => (
                      <p key={`omitted-${idx}`} className="text-xs text-amber-900 font-medium">
                        • غاب عن السرد: {omitted}
                      </p>
                    ))}
                    {result.changedDetails?.map((changed, idx) => (
                      <p key={`changed-${idx}`} className="text-xs text-blue-900 font-medium">
                        • أعاد صياغته: {changed}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Elements Analysis */}
              {(result.charactersAnalysis || result.placesAnalysis || result.sequenceAnalysis) && (
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/60 shadow-2xs space-y-2">
                  <span className="text-xs font-black text-slate-800 block mb-1">
                    تحليل عناصر القصة:
                  </span>
                  {result.charactersAnalysis && (
                    <p className="text-xs text-slate-700">
                      <strong className="text-indigo-900">الشخصيات:</strong> {result.charactersAnalysis}
                    </p>
                  )}
                  {result.placesAnalysis && (
                    <p className="text-xs text-slate-700">
                      <strong className="text-rose-900">الأماكن:</strong> {result.placesAnalysis}
                    </p>
                  )}
                  {result.sequenceAnalysis && (
                    <p className="text-xs text-slate-700">
                      <strong className="text-teal-900">تسلسل الأحداث:</strong> {result.sequenceAnalysis}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
