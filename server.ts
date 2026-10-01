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

// Fallback semantic analysis when offline or without API key
function analyzeStoryFallback(firstStory: string, secondStory: string): StoryAnalysisResponse {
  const trimmed1 = firstStory.trim();
  const trimmed2 = secondStory.trim();

  // Reject greeting-only or insufficient input
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

  const words1 = normalize(trimmed1).split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
  const words2 = normalize(trimmed2).split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));

  const set1 = new Set(words1);
  const matched = words2.filter(w => set1.has(w));
  const overlapRatio = words1.length > 0 ? matched.length / Math.max(words1.length, 1) : 0;

  const overallScore = Math.round(overlapRatio * 100);
  const mainEventsScore = Math.round((overlapRatio * 0.9 + 0.1) * 100);
  const sequenceScore = Math.round((overlapRatio * 0.85 + 0.15) * 100);
  const detailsScore = Math.round((overlapRatio * 0.95 + 0.05) * 100);

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

  let encouragementMessage = '';
  if (overallScore >= 80) {
    encouragementMessage = 'رائع ومبهر يا بطل! تذكرت معظم تفاصيل وأحداث قصتك الأولى بدقة.';
  } else if (overallScore >= 50) {
    encouragementMessage = 'أحسنت! تذكرت عدة تفاصيل أساسية من قصتك الأولى.';
  } else {
    encouragementMessage = 'محاولة جميلة في السرد! اختلفت الرواية الثانية عن الأولى، وفي المرة القادمة ستتذكر أكثر.';
  }

  return {
    overallScore: clampScore(overallScore, 50),
    mainEventsScore: clampScore(mainEventsScore, 50),
    sequenceScore: clampScore(sequenceScore, 50),
    detailsScore: clampScore(detailsScore, 50),
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

    // Check for greeting-only / insufficient content before calling AI
    if (isInsufficientTranscript(trimmed1) || isInsufficientTranscript(trimmed2)) {
      return res.json({
        overallScore: 0,
        mainEventsScore: 0,
        sequenceScore: 0,
        detailsScore: 0,
        strengths: ['لا تتوفر تفاصيل أو أحداث كافية في النصين لتقييم التذكر'],
        encouragementMessage:
          'النص المسجل يحتوي على ترحيب أو كلمات مقتضبة فقط، ولا توجد قصة مكتملة لتقييمها. شاركني قصة تحتوي على أحداث وأشخاص لنكتشف ما تذكرته!',
        isFallback: false,
      });
    }

    // Check if Gemini API Key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
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

    const systemInstruction = `أنت المساعد التحليلي والتربوي للعبة الأطفال "صدى حكايتي" (My Memory Tells) للمطور ل.فوزي.
مهمتك تقييم التذكر والتعبير الشفهي بدقة وأمانة وموضوعية تشجيعية، ومقارنة الرواية الأولى بإعادة السرد من الذاكرة في الرواية الثانية.

قواعد الدقة والأمانة الصارمة:
1. انتبه جيداً: لا تخترع تفاصيل أو شخصيات أو أماكن لم تذكر في النصين نهائياً.
2. إذا كان النصان يحتويان على ترحيب أو مجاملة فقط (مثل "السلام عليكم" أو كلمات معدودة لا تشكل قصة):
   - يجب أن تكون الدرجات كلها 0.
   - قائمة strengths يجب أن تكون: ["لا تتوفر تفاصيل أو أحداث كافية في النص لتقييم التذكر"].
   - الرسالة التشجيعية: دعوة الطفل بلطف لحكاية قصة حقيقية تحتوي على مواقف وأحداث.
3. للقصص الحقيقية:
   - قارن الأحداث والتفاصيل والشخصيات المذكورة بالفعل في النصين فقط.
   - نقاط القوة (strengths) يجب أن تشير فقط إلى ما تذكره الطفل فعلياً ومطابقته للقصة الأولى.
   - لا تقل "تذكرت المكان والأشخاص" إلا إذا كان النص الأول يحتوي فعلاً على مكان وأشخاص وتم ذكرهم في النص الثاني.
4. التقييم تشجيعي ولطيف، خالي من أي تشخيص طبي أو تصنيف نفسي.`;

    const prompt = `القصة الأولى (الرواية الأولى):
"${trimmed1}"

القصة الثانية (إعادة السرد من الذاكرة):
"${trimmed2}"

قارن بأمانة بين الروايتين، وقدم نتيجة التقييم بصيغة JSON.`;

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
              description: 'قائمة بنقاط القوة التي تذكرها الطفل بنجاح باللغة العربية مبنية على النص فقط'
            },
            encouragementMessage: {
              type: Type.STRING,
              description: 'رسالة تشجيعية دافئة للطفل باللغة العربية'
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
      overallScore: clampScore(parsed.overallScore, 0),
      mainEventsScore: clampScore(parsed.mainEventsScore, 0),
      sequenceScore: clampScore(parsed.sequenceScore, 0),
      detailsScore: clampScore(parsed.detailsScore, 0),
      strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0
        ? parsed.strengths.slice(0, 3)
        : ['تذكرت بعض تفاصيل القصة'],
      encouragementMessage: parsed.encouragementMessage || 'أحسنت! واصل تدريب ذاكرتك بحكاية القصص.',
      isFallback: false,
    };

    return res.json(sanitized);
  } catch (error: any) {
    const category = error?.message === 'UPSTREAM_AI_TIMEOUT' ? 'TIMEOUT_EXCEEDED' : 'AI_UPSTREAM_ERROR';
    console.error(`[StoryAnalysis] ${category}: Analysis failed safely without logging story contents.`);

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
