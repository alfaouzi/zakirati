package com.lfouzi.zakirati.data.speech

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.lfouzi.zakirati.domain.service.SpeechRecognitionState
import com.lfouzi.zakirati.domain.service.SpeechToTextService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale

class AndroidSpeechToTextService(
    private val context: Context
) : SpeechToTextService, RecognitionListener {

    private val _state = MutableStateFlow<SpeechRecognitionState>(SpeechRecognitionState.Idle)
    override val state: StateFlow<SpeechRecognitionState> = _state.asStateFlow()

    private var speechRecognizer: SpeechRecognizer? = null

    override fun startListening() {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            _state.value = SpeechRecognitionState.Error("خدمة التعرف على الصوت غير متوفرة على جهازك.")
            return
        }

        stopListening()
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
            setRecognitionListener(this@AndroidSpeechToTextService)
        }

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ar-SA")
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "ar")
            putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, "ar")
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }

        try {
            speechRecognizer?.startListening(intent)
            _state.value = SpeechRecognitionState.Listening
        } catch (e: Exception) {
            _state.value = SpeechRecognitionState.Error("تعذر تشغيل الميكروفون. تحقق من الأذونات وحاول ثانية.")
        }
    }

    override fun stopListening() {
        try {
            speechRecognizer?.stopListening()
            speechRecognizer?.destroy()
        } catch (_: Exception) {}
        speechRecognizer = null
    }

    override fun cleanUp() {
        stopListening()
        _state.value = SpeechRecognitionState.Idle
    }

    override fun onResults(results: Bundle?) {
        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val text = matches?.firstOrNull()?.trim()
        if (!text.isNullOrBlank()) {
            _state.value = SpeechRecognitionState.Success(text)
        } else {
            _state.value = SpeechRecognitionState.Error("لم أستطع سماع القصة بوضوح. حاول مرة أخرى.")
        }
    }

    override fun onError(error: Int) {
        val friendlyMessage = when (error) {
            SpeechRecognizer.ERROR_NO_MATCH -> "لم أسمع أي كلام. اضغط على الميكروفون وابدأ بحكاية قصتك!"
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "لم أسمع صوتًا منذ لحظات. حاول مجددًا."
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "يحتاج التطبيق إلى استخدام الميكروفون حتى تتمكن من تسجيل قصتك."
            SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "تعذر الاتصال بذاكرتي الآن. تحقق من اتصال الإنترنت وحاول مرة أخرى."
            else -> "لم أستطع سماع القصة بوضوح. حاول مرة أخرى."
        }
        _state.value = SpeechRecognitionState.Error(friendlyMessage)
    }

    override fun onReadyForSpeech(params: Bundle?) {}
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() {}
    override fun onPartialResults(partialResults: Bundle?) {}
    override fun onEvent(eventType: Int, params: Bundle?) {}
}
