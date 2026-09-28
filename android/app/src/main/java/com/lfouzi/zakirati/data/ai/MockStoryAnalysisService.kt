package com.lfouzi.zakirati.data.ai

import com.lfouzi.zakirati.domain.model.StoryAnalysisResult
import com.lfouzi.zakirati.domain.service.StoryAnalysisService
import kotlinx.coroutines.delay

class MockStoryAnalysisService : StoryAnalysisService {

    override suspend fun analyzeStories(
        firstStory: String,
        secondStory: String
    ): Result<StoryAnalysisResult> {
        if (firstStory.isBlank()) {
            return Result.failure(IllegalArgumentException("القصة الأولى فارغة"))
        }
        if (secondStory.isBlank()) {
            return Result.failure(IllegalArgumentException("القصة الثانية فارغة"))
        }

        // Simulate thinking latency
        delay(1500)

        val words1 = firstStory.trim().split("\\s+".toRegex())
        val words2 = secondStory.trim().split("\\s+".toRegex())

        val ratio = (words2.size.toFloat() / words1.size.coerceAtLeast(1).toFloat()).coerceIn(0.3f, 1.0f)
        val overall = (60 + (ratio * 35)).toInt().coerceIn(65, 96)
        val mainEvents = (65 + (ratio * 30)).toInt().coerceIn(65, 98)
        val sequence = (55 + (ratio * 40)).toInt().coerceIn(60, 95)
        val details = (58 + (ratio * 35)).toInt().coerceIn(60, 94)

        val strengths = listOf(
            "تذكرت المكان والأشخاص بشكل رائع",
            "حافظت على تسلسل الأحداث الرئيسية",
            "عبرت عن قصتك بأسلوب جميل وممتع"
        )

        val encouragement = when {
            overall >= 85 -> "رائع جدًا يا بطل! تذكرت معظم أحداث قصتك بتألق."
            overall >= 70 -> "أحسنت! تذكرت الكثير من التفاصيل المهمة للقصة."
            else -> "محاولة جميلة! تذكرت بعض الأحداث، وفي الجولة القادمة ستتذكر أكثر."
        }

        return Result.success(
            StoryAnalysisResult(
                overallScore = overall,
                mainEventsScore = mainEvents,
                sequenceScore = sequence,
                detailsScore = details,
                strengths = strengths,
                encouragementMessage = encouragement,
                isFallback = true
            )
        )
    }
}
