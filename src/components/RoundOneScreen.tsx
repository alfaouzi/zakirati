import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, ArrowLeft, AlertCircle, Lightbulb, CheckCircle2, Keyboard } from 'lucide-react';
import { speechToTextService } from '../services/speechService';
import { validateStoryContent } from '../services/contentValidator';
import { SoundWave } from './SoundWave';

interface RoundOneScreenProps {
  onStoryCompleted: (storyText: string) => void;
  onCancel: () => void;
}

export const RoundOneScreen: React.FC<RoundOneScreenProps> = ({
  onStoryCompleted,
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

  const samplePrompts = [
    'ماذا حدث اليوم؟',
    'ماذا فعلت في المدرسة؟',
    'أين ذهبت في العطلة؟',
  ];

  const sampleStories = [
    'اليوم ذهبت مع أبي وأمي إلى حديقة الحيوانات، ورأينا الأسد والفيل وأطعمنا الزرافة، ثم اشترينا مثلجات وركبنا القطار الصغير وعدنا سعداء.',
    'في المدرسة لعبت كرة القدم مع صديقي أحمد وسجلنا هدفًا جميلاً، ثم دخلنا الصف ودرسنا مادة العلوم وقرأنا قصة ممتعة.',
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
        // Recognition stopped
      },
    });
  };

  const handleStopRecording = async () => {
    stopRecordingCleanup();
    const finalTranscript = await speechToTextService.stopListening();
    const transcriptToUse = finalTranscript || recognizedTranscript;

    const validation = validateStoryContent(transcriptToUse);
    if (!validation.isValid) {
      setErrorMessage(validation.message);
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

  const handleProceed = () => {
    const textToSubmit = recognizedTranscript || manualText;
    const validation = validateStoryContent(textToSubmit);
    if (!validation.isValid) {
      setErrorMessage(validation.message);
      return;
    }
    onStoryCompleted(textToSubmit.trim());
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
        <span className="inline-block bg-amber-100 text-amber-900 text-xs font-black px-3 py-1 rounded-full mb-2">
          الجولة الأولى
        </span>
        <h2 className="text-3xl font-black text-amber-950 mb-2">احكِ قصتك</h2>
        <p className="text-base font-bold text-slate-700">
          احكِ عن موقف أو قصة حدثت معك.
        </p>
      </div>

      {/* Idea Prompts */}
      {!isRecording && !isRecorded && (
        <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200/70 mb-6">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-600" />
            <span>أفكار يمكنك الحديث عنها:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((p, i) => (
              <span
                key={i}
                className="bg-white text-amber-950 text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-200/90 shadow-2xs"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

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
              <span>تم تسجيل القصة بنجاح!</span>
            </div>
          ) : (
            <p className="text-slate-600 font-semibold text-sm">
              اضغط على الميكروفون وتحدث بصوت واضح
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
                  ? 'bg-amber-100 text-amber-900 border-4 border-amber-300 hover:bg-amber-200'
                  : 'bg-linear-to-tr from-amber-500 to-amber-600 text-white shadow-amber-400/40 hover:scale-105'
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

      {/* Primary Proceed Action */}
      {isRecorded && (
        <div className="space-y-3">
          <button
            onClick={handleProceed}
            className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-extrabold text-xl shadow-lg shadow-emerald-400/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>متابعة إلى الجولة الثانية</span>
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Alternative Input for Testing / Devices without Speech API */}
      <div className="mt-8 border-t border-amber-200/60 pt-4 text-center">
        <button
          onClick={() => setShowManualInput(!showManualInput)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800/80 hover:text-amber-950 cursor-pointer"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>{showManualInput ? 'إخفاء خيارات الاختبار' : 'تجربة سريعة بدون ميكروفون'}</span>
        </button>

        {showManualInput && (
          <div className="mt-3 p-4 bg-white rounded-2xl border border-amber-200 text-right space-y-3">
            <p className="text-xs text-slate-500 font-semibold">
              اختر قصة جاهزة لاختبار اللعبة مباشرة أو اكتب قصتك:
            </p>
            <div className="space-y-2">
              {sampleStories.map((story, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSample(story)}
                  className="w-full text-right p-2.5 bg-amber-50 hover:bg-amber-100/80 rounded-xl text-xs font-bold text-amber-950 border border-amber-200 transition-colors"
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
              placeholder="أو اكتب القصة هنا..."
              className="w-full h-20 p-2.5 border rounded-xl text-sm focus:outline-amber-500 font-medium"
            />
          </div>
        )}
      </div>
    </div>
  );
};
