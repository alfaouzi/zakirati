package com.lfouzi.zakirati

import android.os.Bundle
import android.speech.tts.TextToSpeech
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lfouzi.zakirati.data.ai.MockStoryAnalysisService
import com.lfouzi.zakirati.data.ai.RemoteStoryAnalysisService
import com.lfouzi.zakirati.data.speech.AndroidSpeechToTextService
import com.lfouzi.zakirati.domain.model.GameState
import com.lfouzi.zakirati.ui.screens.*
import com.lfouzi.zakirati.ui.theme.ZakiratiTheme
import com.lfouzi.zakirati.ui.viewmodel.GameViewModel
import java.util.Locale

enum class ActiveInfoScreen {
    HOW_TO_PLAY,
    ABOUT
}

class MainActivity : ComponentActivity() {

    private var textToSpeech: TextToSpeech? = null
    private var isTtsReady = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize Android TextToSpeech with Arabic language support for the encouragement message
        textToSpeech = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) {
                val result = textToSpeech?.setLanguage(Locale("ar"))
                isTtsReady = (result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED)
            }
        }

        setContent {
            ZakiratiTheme {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = Color(0xFFFFFBF0) // Warm amber-50 background matching brand
                    ) {
                        val context = LocalContext.current.applicationContext

                        val gameViewModel: GameViewModel = viewModel(
                            factory = object : ViewModelProvider.Factory {
                                @Suppress("UNCHECKED_CAST")
                                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                                    val speechService = AndroidSpeechToTextService(context)
                                    val analysisService = try {
                                        RemoteStoryAnalysisService()
                                    } catch (_: Exception) {
                                        MockStoryAnalysisService()
                                    }
                                    return GameViewModel(speechService, analysisService) as T
                                }
                            }
                        )

                        ZakiratiApp(
                            viewModel = gameViewModel,
                            onSpeakMessage = { message ->
                                speakEncouragement(message)
                            }
                        )
                    }
                }
            }
        }
    }

    private fun speakEncouragement(message: String) {
        if (isTtsReady && message.isNotBlank()) {
            textToSpeech?.speak(message, TextToSpeech.QUEUE_FLUSH, null, "sada_encouragement")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        textToSpeech?.stop()
        textToSpeech?.shutdown()
        textToSpeech = null
    }
}

@Composable
fun ZakiratiApp(
    viewModel: GameViewModel,
    onSpeakMessage: (String) -> Unit
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var activeInfoScreen by rememberSaveable { mutableStateOf<ActiveInfoScreen?>(null) }

    when (activeInfoScreen) {
        ActiveInfoScreen.HOW_TO_PLAY -> {
            BackHandler {
                activeInfoScreen = null
            }
            HowToPlayScreen(
                onStartGame = {
                    activeInfoScreen = null
                    viewModel.startNewGame()
                },
                onBack = {
                    activeInfoScreen = null
                }
            )
        }
        ActiveInfoScreen.ABOUT -> {
            BackHandler {
                activeInfoScreen = null
            }
            AboutScreen(
                onBack = {
                    activeInfoScreen = null
                }
            )
        }
        null -> {
            when (state.gameState) {
                GameState.HOME -> {
                    // System back will exit app when at Home Screen
                    HomeScreen(
                        onStartGame = {
                            viewModel.startNewGame()
                        },
                        onHowToPlay = {
                            activeInfoScreen = ActiveInfoScreen.HOW_TO_PLAY
                        },
                        onAbout = {
                            activeInfoScreen = ActiveInfoScreen.ABOUT
                        }
                    )
                }

                GameState.ROUND_ONE,
                GameState.ROUND_ONE_RECORDING,
                GameState.ROUND_ONE_RECORDED -> {
                    BackHandler {
                        if (state.isRecording) {
                            viewModel.stopRecordingRoundOne()
                        } else {
                            viewModel.navigateToHome()
                        }
                    }
                    RoundOneScreen(
                        state = state,
                        onStartRecording = {
                            viewModel.startRecordingRoundOne()
                        },
                        onStopRecording = {
                            viewModel.stopRecordingRoundOne()
                        },
                        onConfirm = {
                            viewModel.confirmRoundOne()
                        }
                    )
                }

                GameState.ROUND_TWO,
                GameState.ROUND_TWO_RECORDING,
                GameState.ROUND_TWO_RECORDED -> {
                    BackHandler {
                        if (state.isRecording) {
                            viewModel.stopRecordingRoundTwo()
                        } else {
                            // Returns to Round 1 without losing the recorded narration
                            viewModel.navigateBackToRoundOne()
                        }
                    }
                    RoundTwoScreen(
                        state = state,
                        onStartRecording = {
                            viewModel.startRecordingRoundTwo()
                        },
                        onStopRecording = {
                            viewModel.stopRecordingRoundTwo()
                        },
                        onCompare = {
                            viewModel.startStoryComparison()
                        }
                    )
                }

                GameState.ANALYZING -> {
                    // Prevent accidental back cancellation during comparison
                    BackHandler(enabled = true) { /* no-op */ }
                    AnalysisScreen()
                }

                GameState.RESULT -> {
                    BackHandler {
                        viewModel.navigateToHome()
                    }
                    val result = state.analysisResult
                    if (result != null) {
                        ResultScreen(
                            result = result,
                            onSpeakMessage = {
                                onSpeakMessage(result.encouragementMessage)
                            },
                            onPlayAgain = {
                                viewModel.startNewGame()
                            },
                            onGoHome = {
                                viewModel.navigateToHome()
                            }
                        )
                    } else {
                        // Fallback if result state is unexpectedly empty
                        viewModel.navigateToHome()
                    }
                }

                GameState.ERROR -> {
                    BackHandler {
                        viewModel.navigateToHome()
                    }
                    ErrorScreen(
                        errorMessage = state.errorMessage,
                        onRetry = {
                            viewModel.retryComparison()
                        },
                        onStartNewGame = {
                            viewModel.startNewGame()
                        },
                        onGoHome = {
                            viewModel.navigateToHome()
                        }
                    )
                }
            }
        }
    }
}
