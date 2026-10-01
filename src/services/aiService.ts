import { StoryAnalysisResult } from '../types/game';

export interface IStoryAnalysisService {
  analyzeStories(
    firstStory: string,
    secondStory: string
  ): Promise<StoryAnalysisResult>;
}

const GREETING_WORDS = new Set([
  'سلام', 'السلام', 'عليكم', 'وعليكم', 'ورحمة', 'الله', 'وبركاته',
  'مرحبا', 'مرحباً', 'اهلا', 'أهلا', 'أهلاً', 'صباح', 'الخير', 'مساء',
  'هاي', 'الو', 'ألو', 'شكرا', 'شكراً', 'نعم', 'لا', 'ايوه', 'ايوة',
  'بسم', 'الرحمن', 'الرحيم', 'تمام', 'اوكي', 'أوكي', 'هلو', 'هلا'
]);

function isInsufficientTranscript(text: string): boolean {
  const words = text
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length < 4) return true;
  const nonGreetings = words.filter(w => !GREETING_WORDS.has(w));
  return nonGreetings.length < 3;
}

export class RemoteStoryAnalysisService implements IStoryAnalysisService {
  private endpoint: string;

  constructor(endpoint: string = '/api/analyze-story') {
    this.endpoint = endpoint;
  }

  async analyzeStories(
    firstStory: string,
    secondStory: string
  ): Promise<StoryAnalysisResult> {
    if (!firstStory.trim()) {
      throw new Error('القصة الأولى فارغة، يرجى تسجيل القصة أولاً.');
    }
    if (!secondStory.trim()) {
      throw new Error('القصة الثانية فارغة، يرجى إعادة سرد القصة.');
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstStory,
          secondStory,
        }),
      });

      if (!response.ok) {
        throw new Error(`خطأ في استجابة الخادم: ${response.status}`);
      }

      const data = await response.json();
      return this.validateAndSanitize(data);
    } catch (err: any) {
      console.warn('Remote story analysis failed, trying fallback endpoint...', err);
      // Try secondary endpoint '/analyze-story' if '/api/analyze-story' failed
      try {
        const altResponse = await fetch('/analyze-story', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstStory,
            secondStory,
          }),
        });

        if (altResponse.ok) {
          const altData = await altResponse.json();
          return this.validateAndSanitize(altData);
        }
      } catch (altErr) {
        console.warn('Alt endpoint also failed:', altErr);
      }

      // If remote backend is unreachable, gracefully fall back to local mock analyzer
      const mockService = new MockStoryAnalysisService();
      return await mockService.analyzeStories(firstStory, secondStory);
    }
  }

  private validateAndSanitize(data: any): StoryAnalysisResult {
    const sanitizeScore = (val: any, fallback: number) => {
      const num = Number(val);
      if (isNaN(num)) return fallback;
      return Math.max(0, Math.min(100, Math.round(num)));
    };

    const overallScore = sanitizeScore(data.overallScore, 0);
    const mainEventsScore = sanitizeScore(data.mainEventsScore, 0);
    const sequenceScore = sanitizeScore(data.sequenceScore, 0);
    const detailsScore = sanitizeScore(data.detailsScore, 0);

    const strengths: string[] =
      Array.isArray(data.strengths) && data.strengths.length > 0
        ? data.strengths.map(String).slice(0, 3)
        : ['تذكرت بعض تفاصيل القصة'];

    const encouragementMessage =
      typeof data.encouragementMessage === 'string' && data.encouragementMessage.trim()
        ? data.encouragementMessage
        : 'أحسنت! واصل تدريب ذاكرتك بحكاية القصص.';

    return {
      overallScore,
      mainEventsScore,
      sequenceScore,
      detailsScore,
      strengths,
      encouragementMessage,
      isFallback: Boolean(data.isFallback),
    };
  }
}

export class MockStoryAnalysisService implements IStoryAnalysisService {
  async analyzeStories(
    firstStory: string,
    secondStory: string
  ): Promise<StoryAnalysisResult> {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const trimmed1 = firstStory.trim();
    const trimmed2 = secondStory.trim();

    if (!trimmed1) {
      throw new Error('القصة الأولى فارغة');
    }
    if (!trimmed2) {
      throw new Error('القصة الثانية فارغة');
    }

    if (isInsufficientTranscript(trimmed1) || isInsufficientTranscript(trimmed2)) {
      return {
        overallScore: 0,
        mainEventsScore: 0,
        sequenceScore: 0,
        detailsScore: 0,
        strengths: ['لا تتوفر تفاصيل أو أحداث كافية في النصين لتقييم التذكر'],
        encouragementMessage:
          'النص المسجل يحتوي على ترحيب أو كلمات مقتضبة فقط، ولا توجد قصة مكتملة لتقييمها. شاركني قصة تحتوي على أحداث وأشخاص لنكتشف ما تذكرته!',
        isFallback: true,
      };
    }

    const words1 = trimmed1.split(/\s+/).filter(Boolean);
    const words2 = trimmed2.split(/\s+/).filter(Boolean);

    const set1 = new Set(words1);
    const matched = words2.filter(w => set1.has(w));
    const ratio = words1.length > 0 ? matched.length / words1.length : 0;

    const overallScore = Math.round(ratio * 100);
    const mainEventsScore = Math.round((ratio * 0.9 + 0.1) * 100);
    const sequenceScore = Math.round((ratio * 0.85 + 0.15) * 100);
    const detailsScore = Math.round((ratio * 0.95 + 0.05) * 100);

    const strengths: string[] = [];
    if (matched.length > 0) {
      const sample = Array.from(new Set(matched)).slice(0, 2).join('، ');
      strengths.push(`تذكرت عناصر رئيسية من القصة الأولى (${sample})`);
    } else {
      strengths.push('سردت القصة الثانية بأسلوب مختلف عن الأولى');
    }

    if (words2.length >= Math.floor(words1.length * 0.6)) {
      strengths.push('أعدت سرد القصة بحجم وتفاصيل متقاربة');
    } else {
      strengths.push('لخصت الفكرة باختصار في الرواية الثانية');
    }

    let encouragementMessage = 'أحسنت! واصل تدريب ذاكرتك بحكاية القصص.';
    if (overallScore >= 80) {
      encouragementMessage = 'رائع ومبهر يا بطل! تذكرت معظم تفاصيل وأحداث قصتك الأولى بدقة.';
    } else if (overallScore >= 50) {
      encouragementMessage = 'أحسنت! تذكرت عدة تفاصيل أساسية من قصتك الأولى.';
    } else {
      encouragementMessage = 'محاولة جميلة في السرد! اختلفت الرواية الثانية عن الأولى، وفي المرة القادمة ستتذكر أكثر.';
    }

    return {
      overallScore: Math.min(100, Math.max(0, overallScore)),
      mainEventsScore: Math.min(100, Math.max(0, mainEventsScore)),
      sequenceScore: Math.min(100, Math.max(0, sequenceScore)),
      detailsScore: Math.min(100, Math.max(0, detailsScore)),
      strengths: strengths.slice(0, 3),
      encouragementMessage,
      isFallback: true,
    };
  }
}

export const storyAnalysisService: IStoryAnalysisService = new RemoteStoryAnalysisService();
