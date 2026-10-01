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
  recalledDetails?: string[];
  omittedDetails?: string[];
  changedDetails?: string[];
  charactersAnalysis?: string;
  placesAnalysis?: string;
  sequenceAnalysis?: string;
}

// Helper to sanitize score to range 0..100
function clampScore(score: unknown, defaultVal: number): number {
  if (typeof score !== 'number' || isNaN(score)) return defaultVal;
  return Math.max(0, Math.min(100, Math.round(score)));
}

const GREETING_WORDS = new Set([
  'سلام', 'السلام', 'عليكم', 'وعليكم', 'ورحمة', 'الله', 'وبركاته',
  'مرحبا', 'مرحباً', 'اهلا', 'أهلا', 'أهلاً', 'صباح', 'الخير', 'مساء',
  'النور', 'شكرا', 'شكراً', 'هاي', 'هلو', 'الو', 'ألو', 'كيف', 'حالك',
  'الحال', 'تمام', 'بخير', 'هلا', 'عافية', 'يعطيك', 'العافية', 'يسلمو',
  'بسم', 'الرحمن', 'الرحيم', 'يا', 'مية', 'أهلين', 'اهلين', 'أصدقاء', 'اصدقاء'
]);

const FILLER_SOUNDS = new Set([
  'اممم', 'امممم', 'ممم', 'اها', 'اه', 'اووه', 'اوو', 'اييي',
  'هاها', 'هاهاها', 'هههه', 'ههه', 'بلابلا', 'يعني', 'شو', 'ايش'
]);

type ContentCategory = 'EMPTY_OR_TOO_SHORT' | 'GREETING' | 'UNCLEAR' | 'VALID_STORY';

interface TranscriptCheck {
  isValid: boolean;
  category: ContentCategory;
  retellMessage: string;
}

function checkTranscriptContent(text: string): TranscriptCheck {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      category: 'EMPTY_OR_TOO_SHORT',
      retellMessage: 'لم نتمكن من سماع تسجيل كافٍ. يُرجى إعادة السرد وحكاية قصة واضحة.',
    };
  }

  const words = trimmed
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length < 3) {
    return {
      isValid: false,
      category: 'EMPTY_OR_TOO_SHORT',
      retellMessage: 'التسجيل قصير جداً ولا يحتوي على أحداث. يُرجى إعادة السرد لسرد قصة كاملة.',
    };
  }

  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  if (uniqueWords.size <= 2 && words.length >= 3) {
    return {
      isValid: false,
      category: 'UNCLEAR',
      retellMessage: 'الكلام مكرر أو غير واضح بما يكفي لفهم القصة. يُرجى إعادة السرد بوضوح.',
    };
  }

  const fillerCount = words.filter(w => FILLER_SOUNDS.has(w)).length;
  if (fillerCount / words.length > 0.5) {
    return {
      isValid: false,
      category: 'UNCLEAR',
      retellMessage: 'الكلام غير واضح بما يكفي للمقارنة. يُرجى إعادة السرد بهدوء.',
    };
  }

  const nonGreetings = words.filter(w => !GREETING_WORDS.has(w) && !FILLER_SOUNDS.has(w));
  const greetingCount = words.filter(w => GREETING_WORDS.has(w)).length;

  if (nonGreetings.length < 2 || greetingCount / words.length >= 0.5) {
    return {
      isValid: false,
      category: 'GREETING',
      retellMessage: 'التسجيل يحتوي على تحية ومجاملة فقط وليس حكاية. يُرجى إعادة السرد وحكاية قصة حدثت معك.',
    };
  }

  if (nonGreetings.length < 3) {
    return {
      isValid: false,
      category: 'EMPTY_OR_TOO_SHORT',
      retellMessage: 'القصة تفتقر إلى التفاصيل الكافية للمقارنة. يُرجى إعادة السرد مع ذكر ما حدث.',
    };
  }

  return {
    isValid: true,
    category: 'VALID_STORY',
    retellMessage: '',
  };
}

// Fallback semantic analysis when offline or without API key
function analyzeStoryFallback(firstStory: string, secondStory: string): StoryAnalysisResponse {
  const trimmed1 = firstStory.trim();
  const trimmed2 = secondStory.trim();

  const check1 = checkTranscriptContent(trimmed1);
  const check2 = checkTranscriptContent(trimmed2);

  if (!check1.isValid || !check2.isValid) {
    const feedback = !check1.isValid ? check1.retellMessage : check2.retellMessage;
    return {
      overallScore: 0,
      mainEventsScore: 0,
      sequenceScore: 0,
      detailsScore: 0,
      strengths: ['لم تتوفر معلومات كافية في التسجيل لإجراء تقييم التذكر'],
      encouragementMessage: `${feedback} لنتمكن معاً من اكتشاف ما تذكرته!`,
      isFallback: true,
      recalledDetails: [],
      omittedDetails: ['لم يتم سرد أحداث في التسجيل للمقارنة'],
      changedDetails: [],
      charactersAnalysis: 'لا توجد شخصيات محددة في النص للمقارنة.',
      placesAnalysis: 'لم يتم ذكر أماكن في النص.',
      sequenceAnalysis: 'لا يوجد تسلسل أحداث كافٍ للمقارنة.',
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
  const matched = Array.from(new Set(words2.filter(w => set1.has(w))));
  const set2 = new Set(words2);
  const omitted = Array.from(new Set(words1.filter(w => !set2.has(w))));

  const overlapRatio = words1.length > 0 ? matched.length / Math.max(words1.length, 1) : 0;

  const overallScore = Math.round(overlapRatio * 100);
  const mainEventsScore = Math.round((overlapRatio * 0.9 + 0.1) * 100);
  const sequenceScore = Math.round((overlapRatio * 0.85 + 0.15) * 100);
  const detailsScore = Math.round((overlapRatio * 0.95 + 0.05) * 100);

  const strengths: string[] = [];
  const recalledDetails: string[] = [];
  const omittedDetails: string[] = [];
  const changedDetails: string[] = [];

  if (matched.length > 0) {
    const sample = matched.slice(0, 3).map(w => `"${w}"`).join(' و ');
    strengths.push(`تذكرت مفاهيم وعناصر من القصة الأولى مثل: ${sample}`);
    recalledDetails.push(`تذكرت عناصر محورية شملت: ${sample}`);
  } else {
    strengths.push('سردت القصة الثانية بأسلوب تعبيري مختلف');
  }

  if (omitted.length > 0) {
    const omittedSample = omitted.slice(0, 2).map(w => `"${w}"`).join(' و ');
    omittedDetails.push(`أغفلت بعض الكلمات والتفاصيل التي ذكرتها أولاً مثل: ${omittedSample}`);
  } else {
    omittedDetails.push('لم تغفل تفاصيل جوهرية من الرواية الأولى');
  }

  if (words2.length >= Math.floor(words1.length * 0.6)) {
    strengths.push('أعدت سرد القصة بحجم وترتيب متقاربين');
    changedDetails.push('استخدمت تعبيرات خاصة بك لسرد نفس الفكرة العامة');
  } else {
    strengths.push('لخصت الفكرة باختصار في الرواية الثانية');
    changedDetails.push('اخترت تلخيص القصة بدلاً من ذكر كل التفاصيل السابقة');
  }

  const charactersAnalysis = matched.length > 0
    ? 'تم استرجاع الشخصيات والعناصر الرئيسية بدقة متقاربة.'
    : 'ظهر اختلاف في الإشارة إلى الشخصيات بين الروايتين.';

  const placesAnalysis = 'تم استرجاع البيئة العامة للأحداث بتعبير شفهي جميل.';
  const sequenceAnalysis = words2.length >= Math.floor(words1.length * 0.6)
    ? 'تسلسل الأحداث جاء متوافقاً مع البداية والوسط في القصة الأولى.'
    : 'اقتصر تسلسل الأحداث على الفكرة الأساسية بشكل مختصر.';

  let encouragementMessage = '';
  if (overallScore >= 80) {
    encouragementMessage = 'رائع ومبهر يا بطل! تذكرت معظم تفاصيل وأحداث قصتك الأولى بدقة وبراعة.';
  } else if (overallScore >= 50) {
    encouragementMessage = 'أحسنت! تذكرت عدة تفاصيل أساسية من قصتك الأولى، ومحاولتك تدل على تركيز رائع.';
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
    recalledDetails,
    omittedDetails,
    changedDetails,
    charactersAnalysis,
    placesAnalysis,
    sequenceAnalysis,
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

    const check1 = checkTranscriptContent(trimmed1);
    const check2 = checkTranscriptContent(trimmed2);

    if (!check1.isValid || !check2.isValid) {
      const feedback = !check1.isValid ? check1.retellMessage : check2.retellMessage;
      return res.json({
        overallScore: 0,
        mainEventsScore: 0,
        sequenceScore: 0,
        detailsScore: 0,
        strengths: ['لم تتوفر معلومات كافية في التسجيل لإجراء تقييم التذكر'],
        encouragementMessage: `${feedback} لنتمكن معاً من اكتشاف ما تذكرته!`,
        isFallback: false,
        recalledDetails: [],
        omittedDetails: ['لم يتم تسجيل قصة مكتملة للتحليل'],
        changedDetails: [],
        charactersAnalysis: 'لا توجد شخصيات محددة لتحليلها.',
        placesAnalysis: 'لم يتم ذكر أماكن في النص.',
        sequenceAnalysis: 'لا يوجد تسلسل أحداث كافٍ.',
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

    const systemInstruction = `أنت المساعد التحليلي والتربوي الذكي للعبة الأطفال "صدى حكايتي" (My Memory Tells) للمطور ل.فوزي.
مهمتك تقييم التذكر والتعبير الشفهي بدقة وأمانة وموضوعية تشجيعية، ومقارنة الرواية الأولى بإعادة السرد من الذاكرة في الرواية الثانية.

قواعد المقارنة الدقيقة:
1. قارن بدقة بين الحكاية الأولى وإعادة سرد الطفل، واستخرج أوجه الاتفاق والاختلاف مع تضمين أمثلة واقتباسات صريحة من كلام الطفل الفعلي.
2. حلل العناصر الثلاثة:
   - الشخصيات (charactersAnalysis): من تم تذكره من الأشخاص/الكائنات ومن أُغفل.
   - الأماكن (placesAnalysis): الأماكن والبيئة التي دارت فيها القصة.
   - تسلسل الأحداث (sequenceAnalysis): ترتيب الأحداث الزمني وترابطها.
3. استخرج قوائم ملموسة:
   - ما تذكره الطفل (recalledDetails): أمثلة لما ذكره الطفل وتطابق دلالياً مع القصة الأولى (مع اقتباسات قصيرة بين قوسين).
   - ما أغفله الطفل (omittedDetails): تفاصيل وردت في الرواية الأولى ولم يذكرها في الإعادة.
   - ما غيّره الطفل (changedDetails): كلمات أو وقائع غيّرها أو عبّر عنها بأسلوب مختلف.
4. التقييم تشجيعي ولطيف وصادق، مبني 100% على النصين دون اختلاق أي شخصية أو مكان لم يُذكر.`;

    const prompt = `القصة الأولى (الرواية الأولى):
"${trimmed1}"

القصة الثانية (إعادة السرد من الذاكرة):
"${trimmed2}"

قارن بأمانة واستخرج أوجه الاتفاق والاختلاف بالأمثلة، وقدم النتيجة بتنسيق JSON حصرياً.`;

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
            },
            recalledDetails: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'أمثلة عما تذكره الطفل من أحداث أو شخصيات مع اقتباسات من كلامه'
            },
            omittedDetails: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'تفاصيل وردت في الرواية الأولى وأغفلها الطفل في إعادة السرد'
            },
            changedDetails: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'ما غيّره الطفل أو عبّر عنه بكلمات مختلفة مع أمثلة'
            },
            charactersAnalysis: {
              type: Type.STRING,
              description: 'تحليل دقيق للشخصيات المذكورة والمسترجعة'
            },
            placesAnalysis: {
              type: Type.STRING,
              description: 'تحليل دقيق للأماكن المذكورة ومدى استرجاعها'
            },
            sequenceAnalysis: {
              type: Type.STRING,
              description: 'تحليل تسلسل وترتيب الأحداث الزمني'
            }
          },
          required: [
            'overallScore',
            'mainEventsScore',
            'sequenceScore',
            'detailsScore',
            'strengths',
            'encouragementMessage',
            'recalledDetails',
            'omittedDetails',
            'changedDetails',
            'charactersAnalysis',
            'placesAnalysis',
            'sequenceAnalysis'
          ]
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
      recalledDetails: Array.isArray(parsed.recalledDetails) ? parsed.recalledDetails.slice(0, 3) : [],
      omittedDetails: Array.isArray(parsed.omittedDetails) ? parsed.omittedDetails.slice(0, 3) : [],
      changedDetails: Array.isArray(parsed.changedDetails) ? parsed.changedDetails.slice(0, 3) : [],
      charactersAnalysis: parsed.charactersAnalysis || '',
      placesAnalysis: parsed.placesAnalysis || '',
      sequenceAnalysis: parsed.sequenceAnalysis || '',
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
