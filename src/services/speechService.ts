/**
 * Speech-To-Text Service Abstraction
 * Handles speech recognition in Arabic with graceful error handling and privacy-preserving audio cleanup.
 */

export interface SpeechToTextCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (errorMessage: string) => void;
  onEnd?: () => void;
}

// Window interface augmentation for browser speech recognition
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export class SpeechToTextService {
  private recognition: any = null;
  private isSupported: boolean = false;
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
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        this.isSupported = true;
        try {
          this.recognition = new SpeechRecognitionClass();
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.lang = 'ar-SA'; // Default to Arabic
        } catch (e) {
          console.warn('SpeechRecognition initialization error:', e);
          this.isSupported = false;
        }
      }
    }
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }

  public isListening(): boolean {
    return this.isCurrentlyListening;
  }

  public async startListening(callbacks: SpeechToTextCallbacks): Promise<void> {
    // If a previous stop operation is still finishing its lifecycle, wait for it
    if (this.stopPromise) {
      try {
        await this.stopPromise;
      } catch (e) {
        console.warn('Error waiting for previous stop operation:', e);
      }
    }

    // Ensure any previously active recognition instance is stopped before starting a new one
    if (this.isRecognitionActive) {
      try {
        await this.stopListening();
      } catch (e) {
        console.warn('Error stopping active recognition before start:', e);
      }
    }

    // Advance session ID to invalidate any stale events from past sessions
    const sessionId = ++this.currentSessionId;

    this.currentTranscript = '';
    this.lastInterimTranscript = '';
    this.audioChunks = [];

    // Optional audio capture for recording duration & privacy-compliant cleanup
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };
        this.mediaRecorder.start(250);
      } catch (err: any) {
        console.warn('MediaRecorder error or mic denied:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          callbacks.onError?.('يحتاج التطبيق إلى استخدام الميكروفون حتى تتمكن من تسجيل قصتك.');
          return;
        }
      }
    }

    if (!this.isSupported || !this.recognition) {
      this.isCurrentlyListening = true;
      callbacks.onStart?.();
      return;
    }

    // Ensure recognition settings are maintained
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'ar-SA';

    this.recognition.onstart = () => {
      if (this.currentSessionId !== sessionId) return;
      this.isCurrentlyListening = true;
      this.isRecognitionActive = true;
      callbacks.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      if (this.currentSessionId !== sessionId) return;

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart + ' ';
        } else {
          interimTranscript += transcriptPart;
        }
      }

      if (finalTranscript) {
        this.currentTranscript = (this.currentTranscript + ' ' + finalTranscript).trim();
      }

      this.lastInterimTranscript = interimTranscript.trim();
      const displayTranscript = (this.currentTranscript + ' ' + interimTranscript).trim();
      callbacks.onResult?.(displayTranscript, Boolean(finalTranscript));
    };

    this.recognition.onerror = (event: any) => {
      if (this.currentSessionId !== sessionId) return;
      console.warn('Speech recognition event error:', event.error);

      // Aborted by stop() or intentional cancel
      if (event.error === 'aborted') {
        return;
      }

      let friendlyMessage = 'لم أستطع سماع القصة بوضوح. حاول مرة أخرى.';

      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        friendlyMessage = 'يحتاج التطبيق إلى استخدام الميكروفون حتى تتمكن من تسجيل قصتك.';
      } else if (event.error === 'network') {
        friendlyMessage = 'تعذر الاتصال بخدمة التعرف على الصوت. تحقق من اتصال الإنترنت وحاول مرة أخرى.';
      } else if (event.error === 'no-speech') {
        friendlyMessage = 'لم أسمع أي كلام. اضغط على الميكروفون وابدأ بسرد القصة!';
      }

      callbacks.onError?.(friendlyMessage);
    };

    this.recognition.onend = () => {
      this.isRecognitionActive = false;
      if (this.currentSessionId !== sessionId) return;
      this.isCurrentlyListening = false;
      callbacks.onEnd?.();

      // Trigger resolution for stopListening if pending
      if (this.pendingStopResolver) {
        this.pendingStopResolver();
      }
    };

    try {
      this.isRecognitionActive = true;
      this.recognition.start();
    } catch (err: any) {
      console.warn('Recognition start exception:', err);
      // Already running or failed to initialize
      this.isCurrentlyListening = true;
      callbacks.onStart?.();
    }
  }

  public stopListening(): Promise<string> {
    // If a stop operation is already ongoing, reuse its promise
    if (this.stopPromise) {
      return this.stopPromise;
    }

    this.isCurrentlyListening = false;

    // Immediately stop microphone stream tracks & MediaRecorder
    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
        this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn('MediaRecorder stop error:', e);
      }
    }

    // If speech recognition is not supported or not active, resolve immediately
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

      this.pendingStopResolver = finish;

      // Safe fallback timeout (2.5 seconds) so Promise can never remain pending indefinitely
      this.stopTimeoutId = setTimeout(() => {
        console.warn('SpeechRecognition stop lifecycle fallback timeout reached');
        finish();
      }, 2500);

      try {
        // Calling stop() allows speech recognition to flush remaining buffered audio and fire final onresult then onend
        this.recognition.stop();
      } catch (e) {
        console.warn('Recognition stop error:', e);
        finish();
      }
    });

    return this.stopPromise;
  }

  /**
   * Deletes temporary audio data from memory to honor the privacy requirement.
   */
  public cleanupTemporaryAudio(): void {
    this.audioChunks = [];
    this.mediaRecorder = null;
  }
}

export const speechToTextService = new SpeechToTextService();
