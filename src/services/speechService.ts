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
          this.recognition.lang = 'ar-SA'; // Default to Arabic
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
    console.log(`[SpeechDiag] Config: isSupported=${this.isSupported}, implementation=${this.implementationName}`);
    console.log(`[SpeechDiag] Config: lang=${this.recognition?.lang}, continuous=${this.recognition?.continuous}, interimResults=${this.recognition?.interimResults}`);

    // If a previous stop operation is still finishing its lifecycle, wait for it
    if (this.stopPromise) {
      console.log('[SpeechDiag] Previous stopPromise is still pending. Awaiting completion before start...');
      try {
        await this.stopPromise;
      } catch (e) {
        console.warn('[SpeechDiag] Error waiting for previous stop operation:', e);
      }
    }

    // Ensure any previously active recognition instance is stopped before starting a new one
    if (this.isRecognitionActive) {
      console.log('[SpeechDiag] Recognition is still active from prior run. Stopping active recognition...');
      try {
        await this.stopListening();
      } catch (e) {
        console.warn('[SpeechDiag] Error stopping active recognition before start:', e);
      }
    }

    // Advance session ID to invalidate any stale events from past sessions
    const sessionId = ++this.currentSessionId;
    console.log(`[SpeechDiag] Session ${sessionId} started.`);

    this.currentTranscript = '';
    this.lastInterimTranscript = '';
    this.audioChunks = [];

    // Optional audio capture for recording duration & privacy-compliant cleanup
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        console.log('[SpeechDiag] Requesting getUserMedia mic access for session...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[SpeechDiag] getUserMedia mic access granted.');
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };
        this.mediaRecorder.start(250);
      } catch (err: any) {
        console.warn('[SpeechDiag] MediaRecorder error or mic denied:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          callbacks.onError?.('يحتاج التطبيق إلى استخدام الميكروفون حتى تتمكن من تسجيل قصتك.');
          return;
        }
      }
    }

    if (!this.isSupported || !this.recognition) {
      console.warn('[SpeechDiag] SpeechRecognition is NOT supported or null in this environment.');
      this.isCurrentlyListening = true;
      callbacks.onStart?.();
      return;
    }

    // Ensure recognition settings are maintained
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'ar-SA';

    this.recognition.onstart = () => {
      console.log(`[SpeechDiag] recognition.onstart fired for session ${sessionId}.`);
      if (this.currentSessionId !== sessionId) {
        console.warn(`[SpeechDiag] Ignoring onstart from stale session ${sessionId} (current: ${this.currentSessionId}).`);
        return;
      }
      this.isCurrentlyListening = true;
      this.isRecognitionActive = true;
      callbacks.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      if (this.currentSessionId !== sessionId) {
        console.warn(`[SpeechDiag] Ignoring onresult from stale session ${sessionId} (current: ${this.currentSessionId}).`);
        return;
      }

      console.log(`[SpeechDiag] recognition.onresult fired for session ${sessionId}. resultIndex=${event.resultIndex}, totalResults=${event.results.length}`);

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const resultItem = event.results[i];
        const isFinal = Boolean(resultItem?.isFinal);
        const transcriptPart = resultItem?.[0]?.transcript || '';
        const confidence = resultItem?.[0]?.confidence;
        console.log(`[SpeechDiag] result[${i}]: isFinal=${isFinal}, confidence=${confidence}, text="${transcriptPart}"`);

        if (isFinal) {
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
      console.log(`[SpeechDiag] Accumulated currentTranscript="${this.currentTranscript}", interim="${this.lastInterimTranscript}", display="${displayTranscript}"`);
      callbacks.onResult?.(displayTranscript, Boolean(finalTranscript));
    };

    this.recognition.onerror = (event: any) => {
      if (this.currentSessionId !== sessionId) {
        console.warn(`[SpeechDiag] Ignoring onerror from stale session ${sessionId}.`);
        return;
      }
      console.warn(`[SpeechDiag] recognition.onerror fired. error="${event.error}", message="${event.message || ''}"`);

      // Aborted by stop() or intentional cancel
      if (event.error === 'aborted') {
        console.log('[SpeechDiag] Recognition aborted intentionally.');
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
      console.log(`[SpeechDiag] recognition.onend fired for session ${sessionId}.`);
      this.isRecognitionActive = false;
      if (this.currentSessionId !== sessionId) {
        console.warn(`[SpeechDiag] Ignoring onend from stale session ${sessionId} (current: ${this.currentSessionId}).`);
        return;
      }
      this.isCurrentlyListening = false;
      callbacks.onEnd?.();

      // Trigger resolution for stopListening if pending
      if (this.pendingStopResolver) {
        console.log('[SpeechDiag] Invoking pendingStopResolver from onend.');
        this.pendingStopResolver();
      }
    };

    try {
      console.log(`[SpeechDiag] Calling recognition.start() for session ${sessionId}...`);
      this.isRecognitionActive = true;
      this.recognition.start();
      console.log('[SpeechDiag] recognition.start() completed without throwing.');
    } catch (err: any) {
      console.warn('[SpeechDiag] recognition.start() exception:', err);
      // Already running or failed to initialize
      this.isCurrentlyListening = true;
      callbacks.onStart?.();
    }
  }

  public stopListening(): Promise<string> {
    console.log(`[SpeechDiag] stopListening() called. isCurrentlyListening=${this.isCurrentlyListening}, isRecognitionActive=${this.isRecognitionActive}`);
    console.log(`[SpeechDiag] Transcript immediately before stopping: "${this.currentTranscript}" (interim: "${this.lastInterimTranscript}")`);

    // If a stop operation is already ongoing, reuse its promise
    if (this.stopPromise) {
      console.log('[SpeechDiag] stopListening() re-using existing pending stopPromise.');
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
        console.log('[SpeechDiag] MediaRecorder and microphone tracks stopped.');
      } catch (e) {
        console.warn('[SpeechDiag] MediaRecorder stop error:', e);
      }
    }

    // If speech recognition is not supported or not active, resolve immediately
    if (!this.isSupported || !this.recognition || !this.isRecognitionActive) {
      console.log('[SpeechDiag] SpeechRecognition inactive or unsupported. Resolving stop immediately.');
      this.isRecognitionActive = false;
      const result = (this.currentTranscript || this.lastInterimTranscript).trim();
      this.cleanupTemporaryAudio();
      console.log(`[SpeechDiag] Stop Promise resolved immediately with final transcript: "${result}"`);
      return Promise.resolve(result);
    }

    this.stopPromise = new Promise<string>((resolve) => {
      let resolved = false;

      const finish = (usedTimeout: boolean) => {
        if (resolved) return;
        resolved = true;

        console.log(`[SpeechDiag] stopListening finish() called. usedFallbackTimeout=${usedTimeout}`);

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
        console.log(`[SpeechDiag] Stop Promise resolving with final transcript: "${result}". (Used fallback timeout: ${usedTimeout})`);
        resolve(result);
      };

      this.pendingStopResolver = () => finish(false);

      // Safe fallback timeout (2.5 seconds) so Promise can never remain pending indefinitely
      this.stopTimeoutId = setTimeout(() => {
        console.warn('[SpeechDiag] Safe 2.5s fallback timeout triggered (onend did not fire within 2.5s).');
        finish(true);
      }, 2500);

      try {
        console.log('[SpeechDiag] Calling recognition.stop()...');
        // Calling stop() allows speech recognition to flush remaining buffered audio and fire final onresult then onend
        this.recognition.stop();
        console.log('[SpeechDiag] recognition.stop() called successfully.');
        console.log(`[SpeechDiag] Transcript immediately after stop() call: "${this.currentTranscript}"`);
      } catch (e) {
        console.warn('[SpeechDiag] recognition.stop() error exception:', e);
        finish(false);
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
