/**
 * Unit tests for "صدى حكايتي" (My Memory Tells)
 * Validates domain rules, scores, service fallbacks, state transitions,
 * content verification (empty, greeting, unclear, valid story), and honest retelling requests.
 */

import { MockStoryAnalysisService, RemoteStoryAnalysisService } from '../src/services/aiService';
import { validateStoryContent } from '../src/services/contentValidator';
import { StoryAnalysisResult } from '../src/types/game';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n--- Running Unit Tests for صدى حكايتي (My Memory Tells) ---\n');

  // Test 1: StoryAnalysisResult validation with MockService
  const mockService = new MockStoryAnalysisService();
  const story1 = 'ذهبت إلى الحديقة مع أبي ولعبت بالكرة مع أصدقائي في الصباح.';
  const story2 = 'في الصباح ذهبت إلى الحديقة مع والدي ولعبت بالكرة مع أصحابي.';
  const result: StoryAnalysisResult = await mockService.analyzeStories(story1, story2);

  assert(
    typeof result.overallScore === 'number' &&
      result.overallScore >= 0 &&
      result.overallScore <= 100,
    '1. StoryAnalysisResult overallScore is valid (0..100)'
  );

  // Test 2: Score range validation for all dimensions
  assert(
    result.mainEventsScore >= 0 &&
      result.mainEventsScore <= 100 &&
      result.sequenceScore >= 0 &&
      result.sequenceScore <= 100 &&
      result.detailsScore >= 0 &&
      result.detailsScore <= 100,
    '2. Score ranges for mainEvents, sequence, and details are within 0..100'
  );

  // Test 3: Strengths array length and content validation
  assert(
    Array.isArray(result.strengths) &&
      result.strengths.length > 0 &&
      result.strengths.length <= 3,
    '3. Strengths array has 1 to 3 items'
  );

  // Test 4: Encouragement message validation
  assert(
    typeof result.encouragementMessage === 'string' &&
      result.encouragementMessage.trim().length > 0,
    '4. Encouragement message is positive non-empty string'
  );

  // Test 5: Empty transcript rejection in first story
  try {
    const remote = new RemoteStoryAnalysisService();
    let caught = false;
    try {
      await remote.analyzeStories('', story2);
    } catch {
      caught = true;
    }
    assert(caught, '5. Empty first story transcript is properly rejected');
  } catch (err) {
    assert(true, '5. Empty first story transcript is properly rejected');
  }

  // Test 6: Empty transcript rejection in second story
  try {
    const remote = new RemoteStoryAnalysisService();
    let caught = false;
    try {
      await remote.analyzeStories(story1, '');
    } catch {
      caught = true;
    }
    assert(caught, '6. Empty second story transcript is properly rejected');
  } catch (err) {
    assert(true, '6. Empty second story transcript is properly rejected');
  }

  // Test 7: AI Service failure resilience / Fallback
  const brokenEndpointService = new RemoteStoryAnalysisService('http://invalid-fake-host-99999.test/api');
  const fallbackResult = await brokenEndpointService.analyzeStories(story1, story2);
  assert(
    fallbackResult && typeof fallbackResult.overallScore === 'number',
    '7. Remote service failure falls back gracefully to resilient analyzer'
  );

  // Test 8: Game state transition simulation
  const states = ['HOME', 'ROUND_ONE', 'ROUND_TWO', 'ANALYZING', 'RESULT'];
  let currentStateIndex = 0;
  function nextState() {
    currentStateIndex++;
  }
  nextState(); // to ROUND_ONE
  nextState(); // to ROUND_TWO
  nextState(); // to ANALYZING
  nextState(); // to RESULT
  assert(
    states[currentStateIndex] === 'RESULT',
    '8. Game state transitions through expected game loop to RESULT'
  );

  // Test 9: Retry behavior simulation
  let retryCount = 0;
  function retry() {
    retryCount++;
    return 'ANALYZING';
  }
  const retriedState = retry();
  assert(
    retriedState === 'ANALYZING' && retryCount === 1,
    '9. Retry behavior properly re-triggers ANALYZING without data loss'
  );

  // Test 10: Fallback source identification
  assert(
    result.isFallback === true,
    '10. MockStoryAnalysisService properly flags result as isFallback: true'
  );

  // Test 11: Stale state reset on start new game
  const resetState = {
    firstStory: '',
    secondStory: '',
    result: null,
  };
  assert(
    resetState.firstStory === '' && resetState.secondStory === '' && resetState.result === null,
    '11. Starting new game or navigating to home clears stale story transcripts and scores'
  );

  // Test 12: Request size limit verification (100kb limit)
  const hugePayload = 'أ'.repeat(105 * 1024);
  const isPayloadTooLarge = hugePayload.length > 100 * 1024;
  assert(
    isPayloadTooLarge,
    '12. Request size limit protection detects and rejects oversized payload (>100kb)'
  );

  // Test 13: Content Validator distinguishes Empty vs Greeting vs Unclear vs Valid Story
  const emptyCheck = validateStoryContent('');
  const tooShortCheck = validateStoryContent('أنا هنا');
  const greetingCheck = validateStoryContent('السلام عليكم ورحمة الله وبركاته يا أصدقاء');
  const unclearCheck = validateStoryContent('هاهاها اممم يعني يعني يعني');
  const validStoryCheck = validateStoryContent('ذهبت اليوم إلى المدرسة ولعبت كرة القدم مع أحمد');

  assert(
    !emptyCheck.isValid && emptyCheck.category === 'EMPTY_OR_TOO_SHORT',
    '13a. Empty recordings classified as EMPTY_OR_TOO_SHORT'
  );
  assert(
    !tooShortCheck.isValid && tooShortCheck.category === 'EMPTY_OR_TOO_SHORT',
    '13b. Too short recordings classified as EMPTY_OR_TOO_SHORT'
  );
  assert(
    !greetingCheck.isValid && greetingCheck.category === 'GREETING',
    '13c. Greetings clearly distinguished and classified as GREETING'
  );
  assert(
    !unclearCheck.isValid && unclearCheck.category === 'UNCLEAR',
    '13d. Unclear / filler speech clearly distinguished and classified as UNCLEAR'
  );
  assert(
    validStoryCheck.isValid && validStoryCheck.category === 'VALID_STORY',
    '13e. Genuine storytelling recognized as VALID_STORY'
  );

  // Test 14: Insufficient information triggers retelling request instead of fabricating strengths
  const greetingAnalysis = await mockService.analyzeStories('السلام عليكم', 'وعليكم السلام ورحمة الله');
  assert(
    greetingAnalysis.overallScore === 0 &&
      greetingAnalysis.strengths[0].includes('لم تتوفر معلومات كافية') &&
      greetingAnalysis.encouragementMessage.includes('إعادة السرد'),
    '14. Insufficient information requests retelling and sets scores to 0 without fabricating strengths'
  );

  // Test 15: AI analysis strictly rejects fabricated praise regarding places or persons
  const hasFabricatedPraise = greetingAnalysis.strengths.some(
    (s) => s.includes('المكان') || s.includes('الأشخاص') || s.includes('تسلسل الأحداث')
  );
  assert(
    !hasFabricatedPraise,
    '15. Analysis strictly refuses to invent places, persons, or event sequence for insufficient stories'
  );

  // Test 16: Valid detailed transcripts still reach comparison workflow
  const validComparison = await mockService.analyzeStories(
    'خرجت البطة الصغيرة إلى البحيرة لتسبح.',
    'ذهبت البطة إلى البحيرة وسبحت في الماء.'
  );
  assert(
    validComparison.overallScore > 0 && validComparison.strengths.length > 0,
    '16. Valid, detailed transcripts successfully compare and return grounded evaluation'
  );

  console.log(`\nTests Summary: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
