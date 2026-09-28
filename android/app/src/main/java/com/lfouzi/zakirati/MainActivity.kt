package com.lfouzi.zakirati

import android.os.Bundle
import android.speech.tts.TextToSpeech
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.lfouzi.zakirati.data.ai.RemoteStoryAnalysisService
import com.lfouzi.zakirati.data.speech.AndroidSpeechToTextService
import com.lfouzi.zakirati.domain.model.GameState
import com.lfouzi.zakirati.ui.screens.*
import com.lfouzi.zakirati.ui.theme.ZakiratiTheme
import com.lfouzi.zakirati.ui.viewmodel.GameViewModel
import java.util.Locale

class MainActivity : ComponentActivity(), TextToSpeech.OnInitListener {

    private lateinit var viewModel: GameViewModel
    private lateinit var speechService: AndroidSpeechToTextService
    private var textToSpeech: TextToSpeech? = null
    private var isTtsReady = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize Android TextToSpeech in Arabic
        try {
            textToSpeech = TextToSpeech(this, this)
        } catch (e: Exception) {
            isTtsReady = false
        }

        // Initialize dependencies adhering to Clean Architecture
        speechService = AndroidSpeechToTextService(this)
        val analysisService = RemoteStoryAnalysisService()
        viewModel = GameViewModel(speechService, analysisService)

        setContent {
            ZakiratiTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val state by viewModel.uiState.collectAsState()
                    var currentNavScreen by remember { mutableStateOf("GAME") }

                    when (currentNavScreen) {
                        "HOW_TO_PLAY" -> {
                            HowToPlayScreen(
                                onStartGame = {
                                    currentNavScreen = "GAME"
                                    viewModel.startNewGame()
                                },
                                onBack = { currentNavScreen = "GAME" }
                            )
                        }
                        "ABOUT" -> {
                            AboutScreen(
                                onBack = { currentNavScreen = "GAME" }
                            )
                        }
                        else -> {
                            when (state.gameState) {
                                GameState.HOME -> {
                                    HomeScreen(
                                        onStartGame = { viewModel.startNewGame() },
                                        onHowToPlay = { currentNavScreen = "HOW_TO_PLAY" },
                                        onAbout = { currentNavScreen = "ABOUT" }
                                    )
                                }
                                GameState.ROUND_ONE, GameState.ROUND_ONE_RECORDING, GameState.ROUND_ONE_RECORDED -> {
                                    RoundOneScreen(
                                        state = state,
                                        onStartRecording = { viewModel.startRecordingRoundOne() },
                                        onStopRecording = { viewModel.stopRecordingRoundOne() },
                                        onConfirm = { viewModel.confirmRoundOne() }
                                    )
                                }
                                GameState.ROUND_TWO, GameState.ROUND_TWO_RECORDING, GameState.ROUND_TWO_RECORDED -> {
                                    RoundTwoScreen(
                                        state = state,
                                        onStartRecording = { viewModel.startRecordingRoundTwo() },
                                        onStopRecording = { viewModel.stopRecordingRoundTwo() },
                                        onCompare = { viewModel.startStoryComparison() }
                                    )
                                }
                                GameState.ANALYZING -> {
                                    AnalysisScreen()
                                }
                                GameState.RESULT -> {
                                    state.analysisResult?.let { result ->
                                        ResultScreen(
                                            result = result,
                                            onSpeakMessage = { speakArabic(result.encouragementMessage) },
                                            onPlayAgain = { viewModel.startNewGame() },
                                            onGoHome = { viewModel.navigateToHome() }
                                        )
                                    }
                                }
                                GameState.ERROR -> {
                                    ErrorScreen(
                                        errorMessage = state.errorMessage,
                                        onRetry = { viewModel.retryComparison() },
                                        onStartNewGame = { viewModel.startNewGame() },
                                        onGoHome = { viewModel.navigateToHome() }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val candidateLocales = listOf(
                Locale("ar"),
                Locale("ar", "SA"),
                Locale("ar", "EG"),
                Locale.forLanguageTag("ar")
            )
            for (loc in candidateLocales) {
                val res = textToSpeech?.setLanguage(loc)
                if (res != TextToSpeech.LANG_MISSING_DATA && res != TextToSpeech.LANG_NOT_SUPPORTED) {
                    isTtsReady = true
                    break
                }
            }
        } else {
            isTtsReady = false
        }
    }

    private fun speakArabic(text: String) {
        if (isTtsReady && text.isNotBlank()) {
            try {
                textToSpeech?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "zakirati_encouragement")
            } catch (_: Exception) {
                // Ignore speech synthesis errors gracefully without crashing
            }
        }
    }

    override fun onPause() {
        super.onPause()
        speechService.cleanUp()
        try {
            textToSpeech?.stop()
        } catch (_: Exception) {}
    }

    override fun onStop() {
        super.onStop()
        speechService.cleanUp()
        try {
            textToSpeech?.stop()
        } catch (_: Exception) {}
    }

    override fun onDestroy() {
        super.onDestroy()
        speechService.cleanUp()
        try {
            textToSpeech?.stop()
            textToSpeech?.shutdown()
        } catch (_: Exception) {}
    }
}
