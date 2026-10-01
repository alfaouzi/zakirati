package com.lfouzi.zakirati

import com.lfouzi.zakirati.data.ai.MockStoryAnalysisService
import com.lfouzi.zakirati.domain.model.GameState
import com.lfouzi.zakirati.domain.service.SpeechRecognitionState
import com.lfouzi.zakirati.domain.service.SpeechToTextService
import com.lfouzi.zakirati.domain.validation.StoryTranscriptValidator
import com.lfouzi.zakirati.ui.viewmodel.GameViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

private class FakeSpeechService : SpeechToTextService {
    val mutableState = MutableStateFlow<SpeechRecognitionState>(SpeechRecognitionState.Idle)
    override val state: StateFlow<SpeechRecognitionState> = mutableState
    override var isListening: Boolean = false
    var cleanUpCalled = false

    override fun startListening() {
        isListening = true
        mutableState.value = SpeechRecognitionState.Listening("")
    }

    override fun stopListening() {
        isListening = false
        // Emits final accumulated text on stop
        mutableState.value = SpeechRecognitionState.Success("ذهبت إلى الحديقة مع أبي ولعبت بالكرة")
    }

    override fun cleanUp() {
        isListening = false
        cleanUpCalled = true
        mutableState.value = SpeechRecognitionState.Idle
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class GameViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var speechService: FakeSpeechService
    private lateinit var mockAiService: MockStoryAnalysisService
    private lateinit var viewModel: GameViewModel

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        speechService = FakeSpeechService()
        mockAiService = MockStoryAnalysisService()
        viewModel = GameViewModel(speechService, mockAiService)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun initialState_isHome() {
        assertEquals(GameState.HOME, viewModel.uiState.value.gameState)
    }

    @Test
    fun startNewGame_transitionsToRoundOne() {
        viewModel.startNewGame()
        assertEquals(GameState.ROUND_ONE, viewModel.uiState.value.gameState)
    }

    @Test
    fun listeningState_keepsRecordingActiveDuringNaturalPauses() = runTest {
        viewModel.startNewGame()
        viewModel.startRecordingRoundOne()

        // Emulate recognition loop emitting Listening state across natural speech pauses
        speechService.mutableState.value = SpeechRecognitionState.Listening("كان هناك أرنب صغير")
        testScheduler.advanceUntilIdle()

        assertTrue(viewModel.uiState.value.isRecording)
        assertEquals(GameState.ROUND_ONE_RECORDING, viewModel.uiState.value.gameState)
        assertEquals("كان هناك أرنب صغير", viewModel.uiState.value.liveTranscript)

        // Still listening after another pause
        speechService.mutableState.value = SpeechRecognitionState.Listening("كان هناك أرنب صغير يجري في الغابة")
        testScheduler.advanceUntilIdle()

        assertTrue(viewModel.uiState.value.isRecording)
        assertEquals(GameState.ROUND_ONE_RECORDING, viewModel.uiState.value.gameState)
    }

    @Test
    fun pressingStop_completesRecordingSessionAndValidates() = runTest {
        viewModel.startNewGame()
        viewModel.startRecordingRoundOne()

        viewModel.stopRecordingRoundOne()
        testScheduler.advanceUntilIdle()

        assertFalse(viewModel.uiState.value.isRecording)
        assertEquals(GameState.ROUND_ONE_RECORDED, viewModel.uiState.value.gameState)
        assertEquals("ذهبت إلى الحديقة مع أبي ولعبت بالكرة", viewModel.uiState.value.firstStoryTranscript)
        assertNull(viewModel.uiState.value.errorMessage)
    }

    @Test
    fun greetingOnlyTranscript_isRejectedAsInsufficientStoryContent() = runTest {
        viewModel.startNewGame()
        viewModel.startRecordingRoundOne()

        // Child only says "السلام عليكم"
        speechService.mutableState.value = SpeechRecognitionState.Success("السلام عليكم")
        testScheduler.advanceUntilIdle()

        assertEquals(GameState.ROUND_ONE_RECORDED, viewModel.uiState.value.gameState)
        assertNotNull(viewModel.uiState.value.errorMessage)
        assertTrue(viewModel.uiState.value.errorMessage!!.contains("احكِ لي المزيد"))

        // Attempting to confirm and proceed to Round 2 must be blocked!
        viewModel.confirmRoundOne()
        assertEquals(GameState.ROUND_ONE_RECORDED, viewModel.uiState.value.gameState)
        assertTrue(viewModel.uiState.value.errorMessage!!.contains("احكِ لي المزيد"))
    }

    @Test
    fun greetingOnlyTranscripts_produceInsufficientInformationResultWithoutFalsePraise() = runTest {
        // Both transcripts contain only "السلام عليكم"
        val greeting1 = "السلام عليكم"
        val greeting2 = "السلام عليكم ورحمة الله"

        val analysisResult = mockAiService.analyzeStories(greeting1, greeting2).getOrThrow()

        // Scores must be 0, not fabricated 80+
        assertEquals(0, analysisResult.overallScore)
        assertEquals(0, analysisResult.mainEventsScore)
        assertEquals(0, analysisResult.sequenceScore)
        assertEquals(0, analysisResult.detailsScore)

        // Must not claim the child remembered people, place, or events
        for (strength in analysisResult.strengths) {
            assertFalse(strength.contains("الأشخاص"))
            assertFalse(strength.contains("المكان"))
            assertFalse(strength.contains("تسلسل الأحداث"))
        }

        assertTrue(analysisResult.strengths[0].contains("لا تتوفر تفاصيل"))
        assertTrue(analysisResult.encouragementMessage.contains("ترحيب"))
    }

    @Test
    fun validStories_performGroundedSemanticComparison() = runTest {
        viewModel.setManualStoryForTesting(
            first = "ذهبت إلى الحديقة مع أبي ولعبت بالكرة مع أصدقائي في الصباح.",
            second = "في الصباح ذهبت إلى الحديقة مع والدي ولعبت بالكرة مع أصحابي."
        )

        viewModel.startStoryComparison()
        assertEquals(GameState.ANALYZING, viewModel.uiState.value.gameState)

        testScheduler.advanceUntilIdle()

        assertEquals(GameState.RESULT, viewModel.uiState.value.gameState)
        val result = viewModel.uiState.value.analysisResult
        assertNotNull(result)
        assertTrue(result!!.overallScore > 40)
        assertTrue(result.strengths.isNotEmpty())
    }

    @Test
    fun navigateBackToRoundOne_preservesFirstStoryTranscript() {
        viewModel.setManualStoryForTesting("قصتي الأولى الكاملة عن النحل", "قصتي الثانية")
        viewModel.navigateBackToRoundOne()
        assertEquals(GameState.ROUND_ONE_RECORDED, viewModel.uiState.value.gameState)
        assertEquals("قصتي الأولى الكاملة عن النحل", viewModel.uiState.value.firstStoryTranscript)
    }

    @Test
    fun startNewGame_clearsStaleStoryDataAndResults() = runTest {
        viewModel.setManualStoryForTesting("قصة 1", "قصة 2")
        viewModel.startNewGame()

        val state = viewModel.uiState.value
        assertEquals(GameState.ROUND_ONE, state.gameState)
        assertEquals("", state.firstStoryTranscript)
        assertEquals("", state.secondStoryTranscript)
        assertNull(state.analysisResult)
        assertNull(state.errorMessage)
        assertTrue(speechService.cleanUpCalled)
    }

    @Test
    fun navigateToHome_clearsStaleStoryDataAndResults() = runTest {
        viewModel.setManualStoryForTesting("قصة 1", "قصة 2")
        viewModel.navigateToHome()

        val state = viewModel.uiState.value
        assertEquals(GameState.HOME, state.gameState)
        assertEquals("", state.firstStoryTranscript)
        assertEquals("", state.secondStoryTranscript)
        assertNull(state.analysisResult)
        assertNull(state.errorMessage)
    }
}
