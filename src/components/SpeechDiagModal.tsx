import React, { useState, useEffect, useRef } from 'react';
import {
  getSpeechDiagLogs,
  clearSpeechDiagLogs,
  subscribeSpeechDiag,
  SpeechDiagEntry,
} from '../services/speechDiagnostics';
import { Copy, Check, Trash2, X, Terminal, ArrowDown } from 'lucide-react';

interface SpeechDiagModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpeechDiagModal: React.FC<SpeechDiagModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<SpeechDiagEntry[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load initial logs
    setLogs(getSpeechDiagLogs());

    // Subscribe to new logs as speech recognition events occur
    const unsubscribe = subscribeSpeechDiag(() => {
      setLogs(getSpeechDiagLogs());
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  // Auto-scroll to bottom on new logs if near bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs.length]);

  if (!isOpen) return null;

  const handleCopyLogs = async () => {
    const formattedText = logs
      .map((entry) => `[${entry.timestamp}] ${entry.message}`)
      .join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formattedText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = formattedText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy logs:', err);
    }
  };

  const handleClearLogs = () => {
    clearSpeechDiagLogs();
    setLogs([]);
  };

  const scrollToBottom = () => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-right max-h-[92vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-100">
                سجل التشخيص
              </h2>
              <span className="text-[11px] font-semibold text-slate-400">
                {logs.length} سجل مسجل
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Copy Button */}
            <button
              onClick={handleCopyLogs}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs'
              }`}
              title="نسخ السجل"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ السجل</span>
                </>
              )}
            </button>

            {/* Clear Button */}
            <button
              onClick={handleClearLogs}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1 border border-slate-700 cursor-pointer"
              title="مسح السجل"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>مسح السجل</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer mr-1"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diagnostic Logs Body */}
        <div
          ref={logContainerRef}
          className="flex-1 p-3 overflow-y-auto font-mono text-[11px] sm:text-xs text-slate-200 bg-slate-950/95 space-y-1 select-text scroll-smooth"
          dir="ltr"
        >
          {logs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-sans" dir="rtl">
              <p className="text-sm font-bold">لا توجد سجلات مسجلة بعد.</p>
              <p className="text-xs text-slate-600 mt-1">
                اضغط على "إبدأ التسجيل" في اللعبة ثم تكلّم وسيتم تسجيل جميع الأحداث هنا تلقائيًا.
              </p>
            </div>
          ) : (
            logs.map((entry) => (
              <div
                key={entry.id}
                className={`py-1 px-1.5 rounded-md border-b border-slate-900/60 break-words leading-relaxed ${
                  entry.type === 'error'
                    ? 'text-rose-300 bg-rose-950/20'
                    : entry.type === 'warn'
                    ? 'text-amber-300 bg-amber-950/20'
                    : 'text-slate-300'
                }`}
              >
                <span className="text-cyan-400 font-semibold select-none mr-1.5">
                  [{entry.timestamp}]
                </span>
                <span>{entry.message}</span>
              </div>
            ))
          )}
        </div>

        {/* Footer controls */}
        <div className="p-2 sm:p-2.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-[11px] text-slate-400">
          <button
            onClick={scrollToBottom}
            className="flex items-center gap-1 text-slate-400 hover:text-amber-400 px-2 py-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>تمرير لأسفل</span>
          </button>
          <span className="text-[10px] text-slate-500">
            سجل تشخيص مؤقت لفحص المتصفح على الهاتف
          </span>
        </div>
      </div>
    </div>
  );
};
