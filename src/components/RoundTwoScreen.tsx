import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, AlertCircle, CheckCircle2, RotateCcw, Keyboard } from 'lucide-react';
import { speechToTextService } from '../services/speechService';
import { SoundWave } from './SoundWave';

interface RoundTwoScreenProps {
  onStoriesReadyForComparison: (secondStoryText: string) => void;
  onCancel: () => void;
}

export const RoundTwoScreen: React.FC<RoundTwoScreenProps> = ({
  onStoriesReadyForComparison,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isRecorded, setIsRecorded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recognizedTranscript, setRecognizedTranscript] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState('');

  const timerRef = useRef<any>(null);

  const sampleRetoldStories = [
    'رحت مع بابا وماما لحديقة الحيوان، وشاهدنا الفيل والأسد والزرافة وأكلناها، ثم أكلنا آيس كريم وركبنا القطار ورجعنا البيت مبسوطين.',
    'في المدرسة لعبت كورة مع صاحبي أحمد وسجلنا جول رائع، وبعدين دخلنا الفصل وأخذنا درس العلوم وقرأنا قصة حلوة.',
  ];

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      speechToTextService.cleanupTemporaryAudio();
    };
  }, []);

  const handleStartRecording = async () => {
    setErrorMessage(null);
    setRecognizedTranscript('');
    setElapsedSeconds(0);

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    setIsRecording(true);

    await speechToTextService.startListening({
      onStart: () => {
        setIsRecording(true);
      },
      onResult: (transcript) => {
        setRecognizedTranscript(transcript);
      },
      onError: (err) => {
        setErrorMessage(err);
        stopRecordingCleanup();
      },
      onEnd: () => {
        // Recognition completed
      },
    });
  };

  const handleStopRecording = async () => {
    stopRecordingCleanup();
    const finalTranscript = await speechToTextService.stopListening();
    const transcriptToUse = finalTranscript || recognizedTranscript;

    if (!transcriptToUse.trim()) {
      setErrorMessage('لم أستطع سماع القصة بوضوح. حاول مرة أخرى أو اكتبها بالأسفل.');
      setIsRecorded(false);
      return;
    }

    setRecognizedTranscript(transcriptToUse);
    setIsRecorded(true);
  };

  const stopRecordingCleanup = () => {
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleCompareStories = () => {
    const textToSubmit = recognizedTranscript || manualText;
    if (!textToSubmit.trim()) {
      setErrorMessage('يرجى تسجيل القصة من ذاكرتك أولاً.');
      return;
    }
    onStoriesReadyForComparison(textToSubmit.trim());
  };

  const handleSelectSample = (sample: string) => {
    setManualText(sample);
    setRecognizedTranscript(sample);
    setIsRecorded(true);
    setErrorMessage(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Step Header */}
      <div className="text-center mb-6">
        <span className="inline-block bg-purple-100 text-purple-900 text-xs font-black px-3 py-1 rounded-full mb-2">
          الجولة الثانية
        </span>
        <h2 className="text-3xl font-black text-amber-950 mb-2">
          والآن أعد حكاية نفس القصة من ذاكرتك
        </h2>
        <p className="text-base font-bold text-slate-700">
          حاول أن تتذكر أهم الأحداث والتفاصيل.
        </p>
      </div>

      {/* Memory Focus Reminder */}
      <div className="bg-teal-50 rounded-2xl p-4 border border-teal-200 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-200 text-teal-800 flex items-center justify-center shrink-0">
          <RotateCcw className="w-5 h-5" />
        </div>
        <p className="text-xs sm:text-sm font-bold text-teal-950 leading-relaxed">
          تحدي الذاكرة: لا ننظر إلى القصة الأولى، بل نعتمد على ما تتذكره من أحداث وشخصيات وأماكن!
        </p>
      </div>

      {/* Main Recording Card */}
      <div className="bg-white rounded-3xl p-6 border-2 border-amber-100 shadow-sm text-center mb-6">
        {/* Status Text */}
        <div className="mb-4 min-h-[32px] flex items-center justify-center">
          {isRecording ? (
            <div className="inline-flex items-center gap-2 text-rose-600 font-black text-lg animate-pulse">
              <span className="w-3 h-3 rounded-full bg-rose-600" />
              <span>جارٍ التسجيل... ({formatTime(elapsedSeconds)})</span>
            </div>
          ) : isRecorded ? (
            <div className="inline-flex items-center gap-2 text-emerald-700 font-black text-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>تم تسجيل القصة الثانية بنجاح!</span>
            </div>
          ) : (
            <p className="text-slate-600 font-semibold text-sm">
              اضغط على الميكروفون وأعد سرد القصة من ذاكرتك
            </p>
          )}
        </div>

        {/* Audio Wave Visualizer */}
        <SoundWave isRecording={isRecording} />

        {/* Large Mic Button */}
        <div className="flex justify-center my-4">
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              className={`w-28 h-28 rounded-full flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-lg active:scale-95 ${
                isRecorded
                  ? 'bg-purple-100 text-purple-900 border-4 border-purple-300 hover:bg-purple-200'
                  : 'bg-linear-to-tr from-purple-600 to-indigo-600 text-white shadow-purple-400/40 hover:scale-105'
              }`}
              title={isRecorded ? 'إعادة التسجيل' : 'ابدأ التسجيل'}
            >
              <Mic className="w-10 h-10" />
              <span className="text-xs font-black">
                {isRecorded ? 'إعادة التسجيل' : 'ابدأ التسجيل'}
              </span>
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="w-28 h-28 rounded-full bg-linear-to-tr from-rose-500 to-rose-600 text-white flex flex-col items-center justify-center gap-1 shadow-lg shadow-rose-400/40 hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse"
              title="إيقاف التسجيل"
            >
              <Square className="w-9 h-9 fill-white" />
              <span className="text-xs font-black">إيقاف التسجيل</span>
            </button>
          )}
        </div>

        {/* Friendly Error Banner */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold rounded-2xl p-3 mt-4 flex items-center gap-2 text-right">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Primary Compare Action Button */}
      {isRecorded && (
        <div className="space-y-3">
          <button
            onClick={handleCompareStories}
            className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-amber-950 font-black text-xl shadow-lg shadow-amber-400/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <CheckCircle2 className="w-6 h-6 text-amber-950" />
            <span>قارن القصتين</span>
          </button>
        </div>
      )}

      {/* Alternative Input for Testing */}
      <div className="mt-8 border-t border-amber-200/60 pt-4 text-center">
        <button
          onClick={() => setShowManualInput(!showManualInput)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-900/80 hover:text-purple-950 cursor-pointer"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>{showManualInput ? 'إخفاء خيارات الاختبار' : 'تجربة سريعة بدون ميكروفون'}</span>
        </button>

        {showManualInput && (
          <div className="mt-3 p-4 bg-white rounded-2xl border border-purple-200 text-right space-y-3">
            <p className="text-xs text-slate-500 font-semibold">
              اختر إعادة سرد تجريبية (تلاحظ اختلاف الكلمات واللهجة مع بقاء المعنى):
            </p>
            <div className="space-y-2">
              {sampleRetoldStories.map((story, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSample(story)}
                  className="w-full text-right p-2.5 bg-purple-50 hover:bg-purple-100/80 rounded-xl text-xs font-bold text-purple-950 border border-purple-200 transition-colors"
                >
                  " {story} "
                </button>
              ))}
            </div>
            <textarea
              dir="rtl"
              value={manualText}
              onChange={(e) => {
                setManualText(e.target.value);
                setRecognizedTranscript(e.target.value);
                setIsRecorded(Boolean(e.target.value.trim()));
              }}
              placeholder="أو اكتب ما تذكرته من القصة هنا..."
              className="w-full h-20 p-2.5 border rounded-xl text-sm focus:outline-purple-500 font-medium"
            />
          </div>
        )}
      </div>
    </div>
  );
};
