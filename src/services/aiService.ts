import { StoryAnalysisResult } from '../types/game';

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

    const overallScore = sanitizeScore(data.overallScore, 85);
    const mainEventsScore = sanitizeScore(data.mainEventsScore, 85);
    const sequenceScore = sanitizeScore(data.sequenceScore, 80);
    const detailsScore = sanitizeScore(data.detailsScore, 80);

    const strengths: string[] =
      Array.isArray(data.strengths) && data.strengths.length > 0
        ? data.strengths.map(String).slice(0, 3)
        : [
            'تذكرت الأحداث المهمة في قصتك',
            'حافظت على الترتيب الزمني',
            'عبرت عن قصتك بأسلوب جميل',
          ];

    const encouragementMessage =
      typeof data.encouragementMessage === 'string' && data.encouragementMessage.trim()
        ? data.encouragementMessage
        : 'أحسنت يا بطل! تذكرت تفاصيل جميلة من قصتك.';

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
    // Artificial small delay to simulate thinking
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const words1 = firstStory.trim().split(/\s+/).filter(Boolean);
    const words2 = secondStory.trim().split(/\s+/).filter(Boolean);

    // Basic semantic check
    const ratio = Math.min(1, Math.max(0.3, words2.length / Math.max(words1.length, 1)));
    const overallScore = Math.round(65 + ratio * 30);
    const mainEventsScore = Math.round(70 + ratio * 25);
    const sequenceScore = Math.round(60 + ratio * 35);
    const detailsScore = Math.round(65 + ratio * 28);

    const strengths: string[] = [
      'تذكرت الشخصيات والأماكن الأساسية',
      'حافظت على المعنى العام لقصتك الجميلة',
      'سردت الأحداث بثقة وترتيب رائع',
    ];

    let encouragementMessage = 'أحسنت! تذكرت تفاصيل جميلة من قصتك وحكايتك ممتعة.';
    if (overallScore >= 85) {
      encouragementMessage = 'رائع ومبهر! تذكرت معظم أحداث قصتك وتفاصيلها بدقة وبراعة.';
    } else if (overallScore >= 70) {
      encouragementMessage = 'أحسنت يا بطل! تذكرت الكثير من التفاصيل المهمة للقصة.';
    } else {
      encouragementMessage = 'محاولة جميلة ومميزة! تذكرت بعض الأحداث، وفي الجولة القادمة ستتذكر أكثر.';
    }

    return {
      overallScore,
      mainEventsScore,
      sequenceScore,
      detailsScore,
      strengths,
      encouragementMessage,
      isFallback: true,
    };
  }
}

export const storyAnalysisService: IStoryAnalysisService = new RemoteStoryAnalysisService();
