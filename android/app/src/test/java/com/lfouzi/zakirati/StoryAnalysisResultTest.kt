package com.lfouzi.zakirati

import com.lfouzi.zakirati.domain.model.StoryAnalysisResult
import org.junit.Assert.*
import org.junit.Test

class StoryAnalysisResultTest {

    @Test
    fun validScoreModel_isCreatedSuccessfully() {
        val result = StoryAnalysisResult(
            overallScore = 87,
            mainEventsScore = 92,
            sequenceScore = 85,
            detailsScore = 82,
            strengths = listOf("تذكرت المكان جيدًا", "حافظت على ترتيب الأحداث"),
            encouragementMessage = "أحسنت! تذكرت معظم أحداث قصتك."
        )

        assertEquals(87, result.overallScore)
        assertEquals(92, result.mainEventsScore)
        assertEquals(85, result.sequenceScore)
        assertEquals(82, result.detailsScore)
        assertEquals(2, result.strengths.size)
        assertTrue(result.encouragementMessage.isNotEmpty())
        assertFalse(result.isFallback)

        val fallbackResult = result.copy(isFallback = true)
        assertTrue(fallbackResult.isFallback)
    }

    @Test(expected = IllegalArgumentException::class)
    fun invalidScoreAbove100_throwsException() {
        StoryAnalysisResult(
            overallScore = 105,
            mainEventsScore = 90,
            sequenceScore = 85,
            detailsScore = 80,
            strengths = listOf("تذكرت المكان جيدًا"),
            encouragementMessage = "أحسنت!"
        )
    }

    @Test(expected = IllegalArgumentException::class)
    fun invalidScoreNegative_throwsException() {
        StoryAnalysisResult(
            overallScore = -5,
            mainEventsScore = 90,
            sequenceScore = 85,
            detailsScore = 80,
            strengths = listOf("تذكرت المكان جيدًا"),
            encouragementMessage = "أحسنت!"
        )
    }

    @Test(expected = IllegalArgumentException::class)
    fun emptyStrengths_throwsException() {
        StoryAnalysisResult(
            overallScore = 80,
            mainEventsScore = 90,
            sequenceScore = 85,
            detailsScore = 80,
            strengths = emptyList(),
            encouragementMessage = "أحسنت!"
        )
    }
}
