import { StoryAnalysisResult } from '../types/game';
import { validateStoryContent } from './contentValidator';

export interface IStoryAnalysisService {
  analyzeStories(
    firstStory: string,
    secondStory: string
  ): Promise<StoryAnalysisResult>;
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
      recalledDetails: Array.isArray(data.recalledDetails) ? data.recalledDetails.map(String).slice(0, 3) : [],
      omittedDetails: Array.isArray(data.omittedDetails) ? data.omittedDetails.map(String).slice(0, 3) : [],
      changedDetails: Array.isArray(data.changedDetails) ? data.changedDetails.map(String).slice(0, 3) : [],
      charactersAnalysis: typeof data.charactersAnalysis === 'string' ? data.charactersAnalysis : '',
      placesAnalysis: typeof data.placesAnalysis === 'string' ? data.placesAnalysis : '',
      sequenceAnalysis: typeof data.sequenceAnalysis === 'string' ? data.sequenceAnalysis : '',
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

    const check1 = validateStoryContent(trimmed1);
    const check2 = validateStoryContent(trimmed2);

    if (!check1.isValid || !check2.isValid) {
      const reason = !check1.isValid ? check1.message : check2.message;
      return {
        overallScore: 0,
        mainEventsScore: 0,
        sequenceScore: 0,
        detailsScore: 0,
        strengths: ['لم تتوفر معلومات كافية في التسجيل لإجراء تقييم التذكر'],
        encouragementMessage: `${reason} يُرجى إعادة السرد وحكاية قصة واضحة لنتمكن معاً من اكتشاف ما استطعت تذكره!`,
        isFallback: true,
        recalledDetails: [],
        omittedDetails: ['لم يتم تسجيل قصة كافية للمقارنة'],
        changedDetails: [],
        charactersAnalysis: 'لا توجد شخصيات محددة لتحليلها.',
        placesAnalysis: 'لم يتم ذكر أماكن في النص.',
        sequenceAnalysis: 'لا يوجد تسلسل أحداث كافٍ.',
      };
    }

    const words1 = trimmed1.split(/\s+/).filter(Boolean);
    const words2 = trimmed2.split(/\s+/).filter(Boolean);

    const set1 = new Set(words1);
    const matched = Array.from(new Set(words2.filter((w) => set1.has(w))));
    const set2 = new Set(words2);
    const omitted = Array.from(new Set(words1.filter((w) => !set2.has(w))));

    const ratio = words1.length > 0 ? matched.length / words1.length : 0;

    const overallScore = Math.round(ratio * 100);
    const mainEventsScore = Math.round((ratio * 0.9 + 0.1) * 100);
    const sequenceScore = Math.round((ratio * 0.85 + 0.15) * 100);
    const detailsScore = Math.round((ratio * 0.95 + 0.05) * 100);

    const strengths: string[] = [];
    const recalledDetails: string[] = [];
    const omittedDetails: string[] = [];
    const changedDetails: string[] = [];

    if (matched.length > 0) {
      const sample = matched.slice(0, 3).map((w) => `"${w}"`).join(' و ');
      strengths.push(`تذكرت عناصر رئيسية من القصة الأولى (${sample})`);
      recalledDetails.push(`تذكرت أحداثاً وعناصر مثل: ${sample}`);
    } else {
      strengths.push('سردت القصة الثانية بأسلوب مختلف عن الأولى');
    }

    if (omitted.length > 0) {
      const omittedSample = omitted.slice(0, 2).map((w) => `"${w}"`).join(' و ');
      omittedDetails.push(`أغفلت بعض الكلمات التي ذكرتها أولاً مثل: ${omittedSample}`);
    } else {
      omittedDetails.push('لم تغفل تفاصيل جوهرية من الرواية الأولى');
    }

    if (words2.length >= Math.floor(words1.length * 0.6)) {
      strengths.push('أعدت سرد القصة بحجم وتفاصيل متقاربة');
      changedDetails.push('استخدمت أسلوبك الخاص للتعبير عن نفس المعنى العام');
    } else {
      strengths.push('لخصت الفكرة باختصار في الرواية الثانية');
      changedDetails.push('اخترت تلخيص القصة بدلاً من ذكر كل التفاصيل السابقة');
    }

    const charactersAnalysis = matched.length > 0
      ? 'تم استرجاع الإشارات إلى الشخصيات بدقة ملحوظة.'
      : 'ظهر اختلاف في الإشارة إلى الشخصيات بين الروايتين.';

    const placesAnalysis = 'تم استرجاع البيئة العامة للأحداث بأسلوب شفهي جميل.';
    const sequenceAnalysis = words2.length >= Math.floor(words1.length * 0.6)
      ? 'تسلسل الأحداث توافق مع البداية والوسط في القصة الأولى.'
      : 'اقتصر تسلسل الأحداث على الفكرة الأساسية بشكل موجز.';

    let encouragementMessage = 'أحسنت! واصل تدريب ذاكرتك بحكاية القصص.';
    if (overallScore >= 80) {
      encouragementMessage = 'رائع ومبهر يا بطل! تذكرت معظم تفاصيل وأحداث قصتك الأولى بدقة وبراعة.';
    } else if (overallScore >= 50) {
      encouragementMessage = 'أحسنت! تذكرت عدة تفاصيل أساسية من قصتك الأولى، ومحاولتك تدل على تركيز رائع.';
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
      recalledDetails,
      omittedDetails,
      changedDetails,
      charactersAnalysis,
      placesAnalysis,
      sequenceAnalysis,
    };
  }
}

export const storyAnalysisService: IStoryAnalysisService = new RemoteStoryAnalysisService();
