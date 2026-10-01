/**
 * Speech-To-Text Service Abstraction
 * Handles continuous speech recognition in Arabic with graceful error handling and privacy-preserving audio cleanup.
 * Keeps recording active across natural pauses/silences until user explicitly presses Stop.
 */

export interface SpeechToTextCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (errorMessage: string) => void;
  onEnd?: () => void;
}

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export class SpeechToTextService {
  private recognition: any = null;
  private isSupported: boolean = false;
  private implementationName: string = 'none';
  private isCurrentlyListening: boolean = false;
  private isRecognitionActive: boolean = false;
  private currentTranscript: string = '';
  private lastInterimTranscript: string = '';
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private currentSessionId: number = 0;
  private stopPromise: Promise<string> | null = null;
  private pendingStopResolver: (() => void) | null = null;
  private stopTimeoutId: any = null;

  constructor() {
    const win = typeof window !== 'undefined' ? (window as IWindow) : null;
    if (win) {
      if (win.SpeechRecognition) {
        this.implementationName = 'SpeechRecognition';
      } else if (win.webkitSpeechRecognition) {
        this.implementationName = 'webkitSpeechRecognition';
      }

      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        this.isSupported = true;
        try {
          this.recognition = new SpeechRecognitionClass();
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.lang = 'ar-SA';
        } catch (e) {
          console.warn('[SpeechDiag] SpeechRecognition initialization error:', e);
          this.isSupported = false;
        }
      }
    }
    console.log(`[SpeechDiag] SpeechToTextService initialized. Supported: ${this.isSupported}, Implementation: ${this.implementationName}`);
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }

  public isListening(): boolean {
    return this.isCurrentlyListening;
  }

  public async startListening(callbacks: SpeechToTextCallbacks): Promise<void> {
    console.log('[SpeechDiag] startListening() called.');

    if (this.stopPromise) {
      try {
        await this.stopPromise;
      } catch (e) {
        console.warn('[SpeechDiag] Error waiting for previous stop operation:', e);
      }
    }

    if (this.isRecognitionActive) {
      try {
        await this.stopListening();
      } catch (e) {
        console.warn('[SpeechDiag] Error stopping active recognition before start:', e);
      }
    }

    const sessionId = ++this.currentSessionId;
    this.isCurrentlyListening = true;
    this.currentTranscript = '';
    this.lastInterimTranscript = '';
    this.audioChunks = [];

    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
        this.mediaRecorder.stream?.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.warn('[SpeechDiag] Error cleaning up prior MediaRecorder tracks:', err);
      }
      this.mediaRecorder = null;
    }

    if (!this.isSupported || !this.recognition) {
      console.warn('[SpeechDiag] SpeechRecognition is NOT supported or null in this environment.');
      this.isCurrentlyListening = true;
      callbacks.onStart?.();
      return;
    }

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'ar-SA';

    this.recognition.onstart = () => {
      console.log(`[SpeechDiag] recognition.onstart fired for session ${sessionId}.`);
      if (this.currentSessionId !== sessionId) return;
      this.isRecognitionActive = true;
      callbacks.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      if (this.currentSessionId !== sessionId) return;

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const resultItem = event.results[i];
        const isFinal = Boolean(resultItem?.isFinal);
        const transcriptPart = resultItem?.[0]?.transcript || '';

        if (isFinal) {
          finalTranscript += transcriptPart + ' ';
        } else {
          interimTranscript += transcriptPart;
        }
      }

      if (finalTranscript) {
        const cleaned = finalTranscript.trim();
        // Prevent duplicate appending if the segment was already added
        if (!this.currentTranscript.endsWith(cleaned)) {
          this.currentTranscript = (this.currentTranscript + ' ' + cleaned).trim();
        }
      }

      this.lastInterimTranscript = interimTranscript.trim();
      const displayTranscript = (this.currentTranscript + ' ' + interimTranscript).trim();
      callbacks.onResult?.(displayTranscript, Boolean(finalTranscript));
    };

    this.recognition.onerror = (event: any) => {
      if (this.currentSessionId !== sessionId) return;
      console.warn(`[SpeechDiag] recognition.onerror fired. error="${event.error}"`);

      // Normal silence timeout or user abort: do NOT terminate user session
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      let friendlyMessage = 'لم أستطع سماع القصة بوضوح. حاول مرة أخرى.';

      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        friendlyMessage = 'يحتاج التطبيق إلى استخدام الميكروفون حتى تتمكن من تسجيل قصتك.';
        this.isCurrentlyListening = false;
        callbacks.onError?.(friendlyMessage);
      } else if (event.error === 'network') {
        // Transient network issue: do not drop current transcript
      }
    };

    this.recognition.onend = () => {
      console.log(`[SpeechDiag] recognition.onend fired for session ${sessionId}.`);
      this.isRecognitionActive = false;

      if (this.currentSessionId !== sessionId) return;

      // If user requested stop, finalize and resolve
      if (this.pendingStopResolver || !this.isCurrentlyListening) {
        this.isCurrentlyListening = false;
        callbacks.onEnd?.();
        if (this.pendingStopResolver) {
          this.pendingStopResolver();
        }
        return;
      }

      // If user has NOT pressed stop, this onend was caused by silence or browser utterance chunking.
      // Automatically restart recognition to guarantee continuous recording!
      if (this.isCurrentlyListening) {
        try {
          this.isRecognitionActive = true;
          this.recognition.start();
          console.log('[SpeechDiag] Automatically restarted recognition after silence.');
        } catch (e) {
          setTimeout(() => {
            if (this.isCurrentlyListening && !this.pendingStopResolver) {
              try {
                this.isRecognitionActive = true;
                this.recognition.start();
              } catch (_) {}
            }
          }, 150);
        }
      }
    };

    try {
      this.isRecognitionActive = true;
      this.recognition.start();
    } catch (err: any) {
      console.warn('[SpeechDiag] recognition.start() exception:', err);
      this.isCurrentlyListening = true;
      callbacks.onStart?.();
    }
  }

  public stopListening(): Promise<string> {
    console.log(`[SpeechDiag] stopListening() called.`);

    if (this.stopPromise) {
      return this.stopPromise;
    }

    this.isCurrentlyListening = false;

    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
        this.mediaRecorder.stream?.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn('[SpeechDiag] MediaRecorder stop error:', e);
      }
      this.mediaRecorder = null;
    }

    if (!this.isSupported || !this.recognition || !this.isRecognitionActive) {
      this.isRecognitionActive = false;
      const result = (this.currentTranscript || this.lastInterimTranscript).trim();
      this.cleanupTemporaryAudio();
      return Promise.resolve(result);
    }

    this.stopPromise = new Promise<string>((resolve) => {
      let resolved = false;

      const finish = () => {
        if (resolved) return;
        resolved = true;

        if (this.stopTimeoutId) {
          clearTimeout(this.stopTimeoutId);
          this.stopTimeoutId = null;
        }

        this.pendingStopResolver = null;
        this.stopPromise = null;
        this.isCurrentlyListening = false;
        this.isRecognitionActive = false;

        const result = (this.currentTranscript || this.lastInterimTranscript).trim();
        this.cleanupTemporaryAudio();
        resolve(result);
      };

      this.pendingStopResolver = () => finish();

      this.stopTimeoutId = setTimeout(() => {
        finish();
      }, 1500);

      try {
        this.recognition.stop();
      } catch (e) {
        finish();
      }
    });

    return this.stopPromise;
  }

  public cleanupTemporaryAudio(): void {
    this.audioChunks = [];
    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
        this.mediaRecorder.stream?.getTracks().forEach((track) => track.stop());
      } catch (e) {}
    }
    this.mediaRecorder = null;
  }
}

export const speechToTextService = new SpeechToTextService();
