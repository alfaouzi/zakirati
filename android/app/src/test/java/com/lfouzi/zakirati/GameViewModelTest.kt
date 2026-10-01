package com.lfouzi.zakirati

import com.lfouzi.zakirati.data.ai.MockStoryAnalysisService
import com.lfouzi.zakirati.domain.model.GameState
import com.lfouzi.zakirati.domain.service.SpeechRecognitionState
import com.lfouzi.zakirati.domain.service.SpeechToTextService
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
    var cleanUpCalled = false

    override fun startListening() {
        mutableState.value = SpeechRecognitionState.Listening
    }

    override fun stopListening() {
        mutableState.value = SpeechRecognitionState.Idle
    }

    override fun cleanUp() {
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
    fun speechCapturedInRoundOne_updatesStateToRecorded() = runTest {
        viewModel.startNewGame()
        viewModel.startRecordingRoundOne()
        assertEquals(GameState.ROUND_ONE_RECORDING, viewModel.uiState.value.gameState)

        speechService.mutableState.value = SpeechRecognitionState.Success("ذهبت إلى الحديقة مع أبي")
        testScheduler.advanceUntilIdle()

        assertEquals(GameState.ROUND_ONE_RECORDED, viewModel.uiState.value.gameState)
        assertEquals("ذهبت إلى الحديقة مع أبي", viewModel.uiState.value.firstStoryTranscript)
    }

    @Test
    fun storyComparisonWithMockService_producesEncouragingResult() = runTest {
        viewModel.setManualStoryForTesting(
            first = "ذهبت إلى الحديقة مع أبي ولعبت مع صديقي.",
            second = "رحت للحديقة مع والدي ولعبت هناك مع صاحبي."
        )

        viewModel.startStoryComparison()
        assertEquals(GameState.ANALYZING, viewModel.uiState.value.gameState)

        testScheduler.advanceUntilIdle()

        assertEquals(GameState.RESULT, viewModel.uiState.value.gameState)
        assertNotNull(viewModel.uiState.value.analysisResult)
        assertTrue(viewModel.uiState.value.analysisResult!!.overallScore in 0..100)
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

    @Test
    fun navigateBackToRoundOne_preservesFirstStoryTranscript() {
        viewModel.setManualStoryForTesting("قصتي الأولى", "قصتي الثانية")
        viewModel.navigateBackToRoundOne()
        assertEquals(GameState.ROUND_ONE_RECORDED, viewModel.uiState.value.gameState)
        assertEquals("قصتي الأولى", viewModel.uiState.value.firstStoryTranscript)
    }

    @Test
    fun retryComparison_withBlankTranscripts_resetsToHomeSafely() = runTest {
        viewModel.startNewGame()
        viewModel.retryComparison()
        assertEquals(GameState.HOME, viewModel.uiState.value.gameState)
    }
}
