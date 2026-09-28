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
  private currentTranscript: string = '';
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

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
    this.currentTranscript = '';
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

    this.recognition.onstart = () => {
      this.isCurrentlyListening = true;
      callbacks.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
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

      const displayTranscript = (this.currentTranscript + ' ' + interimTranscript).trim();
      callbacks.onResult?.(displayTranscript, Boolean(finalTranscript));
    };

    this.recognition.onerror = (event: any) => {
      console.warn('Speech recognition event error:', event.error);
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
      this.isCurrentlyListening = false;
      callbacks.onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (err) {
      console.warn('Recognition start exception:', err);
      // Already running or failed
      callbacks.onStart?.();
    }
  }

  public stopListening(): Promise<string> {
    return new Promise((resolve) => {
      this.isCurrentlyListening = false;

      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        try {
          this.mediaRecorder.stop();
          // Stop all audio tracks to turn off the microphone indicator immediately
          this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        } catch (e) {
          console.warn('MediaRecorder stop error:', e);
        }
      }

      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch (e) {
          console.warn('Recognition stop error:', e);
        }
      }

      // Allow a brief moment for final speech packets
      setTimeout(() => {
        const result = this.currentTranscript.trim();
        // Clean up temporary audio chunks immediately for privacy
        this.cleanupTemporaryAudio();
        resolve(result);
      }, 300);
    });
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
