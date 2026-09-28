import React from 'react';
import { ArrowRight, ShieldCheck, Heart, Sparkles, UserCheck } from 'lucide-react';

interface AboutScreenProps {
  onBack: () => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack }) => {
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-amber-900 font-bold text-sm bg-white px-3 py-2 rounded-xl border border-amber-200 hover:bg-amber-50 cursor-pointer transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرئيسية</span>
        </button>
        <h2 className="text-xl font-black text-amber-950">عن التطبيق</h2>
        <div className="w-16" />
      </div>

      <div className="bg-white rounded-3xl p-6 border-2 border-amber-100 shadow-xs space-y-6">
        {/* App Title & Badge */}
        <div className="text-center space-y-2 pb-4 border-b border-amber-100">
          <div className="inline-block p-3 rounded-2xl bg-amber-100 text-amber-900 mb-1">
            <Sparkles className="w-8 h-8 fill-amber-300" />
          </div>
          <h1 className="text-3xl font-black text-amber-950">ذاكرتي تحكي</h1>
          <p className="text-sm font-semibold text-amber-700">
            My Memory Tells
          </p>
          <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
            <UserCheck className="w-3.5 h-3.5" />
            <span>المطور: ل.فوزي</span>
          </div>
        </div>

        {/* Official Description */}
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 text-center">
          <p className="text-base font-bold text-amber-950 leading-relaxed">
            "لعبة تربوية تفاعلية تساعد الطفل على تدريب التذكر والتعبير الشفهي من خلال إعادة سرد القصص."
          </p>
        </div>

        {/* Guiding Principles */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-slate-800 text-base">مبادئ اللعبة:</h3>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Heart className="w-4 h-4 fill-emerald-200" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800">بيئة تشجيعية آمنة</h4>
              <p className="text-xs text-slate-600">
                الدرجة المعطاة هي درجة لعبة فقط، ولا يوجد خاسر أو فائز. التطبيق صديق للطفل ولا يوجه أي أحكام سلبية.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800">خصوصية تامة للطفل</h4>
              <p className="text-xs text-slate-600">
                لا نطلب إنشاء حساب أو تسجيل دخول، ولا يتم حفظ أي تسجيلات صوتية بشكل دائم على الجهاز أو مشاركتها.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800">تنويه تربوي</h4>
              <p className="text-xs text-slate-600">
                لا يقدم التطبيق أي تشخيص طبي، نفسي، أو تقييم ذكاء. الهدف تربوي وترفيهي لتحفيز الخيال والذاكرة.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onBack}
          className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-base transition-colors cursor-pointer shadow-md shadow-amber-400/20"
        >
          العودة
        </button>
      </div>
    </div>
  );
};
