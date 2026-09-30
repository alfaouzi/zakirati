import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '100kb' }));

// Gracefully handle oversized or malformed JSON payloads
app.use((err: any, _req: Request, res: Response, next: any) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({ error: 'حجم القصة كبير جداً' });
  }
  if (err && err instanceof SyntaxError) {
    return res.status(400).json({ error: 'طلب غير صالح' });
  }
  next(err);
});

interface StoryAnalysisResponse {
  overallScore: number;
  mainEventsScore: number;
  sequenceScore: number;
  detailsScore: number;
  strengths: string[];
  encouragementMessage: string;
  isFallback: boolean;
}

// Helper to sanitize score to range 0..100
function clampScore(score: unknown, defaultVal: number): number {
  if (typeof score !== 'number' || isNaN(score)) return defaultVal;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Fallback semantic analysis when offline or without API key
function analyzeStoryFallback(firstStory: string, secondStory: string): StoryAnalysisResponse {
  const normalize = (text: string) =>
    text
      .replace(/[إأآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .toLowerCase()
      .trim();

  const stopWords = new Set([
    'في', 'من', 'على', 'الي', 'الى', 'عن', 'مع', 'هذا', 'هذه', 'ثم', 'بعد', 'ذلك',
    'و', 'كان', 'كانت', 'ماذا', 'هو', 'هي', 'انا', 'نحن', 'يا', 'قد', 'لقد', 'ان', 'انها'
  ]);

  const words1 = normalize(firstStory).split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
  const words2 = normalize(secondStory).split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));

  const set1 = new Set(words1);
  const matched = words2.filter(w => set1.has(w));
  const overlapRatio = words1.length > 0 ? matched.length / Math.max(words1.length, 1) : 0.8;

  // Calculate scores between 60 and 96 for game encouragement
  const base = Math.min(1, Math.max(0.3, overlapRatio));
  const overallScore = Math.round(55 + base * 40);
  const mainEventsScore = Math.round(58 + base * 38);
  const sequenceScore = Math.round(50 + base * 45);
  const detailsScore = Math.round(52 + base * 40);

  const strengths: string[] = [];
  if (overlapRatio > 0.4) {
    strengths.push('تذكرت المكان والأشخاص بشكل رائع');
  } else {
    strengths.push('تذكرت الفكرة الأساسية للقصة');
  }

  if (words2.length >= Math.floor(words1.length * 0.6)) {
    strengths.push('حافظت على تسلسل الأحداث');
  } else {
    strengths.push('حاولت سرد أهم ما في القصة');
  }

  strengths.push('استخدمت كلماتك الخاصة بأسلوب جميل');

  let encouragementMessage = '';
  if (overallScore >= 80) {
    encouragementMessage = 'رائع جدًا! تذكرت معظم أحداث وتفاصيل قصتك بذكاء.';
  } else if (overallScore >= 65) {
    encouragementMessage = 'أحسنت يا بطل! تذكرت الكثير من التفاصيل المهمة للقصة.';
  } else {
    encouragementMessage = 'محاولة جميلة ومميزة! تذكرت بعض الأحداث، وفي الجولة القادمة ستتذكر أكثر.';
  }

  return {
    overallScore: clampScore(overallScore, 75),
    mainEventsScore: clampScore(mainEventsScore, 75),
    sequenceScore: clampScore(sequenceScore, 75),
    detailsScore: clampScore(detailsScore, 75),
    strengths: strengths.slice(0, 3),
    encouragementMessage,
    isFallback: true,
  };
}

async function handleAnalyzeStory(req: Request, res: Response) {
  try {
    const { firstStory, secondStory } = req.body || {};

    if (!firstStory || typeof firstStory !== 'string' || !firstStory.trim()) {
      return res.status(400).json({ error: 'القصة الأولى مطلوبة' });
    }
    if (!secondStory || typeof secondStory !== 'string' || !secondStory.trim()) {
      return res.status(400).json({ error: 'القصة الثانية مطلوبة' });
    }

    const trimmed1 = firstStory.trim();
    const trimmed2 = secondStory.trim();

    // Check if Gemini API Key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      // Use fallback
      const fallbackResult = analyzeStoryFallback(trimmed1, trimmed2);
      return res.json(fallbackResult);
    }

    // Call Gemini 3.8 Flash with 15s timeout
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 15000,
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `أنت المساعد الذكي للعبة الأطفال التعليمية "صدى حكايتي" (My Memory Tells) للمطور ل.فوزي.
الهدف هو تدريب ذاكرة الطفل والتعبير الشفهي بتشجيع وإيجابية مطلقة.
المهمة:
قارن دلاليًا ومعنويًا بين القصة الأولى التي حكاها الطفل، وإعادة سردها من الذاكرة في الجولة الثانية.

قواعد صارمة:
1. المقارنة دلالية وفكرية (المعنى، الأحداث، الشخصيات، الأماكن، الترتيب الزمني، التفاصيل المفيدة)، وليست مطابقة حرفية للكلمات.
2. لا تحاسب الطفل على الكلمات المحشوة أو اللهجات الدارجة (كالجزائرية أو الشامية أو المصرية) أو الأخطاء الإملائية أو أخطاء التعرف على الصوت.
3. التقييم هو درجة لعبة (Game score) تشجيعية، وليس اختبار ذكاء أو فحصًا نفسيًا أو طبيًا.
4. حافظ دائمًا على لغة عربية ودودة ومشجعة ودافئة للطفل، دون أي توبيخ أو إحباط حتى مع النقص في التذكر.
5. أعد النتيجة بتنسيق JSON حصريًا وفق المخطط المطلوب:
- overallScore (0-100)
- mainEventsScore (0-100)
- sequenceScore (0-100)
- detailsScore (0-100)
- strengths (قائمة من 2 إلى 3 نقاط إيجابية واضحة عما تذكره الطفل)
- encouragementMessage (رسالة دافئة ومحفزة للطفل تناسب عمره)`;

    const prompt = `القصة الأولى (الرواية الأولى):
"${trimmed1}"

القصة الثانية (إعادة السرد من الذاكرة):
"${trimmed2}"

قارن بين الروايتين دلاليًا، وقدم نتيجة التقييم التشجيعي بصيغة JSON.`;

    // 15-second controlled server-side timeout wrapper
    let timeoutTimer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutTimer = setTimeout(() => {
        reject(new Error('UPSTREAM_AI_TIMEOUT'));
      }, 15000);
    });

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER, description: 'درجة اللعبة الكلية من 0 إلى 100' },
            mainEventsScore: { type: Type.INTEGER, description: 'درجة تذكر الأحداث الرئيسية من 0 إلى 100' },
            sequenceScore: { type: Type.INTEGER, description: 'درجة ترتيب الأحداث الزمني من 0 إلى 100' },
            detailsScore: { type: Type.INTEGER, description: 'درجة التفاصيل والأشخاص والأماكن من 0 إلى 100' },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'قائمة بنقاط القوة التي تذكرها الطفل بنجاح باللغة العربية'
            },
            encouragementMessage: {
              type: Type.STRING,
              description: 'رسالة تشجيعية دافئة للطفل باللغة العربية لقراءتها بصوت عالٍ'
            }
          },
          required: ['overallScore', 'mainEventsScore', 'sequenceScore', 'detailsScore', 'strengths', 'encouragementMessage']
        }
      }
    });

    const response = await Promise.race([generatePromise, timeoutPromise]).finally(() => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Empty response from AI model');
    }

    const parsed = JSON.parse(text) as StoryAnalysisResponse;
    const sanitized: StoryAnalysisResponse = {
      overallScore: clampScore(parsed.overallScore, 80),
      mainEventsScore: clampScore(parsed.mainEventsScore, 80),
      sequenceScore: clampScore(parsed.sequenceScore, 75),
      detailsScore: clampScore(parsed.detailsScore, 75),
      strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0
        ? parsed.strengths.slice(0, 3)
        : ['تذكرت الأحداث المهمة في قصتك', 'حافظت على المعنى العام للقصة'],
      encouragementMessage: parsed.encouragementMessage || 'أحسنت! تذكرت تفاصيل جميلة من قصتك.',
      isFallback: false,
    };

    return res.json(sanitized);
  } catch (error: any) {
    // Sanitized logging: log only safe diagnostic category without any child story text or request body
    const category = error?.message === 'UPSTREAM_AI_TIMEOUT' ? 'TIMEOUT_EXCEEDED' : 'AI_UPSTREAM_ERROR';
    console.error(`[StoryAnalysis] ${category}: Analysis failed safely without logging story contents.`);

    // Graceful fallback so the child's game experience is uninterrupted
    const { firstStory, secondStory } = req.body || {};
    const fallbackResult = analyzeStoryFallback(firstStory || '', secondStory || '');
    return res.json(fallbackResult);
  }
}

// Health check endpoints for Cloud Run / load balancer probes
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Support both endpoint styles mentioned in the specification
app.post('/analyze-story', handleAnalyzeStory);
app.post('/api/analyze-story', handleAnalyzeStory);

// Vite middleware for dev or static build for production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`صدى حكايتي (My Memory Tells) server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
