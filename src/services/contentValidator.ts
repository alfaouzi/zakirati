/**
 * Content Validation Service for "صدى حكايتي" (My Memory Tells)
 * Distinguishes between:
 * 1. Empty or extremely short recordings (تسجيل فارغ أو قصير جدًا)
 * 2. Greetings and polite introductions (تحية ومجاملات)
 * 3. Unclear / mumbled / filler speech (كلام غير واضح أو مكرر)
 * 4. Genuine storytelling narrative (حكاية قابلة للتحليل)
 */

export type ContentCategory = 'EMPTY_OR_TOO_SHORT' | 'GREETING' | 'UNCLEAR' | 'VALID_STORY';

export interface ContentValidationResult {
  isValid: boolean;
  category: ContentCategory;
  message: string;
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

export function validateStoryContent(text: string): ContentValidationResult {
  const trimmed = (text || '').trim();

  // 1. Empty or too short
  if (!trimmed) {
    return {
      isValid: false,
      category: 'EMPTY_OR_TOO_SHORT',
      message: 'لم يتم تسجيل أي كلام. اضغط على الميكروفون وابدأ بسرد قصتك.',
    };
  }

  // Tokenize and clean punctuation
  const words = trimmed
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length < 3) {
    return {
      isValid: false,
      category: 'EMPTY_OR_TOO_SHORT',
      message: 'التسجيل قصير جداً! احكِ لي قصة أو موقفاً كاملاً عما حدث.',
    };
  }

  // 2. Check for unclear speech or repetitive fillers
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  if (uniqueWords.size <= 2 && words.length >= 3) {
    return {
      isValid: false,
      category: 'UNCLEAR',
      message: 'الكلام مكرر أو غير واضح بما يكفي لفهم أحداث القصة. حاول السرد بوضوح.',
    };
  }

  const fillerCount = words.filter((w) => FILLER_SOUNDS.has(w)).length;
  if (fillerCount / words.length > 0.5) {
    return {
      isValid: false,
      category: 'UNCLEAR',
      message: 'لم نتمكن من سماع قصة واضحة. اضغط على الميكروفون وأعد السرد بهدوء.',
    };
  }

  // 3. Check for greetings
  const greetingCount = words.filter((w) => GREETING_WORDS.has(w)).length;
  const nonGreetingWords = words.filter((w) => !GREETING_WORDS.has(w) && !FILLER_SOUNDS.has(w));

  if (nonGreetingWords.length < 2 || greetingCount / words.length >= 0.5) {
    return {
      isValid: false,
      category: 'GREETING',
      message: 'تحية طيبة وبداية جميلة! ولكن نحتاج إلى سماع قصتك؛ احكِ لي ماذا حدث معك؟',
    };
  }

  // If story lacks narrative length (fewer than 3 content words)
  if (nonGreetingWords.length < 3) {
    return {
      isValid: false,
      category: 'EMPTY_OR_TOO_SHORT',
      message: 'هذه بداية جيدة! احكِ لي مزيداً من تفاصيل القصة وماذا حدث حتى نتذكرها معاً.',
    };
  }

  // 4. Valid Story
  return {
    isValid: true,
    category: 'VALID_STORY',
    message: '',
  };
}
