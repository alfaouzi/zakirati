import React from 'react';
import { ArrowRight, Mic, Brain, Star, Play } from 'lucide-react';

interface HowToPlayScreenProps {
  onStartGame: () => void;
  onBack: () => void;
}

export const HowToPlayScreen: React.FC<HowToPlayScreenProps> = ({
  onStartGame,
  onBack,
}) => {
  const steps = [
    {
      step: '1',
      icon: <Mic className="w-8 h-8 text-amber-700" />,
      bg: 'bg-amber-100 border-amber-300',
      title: 'احكِ قصتك',
      desc: 'سجّل قصة أو موقفًا حدث معك بصوتك.',
      hint: 'مثل: ماذا فعلت اليوم، أو زيارة لحديقة، أو موقف ممتع مع أصدقائك.',
    },
    {
      step: '2',
      icon: <Brain className="w-8 h-8 text-purple-700" />,
      bg: 'bg-purple-100 border-purple-300',
      title: 'تذكّرها',
      desc: 'أعد حكاية القصة دون الرجوع إلى التسجيل الأول.',
      hint: 'اعتمد على ذاكرتك الجميلة لتتذكر أهم الأحداث والأشخاص.',
    },
    {
      step: '3',
      icon: <Star className="w-8 h-8 text-yellow-600 fill-yellow-400" />,
      bg: 'bg-yellow-100 border-yellow-300',
      title: 'اكتشف ما تذكرت',
      desc: 'ستقارن اللعبة بين القصتين وتخبرك بما تذكرته.',
      hint: 'ستحصل على نتيجة مبهجة ورسالة تشجيعية دافئة بصوت اللعبة.',
    },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-amber-900 font-bold text-sm bg-white px-3 py-2 rounded-xl border border-amber-200 hover:bg-amber-50 cursor-pointer transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرئيسية</span>
        </button>
        <h2 className="text-xl font-black text-amber-950">كيفية اللعب</h2>
        <div className="w-16" /> {/* spacer */}
      </div>

      {/* 3 Step Cards */}
      <div className="space-y-4 mb-8">
        {steps.map((item, idx) => (
          <div
            key={idx}
            className="bg-white rounded-3xl p-5 border-2 border-amber-100/90 shadow-xs flex items-start gap-4"
          >
            <div
              className={`w-14 h-14 rounded-2xl ${item.bg} border flex items-center justify-center shrink-0 shadow-xs`}
            >
              {item.icon}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  الخطوة {item.step}
                </span>
                <h3 className="text-lg font-black text-slate-800">
                  {item.title}
                </h3>
              </div>
              <p className="text-base font-bold text-slate-700 leading-snug">
                {item.desc}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {item.hint}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Primary Start Game Button */}
      <div className="space-y-3">
        <button
          onClick={onStartGame}
          className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xl shadow-lg shadow-amber-400/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          <Play className="w-6 h-6 fill-white" />
          <span>ابدأ اللعبة</span>
        </button>
      </div>
    </div>
  );
};
