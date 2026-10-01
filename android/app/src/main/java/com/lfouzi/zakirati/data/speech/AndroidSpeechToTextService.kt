package com.lfouzi.zakirati.data.speech

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.lfouzi.zakirati.domain.service.SpeechRecognitionState
import com.lfouzi.zakirati.domain.service.SpeechToTextService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Concrete Android SpeechRecognizer implementation supporting continuous storytelling sessions.
 *
 * SpeechRecognizer naturally terminates on short silence pauses.
 * This implementation persists an active user session, accumulates segmented utterances,
 * seamlessly restarts recognition upon natural pause/timeout until the user explicitly presses Stop,
 * and prevents duplicate phrase concatenation or infinite restart loops.
 */
class AndroidSpeechToTextService(
    private val context: Context
) : SpeechToTextService, RecognitionListener {

    private val _state = MutableStateFlow<SpeechRecognitionState>(SpeechRecognitionState.Idle)
    override val state: StateFlow<SpeechRecognitionState> = _state.asStateFlow()

    override var isListening: Boolean = false
        private set

    private var speechRecognizer: SpeechRecognizer? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private var isUserSessionActive: Boolean = false
    private val accumulatedSegments = mutableListOf<String>()
    private var consecutiveSilenceCount: Int = 0

    companion object {
        private const val MAX_CONSECUTIVE_SILENCE_RETRIES = 6
        private const val RESTART_DELAY_MS = 120L
    }

    override fun startListening() {
        mainHandler.post {
            if (!SpeechRecognizer.isRecognitionAvailable(context)) {
                _state.value = SpeechRecognitionState.Error("خدمة التعرف على الصوت غير متوفرة على جهازك.")
                return@post
            }

            cleanUpInternal()
            isUserSessionActive = true
            isListening = true
            accumulatedSegments.clear()
            consecutiveSilenceCount = 0

            _state.value = SpeechRecognitionState.Listening("")
            startRecognizerInternal()
        }
    }

    private fun startRecognizerInternal() {
        if (!isUserSessionActive) return

        try {
            speechRecognizer?.destroy()
            speechRecognizer = null
        } catch (_: Exception) {}

        try {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                setRecognitionListener(this@AndroidSpeechToTextService)
            }

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ar-SA")
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "ar")
                putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, "ar")
                putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            }

            speechRecognizer?.startListening(intent)
        } catch (e: Exception) {
            if (isUserSessionActive) {
                isUserSessionActive = false
                isListening = false
                _state.value = SpeechRecognitionState.Error("تعذر تشغيل الميكروفون. تحقق من الأذونات وحاول ثانية.")
            }
        }
    }

    override fun stopListening() {
        mainHandler.post {
            if (!isUserSessionActive && !isListening) {
                return@post
            }

            isUserSessionActive = false
            isListening = false
            mainHandler.removeCallbacksAndMessages(null)

            try {
                speechRecognizer?.stopListening()
                speechRecognizer?.destroy()
            } catch (_: Exception) {}
            speechRecognizer = null

            val finalTranscript = getCombinedTranscript()
            _state.value = SpeechRecognitionState.Success(finalTranscript)
        }
    }

    override fun cleanUp() {
        mainHandler.post {
            cleanUpInternal()
            _state.value = SpeechRecognitionState.Idle
        }
    }

    private fun cleanUpInternal() {
        isUserSessionActive = false
        isListening = false
        mainHandler.removeCallbacksAndMessages(null)
        accumulatedSegments.clear()
        consecutiveSilenceCount = 0

        try {
            speechRecognizer?.stopListening()
            speechRecognizer?.destroy()
        } catch (_: Exception) {}
        speechRecognizer = null
    }

    override fun onResults(results: Bundle?) {
        mainHandler.post {
            val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val segment = matches?.firstOrNull()?.trim()

            if (!segment.isNullOrBlank()) {
                appendSegmentIfNew(segment)
                consecutiveSilenceCount = 0
            }

            val combined = getCombinedTranscript()

            if (isUserSessionActive) {
                // Keep the UI in Listening state with the latest accumulated words
                _state.value = SpeechRecognitionState.Listening(combined)

                // Seamlessly restart recognition loop to catch the child's next sentence
                mainHandler.postDelayed({
                    if (isUserSessionActive) {
                        startRecognizerInternal()
                    }
                }, RESTART_DELAY_MS)
            } else {
                // User pressed stop while onResults was being finalized
                _state.value = SpeechRecognitionState.Success(combined)
            }
        }
    }

    override fun onPartialResults(partialResults: Bundle?) {
        if (!isUserSessionActive) return

        mainHandler.post {
            if (!isUserSessionActive) return@post
            val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val partial = matches?.firstOrNull()?.trim()

            if (!partial.isNullOrBlank()) {
                val combined = if (accumulatedSegments.isEmpty()) {
                    partial
                } else {
                    "${accumulatedSegments.joinToString(" ")} $partial"
                }
                _state.value = SpeechRecognitionState.Listening(combined)
            }
        }
    }

    override fun onError(error: Int) {
        mainHandler.post {
            if (!isUserSessionActive) return@post

            when (error) {
                SpeechRecognizer.ERROR_SPEECH_TIMEOUT,
                SpeechRecognizer.ERROR_NO_MATCH -> {
                    // Normal speech pause while the child is gathering their thoughts
                    consecutiveSilenceCount++
                    if (consecutiveSilenceCount < MAX_CONSECUTIVE_SILENCE_RETRIES) {
                        _state.value = SpeechRecognitionState.Listening(getCombinedTranscript())
                        mainHandler.postDelayed({
                            if (isUserSessionActive) {
                                startRecognizerInternal()
                            }
                        }, RESTART_DELAY_MS + 50L)
                    } else {
                        // Excessive prolonged silence (e.g. child left the phone)
                        isUserSessionActive = false
                        isListening = false
                        val currentText = getCombinedTranscript()
                        if (currentText.isNotBlank()) {
                            _state.value = SpeechRecognitionState.Success(currentText)
                        } else {
                            _state.value = SpeechRecognitionState.Error("لم أسمع أي كلام. اضغط على الميكروفون وابدأ بحكاية قصتك!")
                        }
                    }
                }

                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> {
                    isUserSessionActive = false
                    isListening = false
                    _state.value = SpeechRecognitionState.Error("يحتاج التطبيق إلى استخدام الميكروفون حتى تتمكن من تسجيل قصتك.")
                }

                SpeechRecognizer.ERROR_RECOGNIZER_BUSY,
                SpeechRecognizer.ERROR_CLIENT -> {
                    mainHandler.postDelayed({
                        if (isUserSessionActive) {
                            startRecognizerInternal()
                        }
                    }, 250L)
                }

                else -> {
                    // Network or audio hardware issue
                    isUserSessionActive = false
                    isListening = false
                    val currentText = getCombinedTranscript()
                    if (currentText.isNotBlank()) {
                        // Preserve whatever the child spoke before the error
                        _state.value = SpeechRecognitionState.Success(currentText)
                    } else {
                        val message = when (error) {
                            SpeechRecognizer.ERROR_NETWORK,
                            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "تعذر الاتصال بـ صدى حكايتي الآن. تحقق من اتصال الإنترنت وحاول مرة أخرى."
                            else -> "لم أستطع سماع القصة بوضوح. حاول مرة أخرى."
                        }
                        _state.value = SpeechRecognitionState.Error(message)
                    }
                }
            }
        }
    }

    private fun appendSegmentIfNew(newSegment: String) {
        val trimmed = newSegment.trim()
        if (trimmed.isBlank()) return

        val last = accumulatedSegments.lastOrNull()
        if (last == null) {
            accumulatedSegments.add(trimmed)
            return
        }

        // Avoid adding duplicate segment if repeated
        if (last.equals(trimmed, ignoreCase = true)) {
            return
        }

        // If the new segment already starts with the last segment, replace last
        if (trimmed.startsWith(last, ignoreCase = true) && trimmed.length > last.length) {
            accumulatedSegments[accumulatedSegments.lastIndex] = trimmed
            return
        }

        // If last segment already contains the new segment at the end, skip
        if (last.endsWith(trimmed, ignoreCase = true)) {
            return
        }

        accumulatedSegments.add(trimmed)
    }

    private fun getCombinedTranscript(): String {
        return accumulatedSegments
            .filter { it.isNotBlank() }
            .joinToString(" ")
            .trim()
    }

    override fun onReadyForSpeech(params: Bundle?) {}
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() {}
    override fun onEvent(eventType: Int, params: Bundle?) {}
}
