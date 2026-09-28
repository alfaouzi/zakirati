/**
 * Text-to-Speech Service Abstraction
 * Reads encouraging messages in Arabic aloud for children.
 * Handles missing voices or browser limitations gracefully without crashing.
 */

export class TextToSpeechService {
  private isSpeaking: boolean = false;
  private voicesLoaded: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Pre-load voices
      window.speechSynthesis.onvoiceschanged = () => {
        this.voicesLoaded = true;
      };
    }
  }

  public isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public stop(): void {
    if (this.isAvailable()) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  public speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void
  ): void {
    if (!this.isAvailable()) {
      console.warn('Text-to-speech is not supported on this browser.');
      onError?.('خدمة القراءة الصوتية غير مدعومة على هذا المتصفح.');
      return;
    }

    try {
      this.stop(); // Stop any previous speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.9; // Slightly slower, child-friendly pace
      utterance.pitch = 1.05; // Friendly warm pitch

      const voices = window.speechSynthesis.getVoices();
      // Look for Arabic voice
      const arabicVoice = voices.find(
        (v) => v.lang.startsWith('ar') || v.lang.includes('Arabic')
      );
      if (arabicVoice) {
        utterance.voice = arabicVoice;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        onStart?.();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        onEnd?.();
      };

      utterance.onerror = (e) => {
        this.isSpeaking = false;
        console.warn('SpeechSynthesis error:', e);
        onError?.(e);
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('Failed to speak message:', error);
      this.isSpeaking = false;
      onError?.(error);
    }
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const textToSpeechService = new TextToSpeechService();
