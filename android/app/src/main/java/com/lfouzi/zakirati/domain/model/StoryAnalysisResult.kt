package com.lfouzi.zakirati.domain.model

import kotlinx.serialization.Serializable

/**
 * Result model returned by the AI semantic comparison.
 * Compares the first story with the child's retelling, extracting:
 * - What was remembered with quotes/examples (recalledDetails)
 * - What was omitted (omittedDetails)
 * - What was changed/substituted (changedDetails)
 * - Detailed analysis of characters, places, and event sequence.
 */
@Serializable
data class StoryAnalysisResult(
    val overallScore: Int,
    val mainEventsScore: Int,
    val sequenceScore: Int,
    val detailsScore: Int,
    val strengths: List<String>,
    val encouragementMessage: String,
    val isFallback: Boolean = false,
    val recalledDetails: List<String> = emptyList(),
    val omittedDetails: List<String> = emptyList(),
    val changedDetails: List<String> = emptyList(),
    val charactersAnalysis: String = "",
    val placesAnalysis: String = "",
    val sequenceAnalysis: String = ""
) {
    init {
        require(overallScore in 0..100) { "overallScore must be between 0 and 100" }
        require(mainEventsScore in 0..100) { "mainEventsScore must be between 0 and 100" }
        require(sequenceScore in 0..100) { "sequenceScore must be between 0 and 100" }
        require(detailsScore in 0..100) { "detailsScore must be between 0 and 100" }
        require(strengths.isNotEmpty()) { "strengths must contain at least 1 item" }
        require(encouragementMessage.isNotBlank()) { "encouragementMessage must not be blank" }
    }
}
