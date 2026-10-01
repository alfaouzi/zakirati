package com.lfouzi.zakirati.domain.service

import kotlinx.coroutines.flow.StateFlow

sealed interface SpeechRecognitionState {
    data object Idle : SpeechRecognitionState
    data class Listening(val currentTranscript: String = "") : SpeechRecognitionState
    data class Success(val transcript: String) : SpeechRecognitionState
    data class Error(val userFriendlyMessage: String) : SpeechRecognitionState
}

interface SpeechToTextService {
    val state: StateFlow<SpeechRecognitionState>
    val isListening: Boolean
    fun startListening()
    fun stopListening()
    fun cleanUp()
}
