/**
 * Temporary speech recognition diagnostics capture store.
 * Captures [SpeechDiag] messages in chronological order for in-app mobile inspection.
 */

export interface SpeechDiagEntry {
  id: number;
  timestamp: string;
  type: 'log' | 'warn' | 'error';
  message: string;
}

let nextId = 1;
const logs: SpeechDiagEntry[] = [];
const subscribers = new Set<() => void>();

export function recordSpeechDiag(type: 'log' | 'warn' | 'error', message: string): void {
  const now = new Date();
  const timeStr =
    now.toTimeString().split(' ')[0] +
    '.' +
    String(now.getMilliseconds()).padStart(3, '0');

  logs.push({
    id: nextId++,
    timestamp: timeStr,
    type,
    message,
  });

  // Keep last 300 entries to prevent memory growth
  if (logs.length > 300) {
    logs.shift();
  }

  subscribers.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error('Diag subscriber error:', e);
    }
  });
}

export function getSpeechDiagLogs(): SpeechDiagEntry[] {
  return [...logs];
}

export function clearSpeechDiagLogs(): void {
  logs.length = 0;
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error('Diag subscriber error:', e);
    }
  });
}

export function subscribeSpeechDiag(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

// Global console hook to capture any [SpeechDiag] messages automatically
if (typeof window !== 'undefined' && !(window as any).__speechDiagHooked) {
  (window as any).__speechDiagHooked = true;

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args: any[]) => {
    originalLog.apply(console, args);
    try {
      const first = typeof args[0] === 'string' ? args[0] : '';
      if (first.startsWith('[SpeechDiag]')) {
        const fullMsg = args
          .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
          .join(' ');
        recordSpeechDiag('log', fullMsg);
      }
    } catch {
      // Ignore formatting edge cases
    }
  };

  console.warn = (...args: any[]) => {
    originalWarn.apply(console, args);
    try {
      const first = typeof args[0] === 'string' ? args[0] : '';
      if (first.startsWith('[SpeechDiag]')) {
        const fullMsg = args
          .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
          .join(' ');
        recordSpeechDiag('warn', fullMsg);
      }
    } catch {
      // Ignore formatting edge cases
    }
  };

  console.error = (...args: any[]) => {
    originalError.apply(console, args);
    try {
      const first = typeof args[0] === 'string' ? args[0] : '';
      if (first.startsWith('[SpeechDiag]')) {
        const fullMsg = args
          .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
          .join(' ');
        recordSpeechDiag('error', fullMsg);
      }
    } catch {
      // Ignore formatting edge cases
    }
  };
}
