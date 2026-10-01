package com.lfouzi.zakirati.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lfouzi.zakirati.domain.model.GameState
import com.lfouzi.zakirati.domain.model.StoryAnalysisResult
import com.lfouzi.zakirati.domain.service.SpeechRecognitionState
import com.lfouzi.zakirati.domain.service.SpeechToTextService
import com.lfouzi.zakirati.domain.service.StoryAnalysisService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class GameUiState(
    val gameState: GameState = GameState.HOME,
    val firstStoryTranscript: String = "",
    val secondStoryTranscript: String = "",
    val analysisResult: StoryAnalysisResult? = null,
    val errorMessage: String? = null,
    val isRecording: Boolean = false,
    val elapsedSeconds: Int = 0
)

class GameViewModel(
    private val speechService: SpeechToTextService,
    private val analysisService: StoryAnalysisService
) : ViewModel() {

    private val _uiState = MutableStateFlow(GameUiState())
    val uiState: StateFlow<GameUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            speechService.state.collect { recState ->
                when (recState) {
                    is SpeechRecognitionState.Listening -> {
                        _uiState.value = _uiState.value.copy(isRecording = true)
                    }
                    is SpeechRecognitionState.Success -> {
                        _uiState.value = _uiState.value.copy(isRecording = false)
                        handleSpeechCaptured(recState.transcript)
                    }
                    is SpeechRecognitionState.Error -> {
                        _uiState.value = _uiState.value.copy(
                            isRecording = false,
                            errorMessage = recState.userFriendlyMessage
                        )
                    }
                    is SpeechRecognitionState.Idle -> {
                        _uiState.value = _uiState.value.copy(isRecording = false)
                    }
                }
            }
        }
    }

    fun startNewGame() {
        speechService.cleanUp()
        _uiState.value = GameUiState(gameState = GameState.ROUND_ONE)
    }

    fun navigateToHome() {
        speechService.cleanUp()
        _uiState.value = GameUiState(gameState = GameState.HOME)
    }

    fun startRecordingRoundOne() {
        _uiState.value = _uiState.value.copy(
            gameState = GameState.ROUND_ONE_RECORDING,
            errorMessage = null,
            elapsedSeconds = 0
        )
        speechService.startListening()
    }

    fun stopRecordingRoundOne() {
        speechService.stopListening()
    }

    fun confirmRoundOne() {
        if (_uiState.value.firstStoryTranscript.isBlank()) {
            _uiState.value = _uiState.value.copy(
                errorMessage = "لم أستطع سماع القصة بوضوح. حاول مرة أخرى."
            )
            return
        }
        _uiState.value = _uiState.value.copy(
            gameState = GameState.ROUND_TWO,
            errorMessage = null
        )
    }

    fun navigateBackToRoundOne() {
        speechService.stopListening()
        _uiState.value = _uiState.value.copy(
            gameState = GameState.ROUND_ONE_RECORDED,
            errorMessage = null
        )
    }

    fun startRecordingRoundTwo() {
        _uiState.value = _uiState.value.copy(
            gameState = GameState.ROUND_TWO_RECORDING,
            errorMessage = null,
            elapsedSeconds = 0
        )
        speechService.startListening()
    }

    fun stopRecordingRoundTwo() {
        speechService.stopListening()
    }

    fun startStoryComparison() {
        val state = _uiState.value
        if (state.secondStoryTranscript.isBlank()) {
            _uiState.value = state.copy(
                errorMessage = "لم أستطع سماع القصة بوضوح. حاول مرة أخرى."
            )
            return
        }

        _uiState.value = state.copy(
            gameState = GameState.ANALYZING,
            errorMessage = null
        )

        viewModelScope.launch {
            val result = analysisService.analyzeStories(
                firstStory = state.firstStoryTranscript,
                secondStory = state.secondStoryTranscript
            )

            result.fold(
                onSuccess = { analysis ->
                    _uiState.value = _uiState.value.copy(
                        gameState = GameState.RESULT,
                        analysisResult = analysis,
                        errorMessage = null
                    )
                },
                onFailure = {
                    _uiState.value = _uiState.value.copy(
                        gameState = GameState.ERROR,
                        errorMessage = "تعذر الاتصال بـ صدى حكايتي الآن. تحقق من اتصال الإنترنت وحاول مرة أخرى."
                    )
                }
            )
        }
    }

    fun retryComparison() {
        val state = _uiState.value
        if (state.firstStoryTranscript.isBlank() || state.secondStoryTranscript.isBlank()) {
            navigateToHome()
            return
        }
        startStoryComparison()
    }

    fun setManualStoryForTesting(first: String, second: String) {
        _uiState.value = _uiState.value.copy(
            firstStoryTranscript = first,
            secondStoryTranscript = second,
            gameState = GameState.ROUND_TWO_RECORDED
        )
    }

    private fun handleSpeechCaptured(transcript: String) {
        when (_uiState.value.gameState) {
            GameState.ROUND_ONE_RECORDING -> {
                _uiState.value = _uiState.value.copy(
                    gameState = GameState.ROUND_ONE_RECORDED,
                    firstStoryTranscript = transcript
                )
            }
            GameState.ROUND_TWO_RECORDING -> {
                _uiState.value = _uiState.value.copy(
                    gameState = GameState.ROUND_TWO_RECORDED,
                    secondStoryTranscript = transcript
                )
            }
            else -> {}
        }
    }

    override fun onCleared() {
        super.onCleared()
        speechService.cleanUp()
    }
}
